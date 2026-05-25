export interface ZoneRecord {
  id?: string;
  zoneId?: string;
  name?: string;
  title?: string;
  label?: string;
  displayName?: string;
  description?: string;
  geometry?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  coordinates?: unknown;
  latlngs?: unknown;
  [key: string]: unknown;
}
