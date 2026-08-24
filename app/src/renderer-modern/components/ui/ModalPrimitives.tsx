import type { ComponentChildren } from 'preact';
import { CheckCircle2, CircleAlert, Info, LoaderCircle } from 'lucide-preact';

interface ModalPrimitiveProps {
  children: ComponentChildren;
  className?: string;
}

interface ModalCommandBarProps extends ModalPrimitiveProps {
  label: string;
  labelKey?: string;
  sticky?: boolean;
}

interface FormSectionProps extends ModalPrimitiveProps {
  title?: string;
  titleKey?: string;
  description?: string;
  descriptionKey?: string;
  label?: string;
  labelKey?: string;
}

type FeedbackTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'loading';

interface FeedbackStateProps {
  id?: string;
  className?: string;
  label: string;
  labelKey?: string;
  tone?: FeedbackTone;
  live?: 'polite' | 'assertive';
}

const feedbackIcons = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: CircleAlert,
  error: CircleAlert,
  loading: LoaderCircle
};

export function ModalBody({ children, className = '' }: ModalPrimitiveProps) {
  return <div class={`modal-workflow-body ${className}`.trim()}>{children}</div>;
}

export function ModalCommandBar({
  children,
  className = '',
  label,
  labelKey,
  sticky = false
}: ModalCommandBarProps) {
  return (
    <div
      class={`modal-command-bar ${sticky ? 'is-sticky' : ''} ${className}`.trim()}
      role="toolbar"
      aria-label={label}
      data-i18n-aria-label={labelKey}
    >
      {children}
    </div>
  );
}

export function FormSection({
  children,
  className = '',
  title,
  titleKey,
  description,
  descriptionKey,
  label,
  labelKey
}: FormSectionProps) {
  return (
    <section
      class={`modal-form-section ${className}`.trim()}
      aria-label={!title ? label : undefined}
      data-i18n-aria-label={!title ? labelKey : undefined}
    >
      {title ? (
        <header class="modal-form-section-head">
          <div>
            <h3 data-i18n={titleKey}>{title}</h3>
            {description ? <p class="subtle" data-i18n={descriptionKey}>{description}</p> : null}
          </div>
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function FeedbackState({
  id,
  className = '',
  label,
  labelKey,
  tone = 'neutral',
  live = 'polite'
}: FeedbackStateProps) {
  const Icon = feedbackIcons[tone];
  return (
    <div
      id={id}
      class={`ui-feedback-state is-${tone} ${className}`.trim()}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={live}
      data-feedback-tone={tone}
    >
      <Icon class="ui-feedback-icon" size={16} aria-hidden="true" />
      <span data-feedback-label data-i18n={labelKey}>{label}</span>
    </div>
  );
}
