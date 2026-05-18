const path = require('path');

const PROJECT_INFO_DIR = 'information';
const PROJECT_IMAGES_DIR = path.join(PROJECT_INFO_DIR, 'images');
const SETTINGS_FILE = 'settings.json';
const ZONES_FILE = 'zones.json';
const POINTS_FILE = 'points.json';
const BACKUP_EXPIRE_DAYS = 7;
const MAX_IMPORT_TEXT_BYTES = 20 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
const CSV_EXTENSIONS = new Set(['.csv']);
const GEOJSON_EXTENSIONS = new Set(['.geojson', '.json']);

function defaultSettings() {
  return {
    language: 'zh',
    mapCenter: [29.6088, 106.3088],
    mapZoom: 17,
    activeBaseMapId: 'osm-street',
    baseMaps: [
      {
        id: 'osm-street',
        name: { zh: 'OpenMap 街道图', en: 'OpenMap Street' },
        type: 'XYZ',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: 'abc',
        attribution: '© OpenStreetMap contributors',
        coordSystem: 'WGS84',
        maxNativeZoom: 19,
        maxZoom: 22,
        tileSize: 256,
        zoomOffset: 0,
        provider: 'OpenStreetMap',
        isOverlay: false,
        enabled: true,
        builtIn: true
      },
      {
        id: 'amap-satellite',
        name: { zh: '高德卫星图', en: 'Amap Satellite' },
        type: 'XYZ',
        url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
        subdomains: '1234',
        attribution: '© 高德地图',
        coordSystem: 'GCJ02',
        maxNativeZoom: 18,
        maxZoom: 22,
        tileSize: 256,
        zoomOffset: 0,
        provider: 'Amap',
        isOverlay: false,
        enabled: true,
        builtIn: true
      },
      {
        id: 'amap-road-label',
        name: { zh: '高德路网注记覆盖层', en: 'Amap Road Label Overlay' },
        type: 'XYZ',
        url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
        subdomains: '1234',
        attribution: '© 高德地图',
        coordSystem: 'GCJ02',
        maxNativeZoom: 18,
        maxZoom: 22,
        tileSize: 256,
        zoomOffset: 0,
        opacity: 1,
        provider: 'Amap',
        transparent: true,
        isOverlay: true,
        enabled: true,
        attachToBaseMapIds: ['amap-satellite'],
        zIndex: 420,
        notes: '与高德卫星图配套的路网 / 道路名称 / 地名注记层。',
        builtIn: true
      }
    ],
    uiTheme: {},
    statsCustom: {
      category: 'zone',
      chartType: 'combo',
      barMetric: 'speciesCount',
      lineMetric: 'pointCount'
    },
    recycleBin: []
  };
}

module.exports = {
  PROJECT_INFO_DIR,
  PROJECT_IMAGES_DIR,
  SETTINGS_FILE,
  ZONES_FILE,
  POINTS_FILE,
  BACKUP_EXPIRE_DAYS,
  MAX_IMPORT_TEXT_BYTES,
  IMAGE_EXTENSIONS,
  CSV_EXTENSIONS,
  GEOJSON_EXTENSIONS,
  defaultSettings
};
