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
  children
}: LayerModalProps) {
  const titleId = `${id}Title`;
  return (
    <div id={id} class="layer-modal hidden">
      <div class="layer-modal-backdrop" />
      <section
        class={`layer-modal-panel glass ${panelClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header class="layer-modal-header">
          <div>
            <h2 id={titleId} data-i18n={titleKey}>{title}</h2>
            {subtitle && subtitleKey ? (
              <p class="subtle" data-i18n={subtitleKey}>{subtitle}</p>
            ) : null}
          </div>
          <button
            id={closeButtonId}
            class="btn btn-soft layer-close modern-icon-button"
            type="button"
            aria-label="关闭"
            title="关闭"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
