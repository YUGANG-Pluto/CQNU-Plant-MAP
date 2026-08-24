import type { ComponentChildren } from 'preact';
import { X } from 'lucide-preact';

interface LayerModalProps {
  id: string;
  closeButtonId: string;
  titleKey: string;
  title: string;
  subtitleKey?: string;
  subtitle?: string;
  panelClass?: string;
  contentClass?: string;
  footer?: ComponentChildren;
  footerClass?: string;
  children: ComponentChildren;
}

export function LayerModal({
  id,
  closeButtonId,
  titleKey,
  title,
  subtitleKey,
  subtitle,
  panelClass = '',
  contentClass = '',
  footer,
  footerClass = '',
  children
}: LayerModalProps) {
  const titleId = `${id}Title`;
  const subtitleId = subtitle && subtitleKey ? `${id}Subtitle` : undefined;
  const isStructured = Boolean(contentClass || footer);
  return (
    <div id={id} class="layer-modal hidden" aria-hidden="true">
      <div class="layer-modal-backdrop" aria-hidden="true" />
      <section
        class={`layer-modal-panel glass ${isStructured ? 'layer-modal-panel--structured' : ''} ${footer ? 'layer-modal-panel--has-footer' : ''} ${panelClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
      >
        <header class="layer-modal-header">
          <div class="layer-modal-heading">
            <h2 id={titleId} data-i18n={titleKey}>{title}</h2>
            {subtitle && subtitleKey ? (
              <p id={subtitleId} class="subtle" data-i18n={subtitleKey}>{subtitle}</p>
            ) : null}
          </div>
          <button
            id={closeButtonId}
            class="btn btn-soft layer-close modern-icon-button"
            type="button"
            aria-label="关闭"
            title="关闭"
            data-i18n-aria-label="closePanel"
            data-i18n-title="closePanel"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {isStructured ? (
          <div class={`layer-modal-content ${contentClass}`.trim()}>{children}</div>
        ) : children}
        {footer ? <footer class={`layer-modal-footer ${footerClass}`.trim()}>{footer}</footer> : null}
      </section>
    </div>
  );
}
