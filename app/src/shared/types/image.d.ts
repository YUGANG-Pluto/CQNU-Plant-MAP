export interface ImageAsset {
  id?: string;
  path: string;
  relativePath?: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  capturedAt?: string;
  linkedPointIds?: string[];
  [key: string]: unknown;
}
