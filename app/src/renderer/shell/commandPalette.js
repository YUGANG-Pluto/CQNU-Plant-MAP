const COMMAND_PALETTE_RECENT_LIMIT = 6;
const commandPaletteSession = {
  mode: 'commands',
  query: '',
  activeIndex: 0,
  visibleCommands: [],
  recentIds: []
};

function formatCommandPaletteText(key, replacements = {}) {
  let text = t(key);
  Object.entries(replacements).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value));
  });
  return text;
}

function isCommandPaletteOpen() {
  return Boolean(ui.commandPaletteModal && !ui.commandPaletteModal.classList.contains('hidden'));
}

function commandPaletteSections(commands) {
  const query = normalizeCommandPaletteSearch(commandPaletteSession.query);
  if (query) {
    return [{
      id: 'results',
      label: t('commandPaletteSearchResults'),
      commands: searchCommandPaletteCommands(query, commands)
    }];
  }

  const commandMap = new Map(commands.map(command => [command.id, command]));
  const recent = commandPaletteSession.recentIds
    .map(id => commandMap.get(id))
    .filter(Boolean);
  const recentIds = new Set(recent.map(command => command.id));
  const recommended = searchCommandPaletteCommands('', commands)
    .filter(command => !recentIds.has(command.id));
  const sections = [];
  if (recent.length) {
    sections.push({ id: 'recent', label: t('commandPaletteRecent'), commands: recent });
  }
  if (recommended.length) {
    sections.push({ id: 'recommended', label: t('commandPaletteSuggested'), commands: recommended });
  }
  return sections;
}

function commandPaletteShortcutRows() {
  return [
    ['Ctrl K', 'commandShortcutOpen'],
    ['Ctrl O', 'commandShortcutProject'],
    ['Ctrl S', 'commandShortcutSave'],
    ['Ctrl Z', 'commandShortcutUndo'],
    ['Ctrl Shift Z', 'commandShortcutRedo'],
    ['Alt Enter', 'commandShortcutFullscreen'],
    ['↑ / ↓', 'commandShortcutNavigate'],
    ['Enter', 'commandShortcutExecute'],
    ['Esc', 'commandShortcutClose']
  ];
}

function setCommandPaletteActiveIndex(index, options = {}) {
  const commands = commandPaletteSession.visibleCommands;
  if (!commands.length) {
    commandPaletteSession.activeIndex = -1;
    ui.commandPaletteInput?.removeAttribute('aria-activedescendant');
    return;
  }

  const nextIndex = Math.max(0, Math.min(commands.length - 1, index));
  commandPaletteSession.activeIndex = nextIndex;
  const optionsNodes = Array.from(ui.commandPaletteResults.querySelectorAll('.command-palette-result'));
  optionsNodes.forEach((node, itemIndex) => {
    const active = itemIndex === nextIndex;
    node.classList.toggle('is-active', active);
    node.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  const activeNode = optionsNodes[nextIndex];
  if (!activeNode) return;
  ui.commandPaletteInput?.setAttribute('aria-activedescendant', activeNode.id);
  if (ui.commandPaletteAnnouncer) {
    ui.commandPaletteAnnouncer.textContent = commands[nextIndex]?.label || '';
  }
  if (options.scroll !== false) {
    activeNode.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

function createCommandPaletteResult(command, index) {
  const badge = el('span', {
    className: 'command-palette-result__badge',
    text: command.groupLabel,
    title: command.groupLabel
  });
  const title = el('span', {
    className: 'command-palette-result__title',
    text: command.label,
    title: command.label
  });
  const detail = el('span', {
    className: 'command-palette-result__detail',
    text: command.detail,
    title: command.detail
  });
  const copy = el('span', { className: 'command-palette-result__copy' }, [title, detail]);
  const trailingChildren = [];
  if (!command.available && command.reason) {
    trailingChildren.push(el('span', {
      className: 'command-palette-result__blocked',
      text: command.reason,
      title: command.reason
    }));
  }
  if (command.shortcut) {
    trailingChildren.push(el('kbd', {
      className: 'command-palette-result__shortcut',
      text: command.shortcut
    }));
  }
  const trailing = el('span', { className: 'command-palette-result__trailing' }, trailingChildren);
  const button = el('button', {
    className: 'command-palette-result',
    title: [command.label, command.detail, command.reason].filter(Boolean).join('\n'),
    dataset: { commandId: command.id }
  }, [badge, copy, trailing]);
  button.id = `commandPaletteOption-${index}`;
  button.type = 'button';
  button.tabIndex = -1;
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', 'false');
  button.setAttribute('aria-disabled', command.available ? 'false' : 'true');
  button.style.setProperty('--command-index', String(index));
  button.addEventListener('pointermove', () => setCommandPaletteActiveIndex(index, { scroll: false }));
  button.addEventListener('click', () => executeCommandPaletteCommand(command));
  return button;
}

function renderCommandPaletteHelp() {
  clearNode(ui.commandPaletteResults);
  commandPaletteSession.visibleCommands = [];
  commandPaletteSession.activeIndex = -1;
  ui.commandPaletteInput.readOnly = true;
  ui.commandPaletteInput.value = '';
  ui.commandPaletteInput.placeholder = t('commandPaletteHelpSearchPlaceholder');
  ui.commandPaletteInput.removeAttribute('aria-activedescendant');
  ui.commandPaletteModeLabel.textContent = t('commandPaletteShortcutsMode');
  ui.commandPaletteResultCount.textContent = String(commandPaletteShortcutRows().length);
  const list = el('div', { className: 'command-palette-shortcuts' });
  commandPaletteShortcutRows().forEach(([shortcut, descriptionKey]) => {
    list.appendChild(el('div', { className: 'command-palette-shortcut-row' }, [
      el('kbd', { text: shortcut }),
      el('span', { text: t(descriptionKey) })
    ]));
  });
  ui.commandPaletteResults.appendChild(list);
  const label = ui.btnCommandPaletteHelp?.querySelector('span');
  if (label) label.textContent = t('commandPaletteBackToCommands');
}

function renderCommandPalette() {
  if (!ui.commandPaletteResults || !ui.commandPaletteInput) return;
  if (commandPaletteSession.mode === 'shortcuts') {
    renderCommandPaletteHelp();
    return;
  }

  ui.commandPaletteInput.readOnly = false;
  ui.commandPaletteInput.placeholder = t('commandPaletteSearchPlaceholder');
  ui.commandPaletteModeLabel.textContent = normalizeCommandPaletteSearch(commandPaletteSession.query)
    ? t('commandPaletteSearchResults')
    : t('commandPaletteCommandsMode');
  const helpLabel = ui.btnCommandPaletteHelp?.querySelector('span');
  if (helpLabel) helpLabel.textContent = t('commandPaletteHelp');

  const sections = commandPaletteSections(getCommandPaletteCommands());
  const visibleCommands = sections.flatMap(section => section.commands);
  commandPaletteSession.visibleCommands = visibleCommands;
  clearNode(ui.commandPaletteResults);
  ui.commandPaletteResultCount.textContent = formatCommandPaletteText('commandPaletteResultCount', {
    count: visibleCommands.length
  });

  if (!visibleCommands.length) {
    const empty = el('div', { className: 'command-palette-empty' }, [
      el('strong', { text: t('commandPaletteNoResults') }),
      el('span', { text: t('commandPaletteNoResultsHint') })
    ]);
    empty.setAttribute('role', 'status');
    ui.commandPaletteResults.appendChild(empty);
    setCommandPaletteActiveIndex(-1);
    return;
  }

  let resultIndex = 0;
  sections.forEach(section => {
    if (!section.commands.length) return;
    const group = el('section', {
      className: 'command-palette-group',
      dataset: { commandSection: section.id }
    });
    group.appendChild(el('div', {
      className: 'command-palette-group__label',
      text: section.label
    }));
    section.commands.forEach(command => {
      group.appendChild(createCommandPaletteResult(command, resultIndex));
      resultIndex += 1;
    });
    ui.commandPaletteResults.appendChild(group);
  });

  const requestedIndex = commandPaletteSession.activeIndex < 0 ? 0 : commandPaletteSession.activeIndex;
  setCommandPaletteActiveIndex(Math.min(requestedIndex, visibleCommands.length - 1), { scroll: false });
}

function rememberCommandPaletteCommand(commandId) {
  commandPaletteSession.recentIds = [
    commandId,
    ...commandPaletteSession.recentIds.filter(id => id !== commandId)
  ].slice(0, COMMAND_PALETTE_RECENT_LIMIT);
}

function executeCommandPaletteCommand(command) {
  if (!command) return false;
  const current = getCommandPaletteCommands().find(item => item.id === command.id) || command;
  if (!current.available) {
    const reason = current.reason || t('commandUnavailable');
    toast(reason);
    if (ui.commandPaletteAnnouncer) ui.commandPaletteAnnouncer.textContent = reason;
    return false;
  }

  rememberCommandPaletteCommand(current.id);
  const target = current.targetId ? document.getElementById(current.targetId) : null;
  const focusTarget = target?.getClientRects().length ? target : ui.btnOpenCommandPalette;
  const motionDisabled = document.documentElement.classList.contains('motion-disabled');
  const delay = motionDisabled ? 0 : getMotionDurationMs('--motion-duration-fast', 300) + 20;
  closeCommandPalette({ restoreFocus: false });
  window.setTimeout(() => {
    focusTarget?.focus?.({ preventScroll: true });
    if (target) target.click();
    else if (typeof current.action === 'function') current.action();
  }, delay);
  return true;
}

function openCommandPalette() {
  if (!ui.commandPaletteModal || !ui.commandPaletteInput) return false;
  if (isCommandPaletteOpen()) {
    ui.commandPaletteInput.focus({ preventScroll: true });
    return true;
  }
  const topModal = typeof getTopLayerModal === 'function' ? getTopLayerModal() : null;
  if (topModal) {
    toast(t('commandPaletteBlockedByDialog'));
    return false;
  }

  commandPaletteSession.mode = 'commands';
  commandPaletteSession.query = '';
  commandPaletteSession.activeIndex = 0;
  ui.commandPaletteInput.value = '';
  renderCommandPalette();
  openLayerModal(ui.commandPaletteModal, { focusTarget: ui.commandPaletteInput });
  window.setTimeout(() => {
    if (isCommandPaletteOpen() && getTopLayerModal() === ui.commandPaletteModal) {
      ui.commandPaletteInput.focus({ preventScroll: true });
    }
  }, 0);
  return true;
}

function closeCommandPalette(options = {}) {
  if (!isCommandPaletteOpen()) return false;
  closeLayerModal(ui.commandPaletteModal, options);
  return true;
}

function toggleCommandPaletteHelp() {
  commandPaletteSession.mode = commandPaletteSession.mode === 'commands' ? 'shortcuts' : 'commands';
  commandPaletteSession.activeIndex = 0;
  renderCommandPalette();
  if (commandPaletteSession.mode === 'commands') {
    ui.commandPaletteInput.focus({ preventScroll: true });
  }
}

function handleCommandPaletteInputKey(event) {
  if (commandPaletteSession.mode !== 'commands') return;
  const lastIndex = commandPaletteSession.visibleCommands.length - 1;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    event.stopPropagation();
    const next = commandPaletteSession.activeIndex >= lastIndex ? 0 : commandPaletteSession.activeIndex + 1;
    setCommandPaletteActiveIndex(next);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    event.stopPropagation();
    const next = commandPaletteSession.activeIndex <= 0 ? lastIndex : commandPaletteSession.activeIndex - 1;
    setCommandPaletteActiveIndex(next);
  } else if (event.key === 'Home') {
    event.preventDefault();
    event.stopPropagation();
    setCommandPaletteActiveIndex(0);
  } else if (event.key === 'End') {
    event.preventDefault();
    event.stopPropagation();
    setCommandPaletteActiveIndex(lastIndex);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    executeCommandPaletteCommand(commandPaletteSession.visibleCommands[commandPaletteSession.activeIndex]);
  }
}

function refreshCommandPaletteI18n() {
  if (isCommandPaletteOpen()) renderCommandPalette();
}

function handleCommandPaletteShortcut(event) {
  const primaryModifier = (event.ctrlKey || event.metaKey) && !event.altKey;
  const key = String(event.key || '').toLocaleLowerCase();
  if (primaryModifier && key === 'k') {
    event.preventDefault();
    if (event.repeat) return true;
    if (isCommandPaletteOpen()) closeCommandPalette();
    else openCommandPalette();
    return true;
  }

  if (!primaryModifier || event.shiftKey || event.repeat) return false;
  if (typeof getTopLayerModal === 'function' && getTopLayerModal()) return false;
  if (key === 's') {
    event.preventDefault();
    if (!state.projectDir) toast(t('commandRequiresProject'));
    else ui.btnSave?.click();
    return true;
  }
  if (key === 'o') {
    event.preventDefault();
    ui.btnChooseDir?.click();
    return true;
  }
  return false;
}

function bindCommandPaletteEvents() {
  ui.btnOpenCommandPalette?.addEventListener('click', openCommandPalette);
  ui.btnCloseCommandPalette?.addEventListener('click', () => closeCommandPalette());
  ui.commandPaletteModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => closeCommandPalette());
  ui.btnCommandPaletteHelp?.addEventListener('click', toggleCommandPaletteHelp);
  ui.commandPaletteInput?.addEventListener('input', () => {
    commandPaletteSession.query = ui.commandPaletteInput.value;
    commandPaletteSession.activeIndex = 0;
    renderCommandPalette();
  });
  ui.commandPaletteInput?.addEventListener('keydown', handleCommandPaletteInputKey);
}
