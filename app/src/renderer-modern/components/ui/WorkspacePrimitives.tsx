import type { ComponentChildren } from 'preact';
import { ChevronRight } from 'lucide-preact';

export const WORKSPACE_ICON_SIZE = 16;

interface CommandButtonProps {
  id?: string;
  icon?: ComponentChildren;
  label: string;
  i18nKey?: string;
  className?: string;
  moduleAction?: boolean;
  shortcut?: string;
  disabled?: boolean;
  title?: string;
}

export function CommandButton({
  id,
  icon,
  label,
  i18nKey,
  className = '',
  moduleAction = false,
  shortcut,
  disabled = false,
  title
}: CommandButtonProps) {
  const classes = [
    'btn',
    'ui-command-button',
    moduleAction ? 'ui-module-button' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button id={id} class={classes} type="button" disabled={disabled} title={title}>
      {icon ? <span class="ui-command-button__icon">{icon}</span> : null}
      <span class="ui-command-button__label" data-i18n={i18nKey}>{label}</span>
      {shortcut ? <kbd class="ui-command-shortcut">{shortcut}</kbd> : null}
      {moduleAction ? <ChevronRight class="ui-module-button__trailing" size={14} aria-hidden="true" /> : null}
    </button>
  );
}

interface SegmentOption {
  value: string;
  label: string;
  active?: boolean;
}

interface SegmentedControlProps {
  ariaLabel: string;
  dataAttribute: string;
  options: SegmentOption[];
  className?: string;
}

export function SegmentedControl({
  ariaLabel,
  dataAttribute,
  options,
  className = ''
}: SegmentedControlProps) {
  return (
    <div class={`${className} ui-segmented-control`} role="group" aria-label={ariaLabel}>
      {options.map(option => {
        const dataProps = { [`data-${dataAttribute}`]: option.value };
        return (
          <button
            {...dataProps}
            key={option.value}
            class={`seg-btn${option.active ? ' active' : ''}`}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface SectionHeadingProps {
  title: string;
  titleKey: string;
  subtitle: string;
  subtitleKey: string;
  badge?: string;
  badgeKey?: string;
  titleId?: string;
}

export function SectionHeading({
  title,
  titleKey,
  subtitle,
  subtitleKey,
  badge,
  badgeKey,
  titleId
}: SectionHeadingProps) {
  return (
    <div class="ui-section-heading">
      <div class="ui-section-heading__copy">
        <h2 id={titleId} data-i18n={titleKey}>{title}</h2>
        <p class="subtle" data-i18n={subtitleKey}>{subtitle}</p>
      </div>
      {badge ? <span class="pill" data-i18n={badgeKey}>{badge}</span> : null}
    </div>
  );
}

interface StatusChipProps {
  label: string;
  labelKey: string;
  valueId: string;
  value: string;
}

export function StatusChip({ label, labelKey, valueId, value }: StatusChipProps) {
  return (
    <span class="ui-status-chip">
      <strong data-i18n={labelKey}>{label}</strong>
      <b id={valueId}>{value}</b>
    </span>
  );
}

export interface ModuleAction {
  id: string;
  icon: ComponentChildren;
  label: string;
  i18nKey: string;
  className: string;
  disabled?: boolean;
  title?: string;
}

interface ModuleLauncherProps {
  actions: ModuleAction[];
}

export function ModuleLauncher({ actions }: ModuleLauncherProps) {
  return (
    <div
      class="toolbar-grid quick-grid ui-module-launcher"
      role="group"
      aria-label="工作区工具 / Workspace tools"
    >
      {actions.map(action => (
        <CommandButton
          key={action.id}
          id={action.id}
          icon={action.icon}
          label={action.label}
          i18nKey={action.i18nKey}
          className={action.className}
          moduleAction
          disabled={action.disabled}
          title={action.title}
        />
      ))}
    </div>
  );
}
