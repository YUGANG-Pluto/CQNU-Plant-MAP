export interface LayerOpenOptions {
  focus?: boolean;
  focusTarget?: HTMLElement | null;
}

export interface LayerCloseOptions {
  instant?: boolean;
  restoreFocus?: boolean;
  returnFocus?: HTMLElement | null;
  onClosed?(layer: HTMLElement): void;
}

export interface LayerManagerController {
  readonly version: 'layer-manager-v1';
  getDurationMs(variableName: string, fallback?: number): number;
  getTopLayer(): HTMLElement | null;
  open(layer: HTMLElement | null | undefined, options?: LayerOpenOptions): void;
  close(layer: HTMLElement | null | undefined, options?: LayerCloseOptions): void;
  trapFocus(event: KeyboardEvent): boolean;
  syncDocumentState(): void;
}
