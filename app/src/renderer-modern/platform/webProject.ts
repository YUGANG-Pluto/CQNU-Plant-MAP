type UnknownRecord = Record<string, unknown>;

export interface WebProjectSession {
  projectId: string;
  projectDir: string;
  label: string;
  modifiedAt: number;
  sourceKind: 'opfs' | 'directory' | 'import';
  settings: UnknownRecord;
  zones: UnknownRecord[];
  points: UnknownRecord[];
}

export interface WebProjectSessionOptions {
  projectId?: string;
  label?: string;
  sourceKind?: WebProjectSession['sourceKind'];
}

interface BrowserFileHandle {
  getFile(): Promise<File>;
}

interface FilePickerWindow extends Window {
  showOpenFilePicker?: (options: {
    multiple?: boolean;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<BrowserFileHandle[]>;
}

const CSV_HEADER_ALIASES = Object.freeze<Record<string, string>>({
  zoneid: 'zoneId',
  '分区编号': 'zoneId',
  zonename: 'zoneName',
  '分区名称': 'zoneName',
  pointid: 'pointId',
  '点位编号': 'pointId',
  plantnamecn: 'plantNameCn',
  chinesename: 'plantNameCn',
  '中文名': 'plantNameCn',
  plantnamesci: 'plantNameSci',
  scientificname: 'plantNameSci',
  '学名': 'plantNameSci',
  family: 'family',
  '科': 'family',
  genus: 'genus',
  '属': 'genus',
  latitude: 'lat',
  lat: 'lat',
  '纬度': 'lat',
  longitude: 'lng',
  lon: 'lng',
  lng: 'lng',
  '经度': 'lng',
  observer: 'observer',
  '记录者': 'observer',
  surveydate: 'surveyDate',
  date: 'surveyDate',
  '调查日期': 'surveyDate',
  habitat: 'habitat',
  '微生境': 'habitat',
  abundance: 'abundance',
  '多度/数量': 'abundance',
  growthform: 'growthForm',
  lifeform: 'growthForm',
  '生活型': 'growthForm',
  floweringstate: 'floweringState',
  '物候状态': 'floweringState',
  cultivatedstatus: 'cultivatedStatus',
  '来源属性': 'cultivatedStatus',
  note: 'note',
  '备注': 'note'
});

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || cleanText(value) === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function createDefaultWebSettings(): UnknownRecord {
  return {
    language: 'zh',
    mapCenter: [29.6088, 106.3088],
    mapZoom: 17,
    activeBaseMapId: 'osm-street',
    baseMaps: [],
    recycleBin: []
  };
}

function parseDelimitedRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const text = source.replace(/^\uFEFF/, '');

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some(cell => cleanText(cell))) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value);
    if (row.some(cell => cleanText(cell))) rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string): string {
  const compact = value.replace(/^\uFEFF/, '').trim().replace(/[\s_-]+/g, '').toLocaleLowerCase();
  return CSV_HEADER_ALIASES[compact] || value.trim();
}

function projectFromCsv(source: string): Pick<WebProjectSession, 'settings' | 'zones' | 'points'> {
  const rows = parseDelimitedRows(source);
  if (!rows.length) throw new Error('所选 CSV 没有可读记录。');
  const headers = rows[0].map(normalizeHeader);
  const zoneByKey = new Map<string, UnknownRecord>();
  const points: UnknownRecord[] = [];

  rows.slice(1).forEach((cells, index) => {
    const record: UnknownRecord = {};
    headers.forEach((header, cellIndex) => {
      if (header) record[header] = cells[cellIndex] ?? '';
    });
    const zoneId = cleanText(record.zoneId);
    const zoneName = cleanText(record.zoneName);
    const zoneKey = zoneId || zoneName;
    let zoneRef = '';
    if (zoneKey) {
      let zone = zoneByKey.get(zoneKey);
      if (!zone) {
        zone = {
          id: `web_zone_${zoneByKey.size + 1}`,
          zoneId: zoneId || `WZ${zoneByKey.size + 1}`,
          name: zoneName || zoneId,
          description: '',
          geometry: null
        };
        zoneByKey.set(zoneKey, zone);
      }
      zoneRef = cleanText(zone.id);
    }

    const lat = finiteNumber(record.lat);
    const lng = finiteNumber(record.lng);
    points.push({
      ...record,
      id: cleanText(record.id) || `web_point_${index + 1}`,
      pointId: cleanText(record.pointId) || `WP${String(index + 1).padStart(3, '0')}`,
      zoneRef,
      lat: lat ?? Number.NaN,
      lng: lng ?? Number.NaN
    });
  });

  return {
    settings: createDefaultWebSettings(),
    zones: [...zoneByKey.values()],
    points
  };
}

function projectFromGeoJson(value: unknown): Pick<WebProjectSession, 'settings' | 'zones' | 'points'> {
  const collection = isRecord(value) ? value : {};
  const features = Array.isArray(collection.features) ? collection.features.filter(isRecord) : [];
  const pointFeatures = features.filter(feature => isRecord(feature.geometry) && feature.geometry.type === 'Point');
  const csvRows: UnknownRecord[] = pointFeatures.map((feature, index) => {
    const geometry = isRecord(feature.geometry) ? feature.geometry : {};
    const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
    const properties = isRecord(feature.properties) ? feature.properties : {};
    return {
      ...properties,
      id: cleanText(properties.id) || `web_point_${index + 1}`,
      pointId: cleanText(properties.pointId) || `WP${String(index + 1).padStart(3, '0')}`,
      lng: finiteNumber(coordinates[0]) ?? Number.NaN,
      lat: finiteNumber(coordinates[1]) ?? Number.NaN
    };
  });
  const zoneByKey = new Map<string, UnknownRecord>();
  csvRows.forEach(point => {
    const zoneId = cleanText(point.zoneId);
    const zoneName = cleanText(point.zoneName);
    const key = zoneId || zoneName;
    if (!key || zoneByKey.has(key)) return;
    zoneByKey.set(key, {
      id: `web_zone_${zoneByKey.size + 1}`,
      zoneId: zoneId || `WZ${zoneByKey.size + 1}`,
      name: zoneName || zoneId,
      description: '',
      geometry: null
    });
  });
  const points = csvRows.map(point => {
    const key = cleanText(point.zoneId) || cleanText(point.zoneName);
    return { ...point, zoneRef: cleanText(zoneByKey.get(key)?.id) };
  });
  return { settings: createDefaultWebSettings(), zones: [...zoneByKey.values()], points };
}

function applyJsonProjectPart(
  fileName: string,
  value: unknown,
  project: Pick<WebProjectSession, 'settings' | 'zones' | 'points'>
): boolean {
  const name = fileName.toLocaleLowerCase();
  if (name.endsWith('.geojson') || (isRecord(value) && value.type === 'FeatureCollection')) {
    Object.assign(project, projectFromGeoJson(value));
    return true;
  }
  if (name === 'settings.json' && isRecord(value)) {
    project.settings = value;
    return true;
  }
  if (name === 'zones.json' && Array.isArray(value)) {
    project.zones = records(value);
    return true;
  }
  if (name === 'points.json' && Array.isArray(value)) {
    project.points = records(value);
    return true;
  }

  const root = isRecord(value) && isRecord(value.project) ? value.project : value;
  if (isRecord(root) && (Array.isArray(root.zones) || Array.isArray(root.points))) {
    if (isRecord(root.settings)) project.settings = root.settings;
    if (Array.isArray(root.zones)) project.zones = records(root.zones);
    if (Array.isArray(root.points)) project.points = records(root.points);
    return true;
  }
  if (Array.isArray(value)) {
    const first = records(value)[0];
    if (first && ('geometry' in first || 'zoneId' in first && !('lat' in first || 'lng' in first))) {
      project.zones = records(value);
    } else {
      project.points = records(value);
    }
    return true;
  }
  return false;
}

function projectLabel(files: readonly File[]): string {
  const folderName = files
    .map(file => cleanText(file.webkitRelativePath).split('/').filter(Boolean)[0] || '')
    .find(Boolean);
  if (folderName) return folderName;
  if (files.length === 1) return files[0].name.replace(/\.(json|geojson|csv)$/i, '') || '本地项目';
  return '本地项目文件组';
}

function normalizedRelativePath(file: File): string {
  return cleanText(file.webkitRelativePath || file.name)
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .toLocaleLowerCase();
}

export function projectFilesFromFolder(files: readonly File[]): File[] {
  const candidates = [...files].filter(file => /\.(json|geojson|csv)$/i.test(file.name));
  const coreNames = new Set(['settings.json', 'zones.json', 'points.json']);
  const coreFiles = candidates.filter(file => {
    const path = normalizedRelativePath(file);
    const parts = path.split('/').filter(Boolean);
    const name = parts.at(-1) || '';
    if (!coreNames.has(name)) return false;
    const parent = parts.at(-2) || '';
    return parts.length <= 2 || parent === 'information';
  });
  if (coreFiles.length) return coreFiles;

  return candidates.filter(file => {
    const parts = normalizedRelativePath(file).split('/').filter(Boolean);
    return parts.length <= 2;
  });
}

export function webProjectDir(projectId: string): string {
  return `web://project/${encodeURIComponent(projectId)}`;
}

export function createEmptyWebProjectSession(options: WebProjectSessionOptions = {}): WebProjectSession {
  const projectId = options.projectId || crypto.randomUUID();
  return {
    projectId,
    projectDir: webProjectDir(projectId),
    label: options.label?.trim() || '浏览器本地项目',
    modifiedAt: Date.now(),
    sourceKind: options.sourceKind || 'opfs',
    settings: createDefaultWebSettings(),
    zones: [],
    points: []
  };
}

export async function createWebProjectSession(
  files: readonly File[],
  options: WebProjectSessionOptions = {}
): Promise<WebProjectSession> {
  if (!files.length) throw new Error('未选择项目文件。');
  const project = {
    settings: createDefaultWebSettings(),
    zones: [] as UnknownRecord[],
    points: [] as UnknownRecord[]
  };
  let recognized = false;

  for (const file of [...files].sort((left, right) => left.name.localeCompare(right.name))) {
    const source = await file.text();
    if (file.name.toLocaleLowerCase().endsWith('.csv')) {
      Object.assign(project, projectFromCsv(source));
      recognized = true;
      continue;
    }
    if (!/\.(json|geojson)$/i.test(file.name)) continue;
    const value = JSON.parse(source) as unknown;
    recognized = applyJsonProjectPart(file.name, value, project) || recognized;
  }

  if (!recognized) {
    throw new Error('请选择 settings.json、zones.json、points.json、项目 JSON、CSV 或 GeoJSON。');
  }

  const label = options.label?.trim() || projectLabel(files);
  const projectId = options.projectId || crypto.randomUUID();
  const fileModifiedAt = Math.max(0, ...files.map(file => file.lastModified || 0));
  const modifiedAt = fileModifiedAt || Date.now();
  return {
    projectId,
    projectDir: webProjectDir(projectId),
    label,
    modifiedAt,
    sourceKind: options.sourceKind || 'import',
    settings: project.settings,
    zones: project.zones,
    points: project.points
  };
}

function inputFileSelection(folder = false): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    if (folder) {
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
    } else {
      input.accept = '.json,.geojson,.csv,application/json,text/csv,application/geo+json';
    }
    input.hidden = true;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const files = [...(input.files || [])];
      window.removeEventListener('focus', handleWindowFocus);
      input.remove();
      resolve(folder ? projectFilesFromFolder(files) : files);
    };
    const handleWindowFocus = () => window.setTimeout(finish, 420);
    input.addEventListener('change', finish, { once: true });
    input.addEventListener('cancel', finish, { once: true });
    window.addEventListener('focus', handleWindowFocus, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

export function selectWebProjectFolderFiles(): Promise<File[]> {
  return inputFileSelection(true);
}

export async function selectWebProjectFiles(): Promise<File[]> {
  const picker = (window as FilePickerWindow).showOpenFilePicker;
  if (!picker) return inputFileSelection();
  try {
    const handles = await picker.call(window, {
      multiple: true,
      types: [{
        description: '校园植物项目数据',
        accept: {
          'application/json': ['.json', '.geojson'],
          'text/csv': ['.csv']
        }
      }]
    });
    return Promise.all(handles.map(handle => handle.getFile()));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return [];
    throw error;
  }
}
