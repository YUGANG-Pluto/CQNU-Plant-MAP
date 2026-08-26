export type NamedFormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;

export function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing management UI element: ${selector}`);
  return element;
}

export function formControl<T extends NamedFormControl>(form: HTMLFormElement, name: string): T {
  const control = form.elements.namedItem(name);
  if (!(control instanceof HTMLElement)) {
    throw new Error(`Missing management form control: ${name}`);
  }
  return control as T;
}

export function eventElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}
