/**
 * @typedef {Object} BaseMapConfig
 * @property {string} id
 * @property {{zh?: string, en?: string}|string} name
 * @property {'xyz'|'wms'} type
 * @property {string} url
 * @property {string} [attribution]
 * @property {number} [maxZoom]
 * @property {string} [subdomains]
 * @property {string} [layers]
 * @property {string} [format]
 * @property {boolean|string} [transparent]
 * @property {boolean} [builtIn]
 */

/**
 * @typedef {Object} ProjectSettings
 * @property {'zh'|'en'} language
 * @property {[number, number]} mapCenter
 * @property {number} mapZoom
 * @property {string} activeBaseMapId
 * @property {boolean} autoNormalizeBasemap
 * @property {BaseMapConfig[]} baseMaps
 * @property {Object<string, string>} uiTheme
 * @property {Object} statsCustom
 * @property {TrashItem[]} recycleBin
 */

/**
 * @typedef {Object} ZoneRecord
 * @property {string} id
 * @property {string} zoneId
 * @property {string} name
 * @property {string} description
 * @property {{type: 'Polygon', coordinates: number[][][]}} geometry
 */

/**
 * @typedef {Object} PhenologyEntry
 * @property {string} id
 * @property {string} label
 * @property {string} observer
 * @property {string} surveyDate
 * @property {string} habitat
 * @property {string} abundance
 * @property {string} growthForm
 * @property {string} floweringState
 * @property {string} cultivatedStatus
 * @property {string} note
 * @property {string[]} images
 */

/**
 * @typedef {Object} PointRecord
 * @property {string} id
 * @property {string} pointId
 * @property {string} zoneRef
 * @property {number} lat
 * @property {number} lng
 * @property {string} plantNameCn
 * @property {string} plantNameSci
 * @property {string} family
 * @property {string} genus
 * @property {string} taxonomySource
 * @property {string} taxonomyVerificationStatus
 * @property {PhenologyEntry[]} phenologyEntries
 */

/**
 * @typedef {Object} TrashItem
 * @property {string} id
 * @property {'zone'|'point'|'image'} type
 * @property {string} label
 * @property {Object} payload
 * @property {string} deletedAt
 */

const MAP_DEFAULT_CENTER = [29.6088, 106.3088];
const MAP_DEFAULT_ZOOM = 17;
const MAP_FOCUS_ZOOM = 19;
const MERGE_OVERLAP_DISTANCE_METERS = 15;
const BACKUP_EXPIRE_DAYS = 7;

const state = {
  projectDir: '',
  projectModifiedTime: 0,
  storageFormat: 'json',
  jsonFilesExist: false,
  sqliteDatabaseExists: false,
  settings: null,
  zones: [],
  points: [],
  selectedZoneId: null,
  selectedPointId: null,
  selectedPhenologyId: '',
  map: null,
  currentBaseLayer: null,
  currentOverlayLayers: [],
  currentBaseMapCoordSystem: 'WGS84',
  businessLayerGroups: null,
  businessLayerRegistry: new Map(),
  mapRenderToken: 0,
  lastBusinessLayerRender: null,
  currentMode: 'browse',
  currentBasemapEditId: null,
  currentOverlayEditId: null,
  rightPanelMode: 'stack',
  activeRightDrawerModule: '',
  rightPanelDiagnostics: null,
  drawHandler: null,
  zoneLayers: new Map(),
  pointLayers: new Map(),
  pendingPoint: null,
  activeListTab: 'zones',
  imagePreviewScale: 1,
  imagePreviewTranslateX: 0,
  imagePreviewTranslateY: 0,
  imagePreviewDragging: false,
  imagePreviewDragStart: null,
  currentPreviewImages: [],
  currentPreviewIndex: 0,
  statsTab: 'overview',
  trashSelectedId: '',
  confirmResolver: null,
  promptResolver: null,
  themeSlot: 'primary',
  mergeBaseDir: '',
  mergeOtherDir: '',
  mergeReviewResolver: null,
  backupTargetDir: '',
  lastBasemapCheck: null,
  lastBasemapTileError: null,
  lastCoordinateCorrection: null
};

const STANDARD_OPTIONS = {
  habitat: [
    '路旁绿化带', '林下', '灌丛边缘', '荒地', '草坪边缘',
    '围栏边', '坡地/护坡', '湿润低地', '排水沟边', '建筑周边'
  ],
  abundance: ['单株', '少量', '常见', '较多', '大量'],
  growthForm: ['乔木', '灌木', '藤本', '草本', '其他'],
  floweringState: [
    '萌芽期', '展叶期', '营养生长期', '花芽分化期', '现蕾期', '始花期',
    '盛花期', '末花期', '凋花期', '幼果期', '果熟期', '种子成熟期',
    '落叶期', '休眠期', '不明'
  ],
  cultivatedStatus: ['栽培', '野生', '逸生', '不明']
};

const RENDERER_ERROR_CODES = Object.freeze({
  UNTRUSTED_BACKUP_DIR: 'UNTRUSTED_BACKUP_DIR'
});

const EXPORT_COLUMNS_ZH = [
  ['zoneId', '分区编号'],
  ['zoneName', '分区名称'],
  ['pointId', '点位编号'],
  ['plantNameCn', '中文名'],
  ['plantNameSci', '学名'],
  ['family', '科'],
  ['genus', '属'],
  ['identificationStatus', '鉴定状态'],
  ['taxonomySource', '科属来源'],
  ['taxonomyMatchedName', '科属匹配名称'],
  ['taxonomyConfidence', '科属建议置信度'],
  ['taxonomyConfidenceLabel', '科属置信等级'],
  ['taxonomyVerificationStatus', '科属核验状态'],
  ['taxonomyUpdatedAt', '科属更新时间'],
  ['observer', '记录者'],
  ['surveyDate', '调查日期'],
  ['habitat', '微生境'],
  ['abundance', '多度/数量'],
  ['growthForm', '生活型'],
  ['floweringState', '物候状态'],
  ['cultivatedStatus', '来源属性'],
  ['note', '备注'],
  ['images', '图片文件'],
  ['lng', '经度'],
  ['lat', '纬度']
];

function makeUid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MAP_DEFAULT_CENTER,
    MAP_DEFAULT_ZOOM,
    MAP_FOCUS_ZOOM,
    MERGE_OVERLAP_DISTANCE_METERS,
    BACKUP_EXPIRE_DAYS,
    STANDARD_OPTIONS,
    EXPORT_COLUMNS_ZH,
    RENDERER_ERROR_CODES
  };
}
