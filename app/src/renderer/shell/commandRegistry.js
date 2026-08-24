const COMMAND_PALETTE_RESULT_LIMIT = 16;

function commandPaletteStaticDefinitions() {
  return [
    {
      id: 'project.open',
      groupKey: 'commandGroupProject',
      labelKey: 'chooseProject',
      detailKey: 'commandDetailOpenProject',
      targetId: 'btnChooseDir',
      shortcut: 'Ctrl O',
      recommended: true,
      keywords: 'open folder directory project 打开 目录 项目'
    },
    {
      id: 'project.save',
      groupKey: 'commandGroupProject',
      labelKey: 'saveProject',
      detailKey: 'commandDetailSaveProject',
      targetId: 'btnSave',
      shortcut: 'Ctrl S',
      requirements: ['project'],
      recommended: true,
      keywords: 'save write persist 保存 写入'
    },
    {
      id: 'edit.undo',
      groupKey: 'commandGroupEdit',
      labelKey: 'undoProjectEdit',
      detailKey: 'commandDetailUndoProjectEdit',
      targetId: 'btnUndoProjectEdit',
      shortcut: 'Ctrl Z',
      requirements: ['project'],
      keywords: 'undo history previous edit 撤销 历史 上一步 编辑'
    },
    {
      id: 'edit.redo',
      groupKey: 'commandGroupEdit',
      labelKey: 'redoProjectEdit',
      detailKey: 'commandDetailRedoProjectEdit',
      targetId: 'btnRedoProjectEdit',
      shortcut: 'Ctrl Shift Z',
      requirements: ['project'],
      keywords: 'redo history next edit 重做 历史 下一步 编辑'
    },
    {
      id: 'interface.workspace',
      groupKey: 'commandGroupInterface',
      labelKey: 'openWorkspaceDrawer',
      detailKey: 'commandDetailOpenPanel',
      targetId: 'btnOpenWorkspaceDrawer',
      recommended: true,
      keywords: 'drawer list export workspace panel 抽屉 列表 导出 工作面板'
    },
    {
      id: 'map.browse',
      groupKey: 'commandGroupMap',
      labelKey: 'modeBrowse',
      detailKey: 'commandDetailMapMode',
      targetId: 'btnModeBrowse',
      keywords: 'browse pan move map 浏览 平移 地图'
    },
    {
      id: 'map.draw-zone',
      groupKey: 'commandGroupMap',
      labelKey: 'modeDrawZone',
      detailKey: 'commandDetailMapMode',
      targetId: 'btnModeDrawZone',
      requirements: ['project'],
      keywords: 'draw polygon zone area 绘制 分区 多边形'
    },
    {
      id: 'map.add-point',
      groupKey: 'commandGroupMap',
      labelKey: 'modeAddPoint',
      detailKey: 'commandDetailMapMode',
      targetId: 'btnModeAddPoint',
      requirements: ['project', 'zone'],
      recommended: true,
      keywords: 'add point marker record 添加 点位 标记 记录'
    },
    {
      id: 'map.basemap',
      groupKey: 'commandGroupMap',
      labelKey: 'basemapWorkspaceTitle',
      detailKey: 'commandDetailOpenPanel',
      targetId: 'btnToggleBasemapEditor',
      keywords: 'basemap tile layer map settings 底图 图层 设置'
    },
    {
      id: 'analysis.stats',
      groupKey: 'commandGroupAnalysis',
      labelKey: 'openStatsCenter',
      detailKey: 'commandDetailAnalysis',
      targetId: 'btnOpenStats',
      requirements: ['project'],
      recommended: true,
      keywords: 'statistics chart diversity quality research 统计 图表 多样性 质量 科研'
    },
    {
      id: 'analysis.query',
      groupKey: 'commandGroupAnalysis',
      labelKey: 'openQueryCenter',
      detailKey: 'commandDetailAnalysis',
      targetId: 'btnOpenQuery',
      requirements: ['project'],
      recommended: true,
      keywords: 'query search filter find 查询 搜索 筛选'
    },
    {
      id: 'analysis.review-workbench',
      groupKey: 'commandGroupAnalysis',
      labelKey: 'openReviewWorkbench',
      detailKey: 'commandDetailReviewWorkbench',
      targetId: 'btnOpenReviewWorkbench',
      requirements: ['project'],
      recommended: true,
      keywords: 'review quality tasks verify data 核验 质量 任务 数据'
    },
    {
      id: 'analysis.species-reference',
      groupKey: 'commandGroupAnalysis',
      labelKey: 'openSpeciesReference',
      detailKey: 'commandDetailAnalysis',
      targetId: 'btnOpenSpeciesReference',
      keywords: 'species reference inaturalist gbif taxonomy 物种 参考 科属'
    },
    {
      id: 'management.point-editor',
      groupKey: 'commandGroupManagement',
      labelKey: 'openPhenologyCenter',
      detailKey: 'commandDetailManagement',
      targetId: 'btnOpenPointEditor',
      requirements: ['point'],
      keywords: 'point edit phenology record taxonomy 点位 编辑 物候 分类'
    },
    {
      id: 'management.recycle-bin',
      groupKey: 'commandGroupManagement',
      labelKey: 'openRecycleBin',
      detailKey: 'commandDetailManagement',
      targetId: 'btnOpenTrash',
      keywords: 'trash recycle restore deleted 回收站 恢复 删除'
    },
    {
      id: 'management.theme',
      groupKey: 'commandGroupManagement',
      labelKey: 'openThemeCenter',
      detailKey: 'commandDetailManagement',
      targetId: 'btnOpenTheme',
      keywords: 'theme appearance motion interface 主题 外观 动效 界面'
    },
    {
      id: 'management.merge',
      groupKey: 'commandGroupManagement',
      labelKey: 'openMergeCenter',
      detailKey: 'commandDetailManagement',
      targetId: 'btnOpenMerge',
      keywords: 'merge project combine 合并 项目'
    },
    {
      id: 'management.backup',
      groupKey: 'commandGroupManagement',
      labelKey: 'openBackupCenter',
      detailKey: 'commandDetailManagement',
      targetId: 'btnBackupProject',
      requirements: ['project'],
      keywords: 'backup archive zip 备份 归档 压缩'
    },
    {
      id: 'management.maintenance',
      groupKey: 'commandGroupManagement',
      labelKey: 'openMaintenanceCenter',
      detailKey: 'commandDetailManagement',
      targetId: 'btnOpenMaintenance',
      keywords: 'maintenance logs storage diagnostics 维护 日志 存储 诊断'
    },
    {
      id: 'transfer.export-csv',
      groupKey: 'commandGroupTransfer',
      labelKey: 'exportCsv',
      detailKey: 'commandDetailTransfer',
      targetId: 'btnExportCsv',
      requirements: ['project'],
      keywords: 'export csv excel 导出 表格'
    },
    {
      id: 'transfer.export-geojson',
      groupKey: 'commandGroupTransfer',
      labelKey: 'exportGeoJSON',
      detailKey: 'commandDetailTransfer',
      targetId: 'btnExportGeoJSON',
      requirements: ['project'],
      keywords: 'export geojson gis 导出 地理数据'
    },
    {
      id: 'transfer.import-csv',
      groupKey: 'commandGroupTransfer',
      labelKey: 'importCsv',
      detailKey: 'commandDetailTransfer',
      targetId: 'btnImportCsv',
      requirements: ['project'],
      keywords: 'import csv excel 导入 表格'
    },
    {
      id: 'transfer.import-geojson',
      groupKey: 'commandGroupTransfer',
      labelKey: 'importGeoJSON',
      detailKey: 'commandDetailTransfer',
      targetId: 'btnImportGeoJSON',
      requirements: ['project'],
      keywords: 'import geojson gis 导入 地理数据'
    },
    {
      id: 'interface.fullscreen',
      groupKey: 'commandGroupInterface',
      labelKey: 'commandFullscreen',
      detailKey: 'commandDetailFullscreen',
      shortcut: 'Alt Enter',
      recommended: true,
      action: () => toggleFullscreenMode(),
      keywords: 'fullscreen window display 全屏 窗口 显示'
    }
  ];
}

function commandPaletteRequirementReason(requirement) {
  if (requirement === 'project' && !state.projectDir) return t('commandRequiresProject');
  if (requirement === 'zone' && !getSelectedZone()) return t('commandRequiresZone');
  if (requirement === 'point' && !getSelectedPoint()) return t('commandRequiresPoint');
  return '';
}

function commandPaletteAvailability(command) {
  for (const requirement of command.requirements || []) {
    const reason = commandPaletteRequirementReason(requirement);
    if (reason) return { available: false, reason };
  }
  if (command.targetId) {
    const target = document.getElementById(command.targetId);
    if (!target || target.disabled) {
      return { available: false, reason: t('commandUnavailable') };
    }
  }
  return { available: true, reason: '' };
}

function commandPaletteStaticCommands() {
  return commandPaletteStaticDefinitions().map(definition => ({
    ...definition,
    type: 'command',
    label: t(definition.labelKey),
    detail: t(definition.detailKey),
    groupLabel: t(definition.groupKey),
    ...commandPaletteAvailability(definition)
  }));
}

function commandPaletteZoneCommands() {
  return state.zones.map(zone => {
    const label = zoneDisplayName(zone);
    const identifier = zone.zoneId || zone.id;
    return {
      id: `zone:${zone.id}`,
      type: 'zone',
      groupKey: 'commandGroupZones',
      groupLabel: t('commandGroupZones'),
      label,
      detail: `${t('commandLocateZone')} · ${identifier}`,
      keywords: [label, identifier, zone.description, 'zone 分区'].filter(Boolean).join(' '),
      available: true,
      reason: '',
      action: () => activateObjectSelection('zone', zone.id, {
        focusMap: true,
        source: 'command-palette'
      })
    };
  });
}

function commandPalettePointCommands() {
  return state.points.map(point => {
    const zone = state.zones.find(item => item.id === point.zoneRef);
    const label = pointDisplayName(point);
    const identifier = point.pointId || point.id;
    const zoneLabel = zone ? zoneDisplayName(zone) : t('unassignedZone');
    return {
      id: `point:${point.id}`,
      type: 'point',
      groupKey: 'commandGroupPoints',
      groupLabel: t('commandGroupPoints'),
      label,
      detail: `${t('commandLocatePoint')} · ${zoneLabel} · ${identifier}`,
      keywords: [
        label,
        identifier,
        zoneLabel,
        point.plantNameCn,
        point.plantNameSci,
        point.family,
        point.genus,
        'point 点位'
      ].filter(Boolean).join(' '),
      available: true,
      reason: '',
      action: () => activateObjectSelection('point', point.id, {
        focusMap: true,
        source: 'command-palette'
      })
    };
  });
}

function getCommandPaletteCommands() {
  return [
    ...commandPaletteStaticCommands(),
    ...commandPaletteZoneCommands(),
    ...commandPalettePointCommands()
  ];
}

function normalizeCommandPaletteSearch(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function commandPaletteSearchScore(command, query) {
  const normalizedQuery = normalizeCommandPaletteSearch(query);
  if (!normalizedQuery) return command.recommended ? 1 : 0;
  const label = normalizeCommandPaletteSearch(command.label);
  const detail = normalizeCommandPaletteSearch(command.detail);
  const keywords = normalizeCommandPaletteSearch(command.keywords);
  const haystack = `${label} ${detail} ${keywords}`;
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (!tokens.every(token => haystack.includes(token))) return -1;

  let score = command.available ? 12 : 0;
  if (label === normalizedQuery) score += 120;
  else if (label.startsWith(normalizedQuery)) score += 80;
  else if (label.includes(normalizedQuery)) score += 52;
  if (keywords.includes(normalizedQuery)) score += 28;
  if (command.type === 'zone' || command.type === 'point') score += 6;
  return score;
}

function searchCommandPaletteCommands(query, commands = getCommandPaletteCommands()) {
  const normalizedQuery = normalizeCommandPaletteSearch(query);
  if (!normalizedQuery) return commands.filter(command => command.recommended);
  return commands
    .map(command => ({ command, score: commandPaletteSearchScore(command, normalizedQuery) }))
    .filter(result => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.command.label.localeCompare(b.command.label))
    .slice(0, COMMAND_PALETTE_RESULT_LIMIT)
    .map(result => result.command);
}
