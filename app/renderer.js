const i18n = {
  zh: {
    appTitle: '校园植物分区管理系统', appSubtitle: '分区绘制、点位管理、植物信息与图片归档', chooseProject: '选择项目目录',
    modeBrowse: '浏览 / 平移', modeDrawZone: '绘制分区', modeAddPoint: '添加点位', confirmCreatePoint: '确认建立点位', cancelCreatePoint: '取消建立点位',
    deleteZone: '删除当前分区', deletePoint: '删除当前点位', saveProject: '保存项目', projectInfo: '项目与界面', currentProject: '当前项目目录',
    notSelected: '未选择', notFilled: '未填写', search: '搜索', baseMapSettings: '底图设置', edit: '编辑', currentBaseMap: '当前底图', editTargetBaseMap: '编辑目标底图',
    baseMapNameZh: '名称（中文）', baseMapNameEn: '名称（英文）', sourceType: '类型', maxZoom: '最大缩放', urlTemplate: 'URL / 模板',
    attribution: '署名', subdomains: '子域名', layers: '图层名（WMS）', format: '格式（WMS）', transparency: '透明', yes: '是', no: '否',
    newBaseMap: '新建底图', saveBaseMap: '保存底图', deleteBaseMap: '删除底图', baseMapHelp: '支持 XYZ 与 WMS。WMTS 中如果提供 XYZ 风格地址，也可以按 XYZ 方式接入。',
    mode: '模式', selectedZone: '当前分区', selectedPoint: '当前点位', zoneInfo: '分区信息', zoneId: '分区编号', zoneName: '分区名称',
    zoneDescription: '分区描述', applyZoneInfo: '应用到当前分区', pointAndPlant: '点位与植物信息', pointId: '点位编号', plantNameCn: '植物中文名',
    plantNameSci: '学名', observer: '记录者', surveyDate: '调查日期', habitat: '微生境', abundance: '多度/数量', growthForm: '生活型',
    floweringState: '物候状态', cultivatedStatus: '来源属性', plantNote: '备注', images: '图片', chooseLocalImage: '选择本地图片',
    applyPointInfo: '应用到当前点位', zoneSpecies: '当前分区的植物', noProject: '请先选择项目目录。', noZoneSelected: '请先选中一个分区。',
    noPointSelected: '请先选中一个点位。', pointMustBeInZone: '点位必须落在当前分区内。', confirmDeleteZone: '确定删除当前分区及其点位吗？',
    confirmDeletePoint: '确定删除当前点位吗？', confirmDeleteImage: '确定删除这张图片吗？', saveSuccess: '保存成功。', chooseZoneThenAddPoint: '请先选中一个分区，再添加点位。',
    browse: '浏览 / 平移', drawZone: '绘制分区', addPoint: '添加点位', unnamedZone: '未命名分区', unnamedPoint: '未命名点位',
    searchPlaceholder: '分区 / 点位 / 物种 / 属性', builtIn: '内置', custom: '自定义', cannotDeleteBuiltin: '内置底图不能删除。', basemapSaved: '底图已保存。',
    basemapDeleted: '底图已删除。', importImageFailed: '导入图片失败。', projectCreated: '已加载项目目录。', zoneCreated: '分区已创建。', pointCreated: '点位已创建。',
    resultsEmpty: '暂无匹配结果。', pendingPointHint: '已生成临时点位，请点击“确认建立点位”或“取消建立点位”。确认后再填写详细信息。',
    pendingPointBlocked: '当前有一个待确认点位，请先确认或取消。', pointCreateCancelled: '已取消临时点位。', pointPositionLocked: '点位建立后位置固定。如需修改，请删除后重新建立。',
    zoneStatsTitle: '分区植物统计', zoneStatsSubtitle: '按分区查看点位数与物种数', statsZones: '分区', statsPoints: '点位', statsSpecies: '物种',
    exportTitle: '导出', exportCsv: '导出记录表 CSV', exportGeoJSON: '导出点位 GeoJSON', importCsv: '导入记录表 CSV', importGeoJSON: '导入点位 GeoJSON', importSuccess: '批量导入完成。', importFailed: '导入失败。', listPanelTitle: '分区与点位列表', zoneList: '分区列表', pointList: '点位列表',
    exportSuccess: '导出完成。', imagePreview: '图片预览', noImage: '暂无图片', imagePrev: '上一张', imageNext: '下一张', imageReset: '重置缩放', workspaceTools: '工作区工具', workspaceToolsSubtitle: '将统计、查询与回收管理集中到二级窗口', openStatsCenter: '统计中心', openQueryCenter: '查询中心', openRecycleBin: '回收站', projectInfoHint: '统计、查询与回收站已迁移到独立窗口，便于集中管理。', statsCenterTitle: '统计中心', statsCenterSubtitle: '按分类查看分区、物种与时间统计', statsTabOverview: '概览', statsTabZone: '分区统计', statsTabSpecies: '物种统计', statsTabTime: '时间统计', queryCenterTitle: '查询中心', queryCenterSubtitle: '统一搜索与高级联合筛选', searchKeyword: '关键词搜索', zoneFilter: '分区筛选', startDate: '起始日期', endDate: '结束日期', runQuery: '执行查询', resetQuery: '重置条件', recycleBinTitle: '回收站', recycleBinSubtitle: '恢复误删对象或彻底删除', restoreSelected: '恢复选中', deleteForeverSelected: '彻底删除', confirmAction: '确认', confirmDeleteZoneTitle: '确认删除分区', confirmDeletePointTitle: '确认删除点位', confirmDeleteImageTitle: '确认删除图片', confirmDeleteForeverTitle: '确认彻底删除', trashEmpty: '回收站为空', statsSectionZoneRank: '各分区物种数排行', statsSectionSource: '各来源属性数量统计', statsSectionGrowth: '各生活型比例', statsSectionPhenology: '各物候状态比例', statsSectionRecent: '新增记录统计', statsWeek: '本周新增', statsMonth: '本月新增', statsOverviewHint: '结合柱状图与圆环图查看当前项目整体结构', recordCount: '记录数', pointCountLabel: '点位数', deletedAt: '删除时间', itemTypeZone: '分区', itemTypePoint: '点位', itemTypeImage: '图片', exifImported: '已自动读取图片 EXIF 信息'
  },
  en: {
    appTitle: 'Campus Plant Zone Manager', appSubtitle: 'Zone drawing, point records, plant data, and image archive', chooseProject: 'Choose Project Folder',
    modeBrowse: 'Browse / Pan', modeDrawZone: 'Draw Zone', modeAddPoint: 'Add Point', confirmCreatePoint: 'Confirm Point', cancelCreatePoint: 'Cancel Point',
    deleteZone: 'Delete Current Zone', deletePoint: 'Delete Current Point', saveProject: 'Save Project', projectInfo: 'Project & UI', currentProject: 'Current Project Folder',
    notSelected: 'Not selected', notFilled: 'Not filled', search: 'Search', baseMapSettings: 'Base Map Settings', edit: 'Edit', currentBaseMap: 'Current Base Map', editTargetBaseMap: 'Base Map to Edit',
    baseMapNameZh: 'Name (Chinese)', baseMapNameEn: 'Name (English)', sourceType: 'Type', maxZoom: 'Max Zoom', urlTemplate: 'URL / Template', attribution: 'Attribution', subdomains: 'Subdomains', layers: 'Layers (WMS)', format: 'Format (WMS)', transparency: 'Transparent', yes: 'Yes', no: 'No',
    newBaseMap: 'New Base Map', saveBaseMap: 'Save Base Map', deleteBaseMap: 'Delete Base Map', baseMapHelp: 'Supports XYZ and WMS. WMTS can often be added as XYZ if the service provides tile template URLs.',
    mode: 'Mode', selectedZone: 'Selected Zone', selectedPoint: 'Selected Point', zoneInfo: 'Zone Info', zoneId: 'Zone ID', zoneName: 'Zone Name', zoneDescription: 'Zone Description', applyZoneInfo: 'Apply to Selected Zone',
    pointAndPlant: 'Point & Plant Info', pointId: 'Point ID', plantNameCn: 'Plant Name (CN)', plantNameSci: 'Scientific Name', observer: 'Recorder', surveyDate: 'Survey Date', habitat: 'Microhabitat', abundance: 'Abundance', growthForm: 'Growth Form', floweringState: 'Phenology', cultivatedStatus: 'Origin Status', plantNote: 'Note',
    images: 'Images', chooseLocalImage: 'Choose Local Image', applyPointInfo: 'Apply to Selected Point', zoneSpecies: 'Plants in Selected Zone', noProject: 'Please choose a project folder first.', noZoneSelected: 'Please select a zone first.', noPointSelected: 'Please select a point first.', pointMustBeInZone: 'The point must be inside the selected zone.', confirmDeleteZone: 'Delete the selected zone and all linked points?', confirmDeletePoint: 'Delete the selected point?', confirmDeleteImage: 'Delete this image?', saveSuccess: 'Saved successfully.', chooseZoneThenAddPoint: 'Select a zone first, then add a point.',
    browse: 'Browse / Pan', drawZone: 'Draw Zone', addPoint: 'Add Point', unnamedZone: 'Unnamed Zone', unnamedPoint: 'Unnamed Point', searchPlaceholder: 'Zone / Point / Species / Attributes', builtIn: 'Built-in', custom: 'Custom', cannotDeleteBuiltin: 'Built-in base maps cannot be deleted.', basemapSaved: 'Base map saved.', basemapDeleted: 'Base map deleted.', importImageFailed: 'Failed to import image.', projectCreated: 'Project folder loaded.', zoneCreated: 'Zone created.', pointCreated: 'Point created.', resultsEmpty: 'No matching results.', pendingPointHint: 'A temporary point is ready. Confirm or cancel it before editing details.', pendingPointBlocked: 'There is a pending point. Please confirm or cancel it first.', pointCreateCancelled: 'Temporary point cancelled.', pointPositionLocked: 'Point position is fixed after creation. Delete and recreate it to move.',
    zoneStatsTitle: 'Zone Plant Statistics', zoneStatsSubtitle: 'Review points and unique species by zone', statsZones: 'Zones', statsPoints: 'Points', statsSpecies: 'Species', exportTitle: 'Export', exportCsv: 'Export Records CSV', exportGeoJSON: 'Export Points GeoJSON', importCsv: 'Import Records CSV', importGeoJSON: 'Import Points GeoJSON', importSuccess: 'Batch import completed.', importFailed: 'Import failed.', listPanelTitle: 'Zone & Point Lists', zoneList: 'Zone List', pointList: 'Point List', exportSuccess: 'Export completed.', imagePreview: 'Image Preview', noImage: 'No images', imagePrev: 'Previous', imageNext: 'Next', imageReset: 'Reset Zoom', workspaceTools: 'Workspace Tools', workspaceToolsSubtitle: 'Open statistics, search, and recycle actions in secondary windows', openStatsCenter: 'Statistics Center', openQueryCenter: 'Query Center', openRecycleBin: 'Recycle Bin', projectInfoHint: 'Statistics, query and recycle tools are moved to dedicated secondary windows.', statsCenterTitle: 'Statistics Center', statsCenterSubtitle: 'Browse zone, species and timeline metrics by category', statsTabOverview: 'Overview', statsTabZone: 'Zone Stats', statsTabSpecies: 'Species Stats', statsTabTime: 'Timeline', queryCenterTitle: 'Query Center', queryCenterSubtitle: 'Unified search with advanced combined filters', searchKeyword: 'Keyword', zoneFilter: 'Zone Filter', startDate: 'Start Date', endDate: 'End Date', runQuery: 'Run Query', resetQuery: 'Reset Filters', recycleBinTitle: 'Recycle Bin', recycleBinSubtitle: 'Restore deleted items or remove them permanently', restoreSelected: 'Restore Selected', deleteForeverSelected: 'Delete Forever', confirmAction: 'Confirm', confirmDeleteZoneTitle: 'Confirm Zone Deletion', confirmDeletePointTitle: 'Confirm Point Deletion', confirmDeleteImageTitle: 'Confirm Image Deletion', confirmDeleteForeverTitle: 'Confirm Permanent Delete', trashEmpty: 'Recycle bin is empty', statsSectionZoneRank: 'Zone species ranking', statsSectionSource: 'Source type counts', statsSectionGrowth: 'Growth form proportions', statsSectionPhenology: 'Phenology proportions', statsSectionRecent: 'Recent record counts', statsWeek: 'Added This Week', statsMonth: 'Added This Month', statsOverviewHint: 'Use bars and donut charts to inspect the current project structure', recordCount: 'Records', pointCountLabel: 'Points', deletedAt: 'Deleted At', itemTypeZone: 'Zone', itemTypePoint: 'Point', itemTypeImage: 'Image', exifImported: 'EXIF information imported automatically'
  }
};


Object.assign(i18n.zh, {
  openPhenologyCenter:'物候录入中心', phenologyEditorTitle:'物候录入中心', phenologyEditorSubtitle:'一个点位对应一个物种，记录该物种的多个物候阶段',
  phenologyEditorHint:'已将物种与物候录入整合到二级窗口中。请先选中点位，再打开录入中心。',
  addPhenology:'添加物候', deletePhenology:'删去物候', noPhenologySelected:'请先选择一个物候阶段。', addPhenologyPrompt:'请输入要添加的物候名称', deletePhenologyPrompt:'确定删除当前物候记录吗？',
  phenologyListEmpty:'暂无物候记录', phaseSummary:'物候阶段', phenologyCount:'物候数'
});
Object.assign(i18n.en, {
  openPhenologyCenter:'Phenology Editor', phenologyEditorTitle:'Phenology Editor', phenologyEditorSubtitle:'One point stores one species with multiple phenology records',
  phenologyEditorHint:'Species and phenology entry is moved into a secondary window. Select a point first, then open the editor.',
  addPhenology:'Add Phenology', deletePhenology:'Delete Phenology', noPhenologySelected:'Please select a phenology record first.', addPhenologyPrompt:'Enter a phenology label to add', deletePhenologyPrompt:'Delete the current phenology record?',
  phenologyListEmpty:'No phenology records', phaseSummary:'Phenology', phenologyCount:'Phenology Count'
});

Object.assign(i18n.zh, {
  openThemeCenter:'界面设置', themeCenterTitle:'界面设置', themeCenterSubtitle:'调整常用 UI 色位、饱和度和色相',
  themeSlotPrimary:'主按钮', themeSlotWorkspace:'工作区按钮', themeSlotAccent:'强调色', themeSlotChartA:'图表主色', themeSlotChartB:'图表辅色',
  themeMorandiPreset:'莫兰迪预设', themeMacaronPreset:'马卡龙预设', themeHue:'色相', themeSaturation:'饱和度', themeResetSlot:'重置当前色位', themeResetAll:'恢复默认主题', themeApply:'应用主题',
  statsTabCustom:'自由统计', statsCustomTitle:'自由统计', statsChartType:'图表形式', statsCategory:'变量组', statsBarMetric:'柱状指标', statsLineMetric:'折线指标',
  statsCategoryZone:'按分区', statsCategoryGrowth:'按生活型', statsCategorySource:'按来源属性', statsCategoryPhenology:'按物候', statsChartCombo:'复合图', statsChartBar:'柱状图', statsChartLine:'折线图', statsChartPie:'饼图', statsChartDonut:'圆环图',
  statsMetricCount:'记录数', statsMetricPointCount:'点位数', statsMetricSpeciesCount:'物种数', statsMetricPercentage:'比例(%)', statsMetricWeek:'本周新增', statsMetricMonth:'本月新增',
  statsComboHint:'柱状图与折线图可分别绑定不同指标，修改后自动刷新图表。'
});
Object.assign(i18n.en, {
  openThemeCenter:'Theme Center', themeCenterTitle:'Theme Center', themeCenterSubtitle:'Adjust common UI color slots, hue and saturation',
  themeSlotPrimary:'Primary Buttons', themeSlotWorkspace:'Workspace Buttons', themeSlotAccent:'Accent', themeSlotChartA:'Chart Color A', themeSlotChartB:'Chart Color B',
  themeMorandiPreset:'Morandi Presets', themeMacaronPreset:'Macaron Presets', themeHue:'Hue', themeSaturation:'Saturation', themeResetSlot:'Reset Slot', themeResetAll:'Reset Theme', themeApply:'Apply Theme',
  statsTabCustom:'Custom Stats', statsCustomTitle:'Custom Statistics', statsChartType:'Chart Type', statsCategory:'Category', statsBarMetric:'Bar Metric', statsLineMetric:'Line Metric',
  statsCategoryZone:'By Zone', statsCategoryGrowth:'By Growth Form', statsCategorySource:'By Source', statsCategoryPhenology:'By Phenology', statsChartCombo:'Combo', statsChartBar:'Bar', statsChartLine:'Line', statsChartPie:'Pie', statsChartDonut:'Donut',
  statsMetricCount:'Record Count', statsMetricPointCount:'Point Count', statsMetricSpeciesCount:'Species Count', statsMetricPercentage:'Percentage (%)', statsMetricWeek:'This Week', statsMetricMonth:'This Month',
  statsComboHint:'Bar and line charts can bind to different metrics and refresh automatically.'
});

Object.assign(i18n.zh, {
  openMergeCenter:'项目合并', openBackupCenter:'项目备份', mergeCenterTitle:'项目目录合并', mergeCenterSubtitle:'合并两个项目目录中的点位数据（分区以主项目为准）',
  mergeBaseProject:'主项目目录', chooseBaseProject:'选择主项目', mergeOtherProject:'待合并项目目录', chooseOtherProject:'选择待合并项目', runMerge:'开始合并', mergeSummaryReady:'已准备合并。',
  mergeReviewTitle:'疑似重合确认', mergeReviewSubtitle:'请确认以下疑似重合点位是否按重合处理', applyMergeReview:'应用选择并合并',
  backupCenterTitle:'项目备份', backupCenterSubtitle:'手动备份当前项目，风险操作前将自动备份', backupTargetDir:'备份目标目录', chooseBackupTarget:'选择备份目录', runManualBackup:'立即备份',
  backupSuccess:'备份完成。', backupFailed:'备份失败。', mergeCompleted:'项目合并完成。', mergeFailed:'项目合并失败。', mergeNeedProjects:'请先选择两个项目目录。', mergeNeedCurrent:'请先选择当前项目目录或在合并窗口指定主项目。',
  expiredBackupsTitle:'检测到过期备份', expiredBackupsMessage:'发现超过 7 天的备份压缩包，是否继续保留 7 天？', keepSevenMoreDays:'继续保留7天', deleteNow:'直接彻底删除'
});
Object.assign(i18n.en, {
  openMergeCenter:'Project Merge', openBackupCenter:'Project Backup', mergeCenterTitle:'Project Merge', mergeCenterSubtitle:'Merge point data from two project folders while keeping zones from the base project',
  mergeBaseProject:'Base Project Folder', chooseBaseProject:'Choose Base Project', mergeOtherProject:'Project To Merge', chooseOtherProject:'Choose Project To Merge', runMerge:'Run Merge', mergeSummaryReady:'Merge is ready.',
  mergeReviewTitle:'Possible Duplicate Review', mergeReviewSubtitle:'Confirm whether these suspected overlaps should be merged', applyMergeReview:'Apply & Merge',
  backupCenterTitle:'Project Backup', backupCenterSubtitle:'Create manual backups. Risk operations will trigger automatic backups.', backupTargetDir:'Backup Target Folder', chooseBackupTarget:'Choose Backup Folder', runManualBackup:'Create Backup',
  backupSuccess:'Backup completed.', backupFailed:'Backup failed.', mergeCompleted:'Project merge completed.', mergeFailed:'Project merge failed.', mergeNeedProjects:'Please choose two project folders first.', mergeNeedCurrent:'Please load a project or choose the base project in the merge window.',
  expiredBackupsTitle:'Expired backups detected', expiredBackupsMessage:'Backups older than 7 days were found. Keep them for 7 more days?', keepSevenMoreDays:'Keep 7 More Days', deleteNow:'Delete Now'
});

// Global runtime state shared by map, forms, current selections and project data.
const state = {
  projectDir: '', projectModifiedTime:0, settings: null, zones: [], points: [], selectedZoneId: null, selectedPointId: null,
  map: null, currentBaseLayer: null, currentMode: 'browse', currentBasemapEditId: null,
  drawHandler: null, zoneLayers: new Map(), pointLayers: new Map(), pendingPoint: null, activeListTab: 'zones',
  imagePreviewScale: 1, imagePreviewTranslateX: 0, imagePreviewTranslateY: 0, imagePreviewDragging: false, imagePreviewDragStart: null,
  currentPreviewImages: [], currentPreviewIndex: 0,
  statsTab: 'overview', trashSelectedId: '', confirmResolver: null, selectedPhenologyId: '', promptResolver: null,
  themeSlot: 'primary', mergeBaseDir:'', mergeOtherDir:'', mergeReviewResolver:null, backupTargetDir:''
};


// Recommended option values. Inputs remain free-text, but these lists keep field values consistent.
const STANDARD_OPTIONS = {
  habitat: ['路旁绿化带','林下','灌丛边缘','荒地','草坪边缘','围栏边','坡地/护坡','湿润低地','排水沟边','建筑周边'],
  abundance: ['单株','少量','常见','较多','大量'],
  growthForm: ['乔木','灌木','藤本','草本','其他'],
  floweringState: ['萌芽期','展叶期','营养生长期','花芽分化期','现蕾期','始花期','盛花期','末花期','凋花期','幼果期','果熟期','种子成熟期','落叶期','休眠期','不明'],
  cultivatedStatus: ['栽培','野生','逸生','不明']
};

// Stable CSV export order. Keep this mapping aligned with future API / database field design.
const EXPORT_COLUMNS_ZH = [
  ['zoneId','分区编号'],
  ['zoneName','分区名称'],
  ['pointId','点位编号'],
  ['plantNameCn','中文名'],
  ['plantNameSci','学名'],
  ['observer','记录者'],
  ['surveyDate','调查日期'],
  ['habitat','微生境'],
  ['abundance','多度/数量'],
  ['growthForm','生活型'],
  ['floweringState','物候状态'],
  ['cultivatedStatus','来源属性'],
  ['note','备注'],
  ['images','图片文件'],
  ['lng','经度'],
  ['lat','纬度']
];

const el = (id) => document.getElementById(id);
const ui = {
  btnChooseDir: el('btnChooseDir'), btnModeBrowse: el('btnModeBrowse'), btnModeDrawZone: el('btnModeDrawZone'), btnModeAddPoint: el('btnModeAddPoint'),
  btnConfirmPoint: el('btnConfirmPoint'), btnCancelPoint: el('btnCancelPoint'), btnDeleteZone: el('btnDeleteZone'), btnDeletePoint: el('btnDeletePoint'), btnSave: el('btnSave'),
  btnApplyZone: el('btnApplyZone'), btnApplyPoint: el('btnApplyPoint'), btnChooseImage: el('btnChooseImage'), btnToggleBasemapEditor: el('btnToggleBasemapEditor'),
  btnNewBaseMap: el('btnNewBaseMap'), btnSaveBaseMap: el('btnSaveBaseMap'), btnDeleteBaseMap: el('btnDeleteBaseMap'), projectPath: el('projectPath'), baseMapSelect: el('baseMapSelect'),
  basemapEditor: el('basemapEditor'), bmEditTarget: el('bmEditTarget'), bmNameZh: el('bmNameZh'), bmNameEn: el('bmNameEn'), bmType: el('bmType'),
  bmUrl: el('bmUrl'), bmAttribution: el('bmAttribution'), bmMaxZoom: el('bmMaxZoom'), bmSubdomains: el('bmSubdomains'), bmLayers: el('bmLayers'), bmFormat: el('bmFormat'), bmTransparent: el('bmTransparent'),
  zoneId: el('zoneId'), zoneName: el('zoneName'), zoneDescription: el('zoneDescription'), pointId: el('pointId'), plantNameCn: el('plantNameCn'), plantNameSci: el('plantNameSci'), observer: el('observer'), surveyDate: el('surveyDate'), habitat: el('habitat'), abundance: el('abundance'), growthForm: el('growthForm'), floweringState: el('floweringState'), cultivatedStatus: el('cultivatedStatus'), plantNote: el('plantNote'), imageList: el('imageList'), zonePointList: el('zonePointList'), currentModeText: el('currentModeText'), selectedZoneText: el('selectedZoneText'), selectedPointText: el('selectedPointText'), zoneCount: el('zoneCount'), pointCount: el('pointCount'), pendingPointHint: el('pendingPointHint'),
  btnExportCsv: el('btnExportCsv'), btnExportGeoJSON: el('btnExportGeoJSON'), btnImportCsv: el('btnImportCsv'), btnImportGeoJSON: el('btnImportGeoJSON'), btnTabZones: el('btnTabZones'), btnTabPoints: el('btnTabPoints'), zoneListPanel: el('zoneListPanel'), pointListPanel: el('pointListPanel'), listSummaryCount: el('listSummaryCount'),
  btnOpenStats: el('btnOpenStats'), btnOpenQuery: el('btnOpenQuery'), btnOpenTrash: el('btnOpenTrash'), btnOpenPointEditor: el('btnOpenPointEditor'), btnOpenPointEditorInline: el('btnOpenPointEditorInline'), btnOpenTheme: el('btnOpenTheme'), btnOpenMerge: el('btnOpenMerge'), btnBackupProject: el('btnBackupProject'),
  statsModal: el('statsModal'), btnCloseStatsModal: el('btnCloseStatsModal'), statsModalBody: el('statsModalBody'), btnStatsTabOverview: el('btnStatsTabOverview'), btnStatsTabZone: el('btnStatsTabZone'), btnStatsTabSpecies: el('btnStatsTabSpecies'), btnStatsTabTime: el('btnStatsTabTime'), btnStatsTabCustom: el('btnStatsTabCustom'),
  queryModal: el('queryModal'), btnCloseQueryModal: el('btnCloseQueryModal'), queryText: el('queryText'), queryZone: el('queryZone'), queryGrowthForm: el('queryGrowthForm'), queryFloweringState: el('queryFloweringState'), queryCultivatedStatus: el('queryCultivatedStatus'), queryHabitat: el('queryHabitat'), queryObserver: el('queryObserver'), queryDateStart: el('queryDateStart'), queryDateEnd: el('queryDateEnd'), btnRunQuery: el('btnRunQuery'), btnResetQuery: el('btnResetQuery'), queryResults: el('queryResults'), queryResultCount: el('queryResultCount'),
  trashModal: el('trashModal'), btnCloseTrashModal: el('btnCloseTrashModal'), trashList: el('trashList'), trashCount: el('trashCount'), btnRestoreTrash: el('btnRestoreTrash'), btnDeleteTrashForever: el('btnDeleteTrashForever'),
  themeModal: el('themeModal'), btnCloseThemeModal: el('btnCloseThemeModal'), themeMorandiPresets: el('themeMorandiPresets'), themeMacaronPresets: el('themeMacaronPresets'), themeHue: el('themeHue'), themeSaturation: el('themeSaturation'), themePreviewSwatch: el('themePreviewSwatch'), btnResetThemeSlot: el('btnResetThemeSlot'), btnResetThemeAll: el('btnResetThemeAll'), btnSaveTheme: el('btnSaveTheme'),
  mergeModal: el('mergeModal'), btnCloseMergeModal: el('btnCloseMergeModal'), btnChooseMergeBase: el('btnChooseMergeBase'), btnChooseMergeOther: el('btnChooseMergeOther'), btnRunMerge: el('btnRunMerge'), mergeBasePath: el('mergeBasePath'), mergeOtherPath: el('mergeOtherPath'), mergeSummary: el('mergeSummary'),
  mergeReviewModal: el('mergeReviewModal'), btnCloseMergeReviewModal: el('btnCloseMergeReviewModal'), mergeReviewList: el('mergeReviewList'), btnMergeReviewCancel: el('btnMergeReviewCancel'), btnMergeReviewApply: el('btnMergeReviewApply'),
  backupModal: el('backupModal'), btnCloseBackupModal: el('btnCloseBackupModal'), backupCurrentPath: el('backupCurrentPath'), backupTargetPath: el('backupTargetPath'), btnChooseBackupTarget: el('btnChooseBackupTarget'), btnRunManualBackup: el('btnRunManualBackup'), backupSummary: el('backupSummary'),
  confirmModal: el('confirmModal'), confirmTitle: el('confirmTitle'), confirmMessage: el('confirmMessage'), btnConfirmCancel: el('btnConfirmCancel'), btnConfirmAccept: el('btnConfirmAccept'),
  imagePreviewModal: el('imagePreviewModal'), imagePreviewFull: el('imagePreviewFull'), imagePreviewCaption: el('imagePreviewCaption'), imagePreviewZoom: el('imagePreviewZoom'), btnCloseImageModal: el('btnCloseImageModal'), btnImagePrev: el('btnImagePrev'), btnImageNext: el('btnImageNext'), btnImageReset: el('btnImageReset'),
  pointEditorModal: el('pointEditorModal'), btnClosePointEditorModal: el('btnClosePointEditorModal'), phenologyTabs: el('phenologyTabs'), btnAddPhenology: el('btnAddPhenology'), btnDeletePhenology: el('btnDeletePhenology'), pointSummaryBox: el('pointSummaryBox'),
  smallPromptModal: el('smallPromptModal'), smallPromptTitle: el('smallPromptTitle'), smallPromptInput: el('smallPromptInput'), btnSmallPromptCancel: el('btnSmallPromptCancel'), btnSmallPromptAccept: el('btnSmallPromptAccept'),
  habitatOptions: el('habitatOptions'), abundanceOptions: el('abundanceOptions'), growthFormOptions: el('growthFormOptions'), floweringStateOptions: el('floweringStateOptions'), cultivatedStatusOptions: el('cultivatedStatusOptions')
};



const THEME_DEFAULTS = { primary:'#93a4b4', workspace:'#b6a7b2', accent:'#c9b39f', chartA:'#9ca9b1', chartB:'#c8a68c' };
const MORANDI_PRESETS = ['#9ca9b1','#b6a7b2','#c9b39f','#aab5a0','#c2b7ab','#8f9ca6'];
const MACARON_PRESETS = ['#f2c8c6','#f6d9b8','#d6e6c3','#c9dcf2','#d8c9ea','#f2d0e0'];
function hexToHsl(hex){ const c=hex.replace('#',''); const bigint=parseInt(c,16); const r=((bigint>>16)&255)/255,g=((bigint>>8)&255)/255,b=(bigint&255)/255; const max=Math.max(r,g,b),min=Math.min(r,g,b); let h,s,l=(max+min)/2; if(max===min){h=s=0;}else{ const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;} h*=60;} return {h:Math.round(h), s:Math.round(s*100), l:Math.round(l*100)}; }
function hslToHex(h,s,l){ s/=100; l/=100; const a=s*Math.min(l,1-l); const f=n=>{ const k=(n+h/30)%12; const color=l-a*Math.max(Math.min(k-3,9-k,1),-1); return Math.round(255*color).toString(16).padStart(2,'0'); }; return `#${f(0)}${f(8)}${f(4)}`; }
function ensureThemeSettings(){ state.settings.uiTheme = { ...THEME_DEFAULTS, ...(state.settings.uiTheme||{}) }; state.settings.statsCustom = Object.assign({ category:'zone', chartType:'combo', barMetric:'speciesCount', lineMetric:'pointCount' }, state.settings.statsCustom||{}); }
function getThemeColor(slot){ ensureThemeSettings(); return state.settings.uiTheme[slot] || THEME_DEFAULTS[slot]; }
function setThemeColor(slot, color){ ensureThemeSettings(); state.settings.uiTheme[slot]=color; applyThemeVariables(); }
function lightenHex(hex, amount=22){ const {h,s,l}=hexToHsl(hex); return hslToHex(h,s,Math.min(96,l+amount)); }
function applyThemeVariables(){ if(!state.settings) return; ensureThemeSettings(); const root=document.documentElement.style; const tset=state.settings.uiTheme; root.setProperty('--theme-primary', tset.primary); root.setProperty('--theme-primary-soft', lightenHex(tset.primary, 28)); root.setProperty('--theme-workspace', tset.workspace); root.setProperty('--theme-workspace-soft', lightenHex(tset.workspace, 26)); root.setProperty('--theme-accent-ui', tset.accent); root.setProperty('--theme-accent-ui-soft', lightenHex(tset.accent, 24)); root.setProperty('--theme-chart-a', tset.chartA); root.setProperty('--theme-chart-a-soft', lightenHex(tset.chartA, 24)); root.setProperty('--theme-chart-b', tset.chartB); root.setProperty('--theme-chart-b-soft', lightenHex(tset.chartB, 24)); }
function t(key) { const lang = state.settings?.language || 'zh'; return i18n[lang]?.[key] ?? key; }
function escapeHtml(str) { return String(str ?? '').replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s])); }
function toast(msg) { console.log('[toast]', msg); }
function zoneDisplayName(zone) { return zone?.name || zone?.zoneId || t('unnamedZone'); }
function pointDisplayName(point) { return point?.plantNameCn || point?.plantNameSci || point?.pointId || t('unnamedPoint'); }
function getSelectedZone() { return state.zones.find(z => z.id === state.selectedZoneId) || null; }
function getSelectedPoint() { return state.points.find(p => p.id === state.selectedPointId) || null; }
function getEditableZone() { return getSelectedZone() || state.zones.find(z => z.id === ui.zoneId.dataset.targetId) || null; }
function getEditablePoint() { return getSelectedPoint() || state.points.find(p => p.id === ui.pointId.dataset.targetId) || null; }
function makeUid(prefix){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }

function normalizeValue(field, value){
  const v = String(value ?? '').trim();
  if(!v) return '';
  return v;
}
function mapLegacyPhenology(value){
  const v = String(value || '').trim();
  if(!v) return '不明';
  const direct = STANDARD_OPTIONS.floweringState.find(item => item === v);
  if(direct) return direct;
  const alias = { '开花':'盛花期', '结果':'果熟期', '营养期':'营养生长期', '落花':'凋花期', '花蕾':'现蕾期', '幼果':'幼果期', '成熟':'果熟期' };
  return alias[v] || v;
}
function normalizeImages(value){
  if(Array.isArray(value)) return value.filter(Boolean);
  if(!value) return [];
  return String(value).split(/\s*;\s*/).filter(Boolean);
}
function makePhenologyEntry(raw={}){
  return {
    id: raw.id || makeUid('pheno'),
    label: mapLegacyPhenology(raw.label || raw.floweringState || raw.phaseName || raw.phenology || '不明') || '不明',
    observer: String(raw.observer || '').trim(),
    surveyDate: String(raw.surveyDate || '').trim(),
    habitat: normalizeValue('habitat', raw.habitat),
    abundance: normalizeValue('abundance', raw.abundance),
    growthForm: normalizeValue('growthForm', raw.growthForm),
    floweringState: mapLegacyPhenology(raw.floweringState || raw.label),
    cultivatedStatus: normalizeValue('cultivatedStatus', raw.cultivatedStatus),
    note: String(raw.note || '').trim(),
    images: normalizeImages(raw.images)
  };
}
function syncPointSummary(point){
  const entry = (point.phenologyEntries || [])[0] || makePhenologyEntry({});
  point.observer = entry.observer;
  point.surveyDate = entry.surveyDate;
  point.habitat = entry.habitat;
  point.abundance = entry.abundance;
  point.growthForm = entry.growthForm;
  point.floweringState = entry.floweringState || entry.label;
  point.cultivatedStatus = entry.cultivatedStatus;
  point.note = entry.note;
  point.images = normalizeImages(entry.images);
  if(!point.selectedPhenologyId || !(point.phenologyEntries||[]).some(x=>x.id===point.selectedPhenologyId)) point.selectedPhenologyId = entry.id || '';
  return point;
}
function normalizePointRecord(point){
  point.lat = Number(point.lat);
  point.lng = Number(point.lng);
  point.plantNameCn = String(point.plantNameCn || '').trim();
  point.plantNameSci = String(point.plantNameSci || '').trim();
  point.pointId = String(point.pointId || '').trim();
  if(Array.isArray(point.phenologyEntries) && point.phenologyEntries.length){
    point.phenologyEntries = point.phenologyEntries.map(makePhenologyEntry);
  } else {
    point.phenologyEntries = [makePhenologyEntry({
      label: mapLegacyPhenology(point.floweringState),
      floweringState: point.floweringState,
      observer: point.observer,
      surveyDate: point.surveyDate,
      habitat: point.habitat,
      abundance: point.abundance,
      growthForm: point.growthForm,
      cultivatedStatus: point.cultivatedStatus,
      note: point.note,
      images: point.images
    })];
  }
  point.phenologyEntries = point.phenologyEntries.filter(Boolean);
  if(!point.phenologyEntries.length) point.phenologyEntries = [makePhenologyEntry({label:'不明'})];
  return syncPointSummary(point);
}
function getPhenologyEntries(point){ return point?.phenologyEntries || []; }
function getSelectedPhenologyEntry(point=getSelectedPoint()){
  if(!point) return null;
  const entries = getPhenologyEntries(point);
  return entries.find(entry => entry.id === state.selectedPhenologyId) || entries[0] || null;
}
function setSelectedPhenologyEntry(pointId, entryId){
  if(pointId) state.selectedPointId = pointId;
  state.selectedPhenologyId = entryId || '';
}

function decodeCoordPair(pair){
  if(Array.isArray(pair) && pair.length >= 2){
    const a = Number(pair[0]);
    const b = Number(pair[1]);
    if(Number.isFinite(a) && Number.isFinite(b)){
      // Support both [lng,lat] and [lat,lng] safely.
      if(Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
      if(Math.abs(b) > 90 && Math.abs(a) <= 90) return [a, b];
      return [b, a];
    }
  }
  if(pair && typeof pair === 'object'){
    const lat = Number(pair.lat ?? pair.latitude ?? pair.y);
    const lng = Number(pair.lng ?? pair.lon ?? pair.longitude ?? pair.x);
    if(Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  return null;
}

function normalizeZoneRecord(zone){
  const out = { ...zone };
  const g = out.geometry;
  if(g?.type === 'Polygon' && Array.isArray(g.coordinates?.[0])) return out;
  if(Array.isArray(out.coordinates?.[0])){
    out.geometry = { type:'Polygon', coordinates:[out.coordinates] };
    return out;
  }
  if(Array.isArray(out.latlngs)){
    const ring = out.latlngs.map(item => decodeCoordPair(item)).filter(Boolean).map(([lat,lng]) => [lng,lat]);
    if(ring.length >= 3) out.geometry = { type:'Polygon', coordinates:[ring] };
  }
  return out;
}

function zoneBounds(zone){
  const coords = geometryToLatLngs(zone?.geometry);
  return coords.length ? L.latLngBounds(coords) : null;
}

function focusZoneOnMap(zoneId){
  const zone = state.zones.find(z => z.id === zoneId);
  if(!zone) return;
  const bounds = zoneBounds(zone);
  if(bounds && bounds.isValid()) state.map.fitBounds(bounds.pad(0.18), { animate:true, maxZoom:19 });
}

function focusPointOnMap(pointId){
  const point = state.points.find(p => p.id === pointId);
  if(!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
  state.map.setView([point.lat, point.lng], Math.max(state.map.getZoom(), 19), { animate:true });
}

function fitMapToProjectData(){
  const latlngs = [];
  state.zones.forEach(zone => latlngs.push(...geometryToLatLngs(zone.geometry).map(([lat,lng]) => L.latLng(lat,lng))));
  state.points.forEach(point => { if(Number.isFinite(point.lat) && Number.isFinite(point.lng)) latlngs.push(L.latLng(point.lat, point.lng)); });
  if(!latlngs.length) return;
  const bounds = L.latLngBounds(latlngs);
  if(bounds.isValid()) state.map.fitBounds(bounds.pad(0.15), { animate:false, maxZoom:19 });
}

function ensureSettingsShape(settings){
  const base = settings || {};
  if (!Array.isArray(base.baseMaps)) base.baseMaps = [];
  if (!Array.isArray(base.recycleBin)) base.recycleBin = [];
  if (!base.uiTheme) base.uiTheme = { ...THEME_DEFAULTS };
  else base.uiTheme = { ...THEME_DEFAULTS, ...base.uiTheme };
  if (!base.statsCustom) base.statsCustom = { category:'zone', chartType:'combo', barMetric:'speciesCount', lineMetric:'pointCount' };
  else base.statsCustom = Object.assign({ category:'zone', chartType:'combo', barMetric:'speciesCount', lineMetric:'pointCount' }, base.statsCustom);
  return base;
}
function getRecycleBin(){
  state.settings = ensureSettingsShape(state.settings);
  return state.settings.recycleBin;
}
function formatDateTimeLabel(value){
  if(!value) return '';
  try { return new Date(value).toLocaleString('zh-CN', { hour12:false }); } catch { return String(value); }
}
function isoToday(){ return new Date().toISOString().slice(0,10); }
function daysBetween(dateStr, days){
  const d = new Date(dateStr); if(Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (now - d) / 86400000 <= days;
}
function openLayerModal(modal){ if(modal) modal.classList.remove('hidden'); }
function closeLayerModal(modal){ if(modal) modal.classList.add('hidden'); }
function openConfirmDialog({ title='', message='', acceptLabel=null, cancelLabel=null }){
  ui.confirmTitle.textContent = title;
  ui.confirmMessage.textContent = message;
  ui.btnConfirmAccept.textContent = acceptLabel || t('confirmAction');
  ui.btnConfirmCancel.textContent = cancelLabel || t('cancelCreatePoint');
  openLayerModal(ui.confirmModal);
  return new Promise(resolve => { state.confirmResolver = resolve; });
}
function settleConfirmDialog(result){
  closeLayerModal(ui.confirmModal);
  ui.btnConfirmAccept.textContent = t('confirmAction');
  ui.btnConfirmCancel.textContent = t('cancelCreatePoint');
  if (state.confirmResolver) state.confirmResolver(result);
  state.confirmResolver = null;
}
function buildTrashItem(type, label, payload){
  return { id: makeUid('trash'), type, label, payload, deletedAt: new Date().toISOString() };
}
function pushToRecycleBin(item){
  const trash = getRecycleBin();
  trash.unshift(item);
}
function getTrashSelection(){ return getRecycleBin().find(item => item.id === state.trashSelectedId) || null; }

function dirnameLabel(dir){ return dir ? dir.replaceAll('\\','/') : '—'; }
function getSiblingBackupDir(projectDir){ return window.plantApp.getSiblingBackupDir({ projectDir }).then(r=>r.dirPath); }
function fmtTs(){ const d=new Date(); const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function getProjectMtime(dir){ return window.plantApp.getProjectModifiedTime({ projectDir: dir }).then(r=>r.modifiedTime || Date.now()); }
function getPointDateScore(point, fallback){
  const dates=getPhenologyEntries(point).map(e=>e.surveyDate).filter(Boolean).sort();
  if(dates.length){ const t=Date.parse(dates[0]); if(Number.isFinite(t)) return t; }
  return fallback || Date.now();
}
function normalizeSpeciesKey(point){ return `${String(point.plantNameSci||point.plantNameCn||'').trim().toLowerCase()}`; }
function distanceMeters(a,b){
  const R=6371000; const toRad=v=>v*Math.PI/180; const dLat=toRad((a.lat||0)-(b.lat||0)); const dLng=toRad((a.lng||0)-(b.lng||0));
  const lat1=toRad(a.lat||0), lat2=toRad(b.lat||0); const sinDLat=Math.sin(dLat/2), sinDLng=Math.sin(dLng/2);
  const h=sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLng*sinDLng; return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function cloneData(obj){ return JSON.parse(JSON.stringify(obj)); }
function inferPointIdScheme(points){
  let prefix='P'; let width=3; let maxNum=0;
  points.forEach(p=>{ const id=String(p.pointId||''); const m=id.match(/^(.*?)(\d+)$/); if(m){ if(prefix==='P') prefix=m[1]||'P'; width=Math.max(width,m[2].length); maxNum=Math.max(maxNum,Number(m[2]||0)); }});
  return { prefix, width, next: maxNum+1 };
}
function nextPointIdFactory(points){
  const scheme=inferPointIdScheme(points);
  return ()=> `${scheme.prefix}${String(scheme.next++).padStart(scheme.width,'0')}`;
}
function mapMergedZoneRef(point, otherZones){
  if(!state.zones.length) return point.zoneRef || '';
  if(point.zoneRef && state.zones.some(z=>z.id===point.zoneRef)) return point.zoneRef;
  const otherZone=otherZones.find(z=>z.id===point.zoneRef || z.zoneId===point.zoneRef || z.name===point.zoneRef);
  if(otherZone){
    const exact=state.zones.find(z=>(otherZone.zoneId && z.zoneId===otherZone.zoneId) || (otherZone.name && z.name===otherZone.name));
    if(exact) return exact.id;
  }
  if(Number.isFinite(point.lat)&&Number.isFinite(point.lng)){
    const ll={lat:point.lat,lng:point.lng};
    const containing=state.zones.find(z=>z.geometry && pointInPolygon(ll, z.geometry.coordinates));
    if(containing) return containing.id;
  }
  return '';
}
async function createBackupZip(sourceDir, targetDir, label){
  const res = await window.plantApp.createZipBackup({ sourceDir, targetDir, label });
  if(!res.ok) throw new Error(res.error || t('backupFailed'));
  return res.filePath;
}
async function autoBackupProjects(dirs, label='auto'){
  const done=[];
  for(const dir of [...new Set((dirs||[]).filter(Boolean))]){
    const target=await getSiblingBackupDir(dir);
    const file=await createBackupZip(dir, target, label);
    done.push(file);
  }
  return done;
}
async function maybeHandleExpiredBackups(projectDir){
  if(!projectDir) return;
  const res=await window.plantApp.listExpiredBackups({ projectDir, days:7 });
  if(!res.ok || !res.items?.length) return;
  const del = await openConfirmDialog({ title:t('expiredBackupsTitle'), message:`${t('expiredBackupsMessage')}\n${res.items.map(x=>x.name).join('\n')}`, acceptLabel:t('deleteNow'), cancelLabel:t('keepSevenMoreDays') });
  const paths=res.items.map(x=>x.path);
  if(del) await window.plantApp.deleteBackupFiles({ paths });
  else await window.plantApp.touchBackupFiles({ paths });
}
async function chooseDirectory(title){ const res=await window.plantApp.chooseDirectory({ title }); return res.canceled ? '' : res.dirPath; }
function renderMergeSummary(textMsg=''){ if(ui.mergeSummary) ui.mergeSummary.textContent=textMsg; }
function updateMergePaths(){ if(ui.mergeBasePath) ui.mergeBasePath.textContent=dirnameLabel(state.mergeBaseDir || state.projectDir); if(ui.mergeOtherPath) ui.mergeOtherPath.textContent=dirnameLabel(state.mergeOtherDir); }
function updateBackupPaths(){ if(ui.backupCurrentPath) ui.backupCurrentPath.textContent=dirnameLabel(state.projectDir); if(ui.backupTargetPath) ui.backupTargetPath.textContent=dirnameLabel(state.backupTargetDir); }
function openMergeCenter(){ state.mergeBaseDir = state.projectDir || ''; state.mergeOtherDir=''; updateMergePaths(); renderMergeSummary(''); openLayerModal(ui.mergeModal); }
function openBackupCenter(){ updateBackupPaths(); if(ui.backupSummary) ui.backupSummary.textContent=''; openLayerModal(ui.backupModal); }
function renderMergeReview(items){
  if(!ui.mergeReviewList) return;
  if(!items.length){ ui.mergeReviewList.innerHTML=`<div class="list-item"><div class="title">${escapeHtml(t('resultsEmpty'))}</div></div>`; return; }
  ui.mergeReviewList.innerHTML='';
  items.forEach((item, idx)=>{
    const card=document.createElement('label'); card.className='list-item merge-review-item';
    card.innerHTML=`<div class="title"><input type="checkbox" data-idx="${idx}" checked /> ${escapeHtml(item.incoming.pointId || pointDisplayName(item.incoming))}</div><div class="meta">${escapeHtml((item.current.pointId||'')+' ↔ '+(item.incoming.plantNameSci||item.incoming.plantNameCn||''))}</div>`;
    ui.mergeReviewList.appendChild(card);
  });
}
function openMergeReview(items){
  renderMergeReview(items);
  openLayerModal(ui.mergeReviewModal);
  return new Promise(resolve=>{ state.mergeReviewResolver = resolve; });
}
function settleMergeReview(result){
  closeLayerModal(ui.mergeReviewModal);
  if(state.mergeReviewResolver) state.mergeReviewResolver(result);
  state.mergeReviewResolver = null;
}
function getAllPointCandidates(){ return state.points.map(p=>({ ...p, __current:true })); }
function assignMergedZone(point, otherZones){ point.zoneRef = mapMergedZoneRef(point, otherZones); return point; }
function coordsReady(point){ return Number.isFinite(point?.lat) && Number.isFinite(point?.lng); }
function samePhenologySignature(a, b){
  const sig = point => getPhenologyEntries(point).map(entry => `${entry.label||entry.floweringState||''}|${entry.surveyDate||''}|${entry.habitat||''}|${entry.cultivatedStatus||''}`).sort().join('||');
  return sig(a) === sig(b);
}
function pointContentConflict(existing, incoming){
  // 合并规则：编号一致时，不能仅凭 pointId 视为重合；
  // 若核心内容差异过大，则应视为不同样本并重新编号并入。
  const speciesSame = normalizeSpeciesKey(existing) && normalizeSpeciesKey(existing) === normalizeSpeciesKey(incoming);
  if(!speciesSame) return true;

  let diffCount = 0;
  const fields = ['plantNameCn','plantNameSci','observer'];
  fields.forEach(key => {
    const a = String(existing[key] || '').trim();
    const b = String(incoming[key] || '').trim();
    if(a && b && a !== b) diffCount += 1;
  });

  if(!samePhenologySignature(existing, incoming)) diffCount += 1;

  const imgA = (existing.images || []).length;
  const imgB = (incoming.images || []).length;
  if(imgA && imgB && imgA !== imgB) diffCount += 1;

  return diffCount >= 2;
}
function maybeMatchSuspect(existing, incoming){
  const sameSpecies = normalizeSpeciesKey(existing) && normalizeSpeciesKey(existing)===normalizeSpeciesKey(incoming);
  if(!sameSpecies) return false;
  if(coordsReady(existing) && coordsReady(incoming)){
    return distanceMeters(existing, incoming) <= 15;
  }
  return existing.zoneRef && incoming.zoneRef && existing.zoneRef===incoming.zoneRef;
}
async function performProjectMerge(baseDir, otherDir){
  if(!baseDir || !otherDir) throw new Error(t('mergeNeedProjects'));
  if(state.projectDir !== baseDir) await loadProject(baseDir); else await persistProject();
  await autoBackupProjects([baseDir, otherDir], 'merge');
  const other = await window.plantApp.loadProject(otherDir);
  const otherZones = (other.zones||[]).map(normalizeZoneRecord);
  const otherPoints = (other.points||[]).map(p=>normalizePointRecord({observer:'',surveyDate:'',habitat:'',abundance:'',growthForm:'',floweringState:'',cultivatedStatus:'',...cloneData(p)})).map(p=>assignMergedZone(p, otherZones));
  const nextPointId = nextPointIdFactory(state.points);
  const exactByPointId = new Map(state.points.map(p=>[p.pointId,p]));
  const suspects=[];
  const newPoints=[];
  const replacements=[];
  for(const incoming of otherPoints){
    const existing = exactByPointId.get(incoming.pointId);
    if(existing){
      // 新规则：编号一致时，优先核对地理位置；位置差异明显则不视为重合。
      if(coordsReady(existing) && coordsReady(incoming)){
        const dist = distanceMeters(existing, incoming);
        if(dist > 15){
          newPoints.push(incoming);
          continue;
        }
      }
      // 在位置一致或无法比较位置的前提下，再核对内容差异。
      if(pointContentConflict(existing, incoming)){
        newPoints.push(incoming);
        continue;
      }
      const useIncoming = getPointDateScore(incoming, other.projectModifiedTime) < getPointDateScore(existing, state.projectModifiedTime);
      if(useIncoming) replacements.push({ target: existing, incoming });
      continue;
    }
    const suspect = state.points.find(p=>maybeMatchSuspect(p, incoming));
    if(suspect){ suspects.push({ current:suspect, incoming }); continue; }
    newPoints.push(incoming);
  }
  if(suspects.length){
    const result = await openMergeReview(suspects);
    if(!result) return false;
    suspects.forEach((item, idx)=>{
      if(result.mergeIdxs.includes(idx)){
        const useIncoming = getPointDateScore(item.incoming, other.projectModifiedTime) < getPointDateScore(item.current, state.projectModifiedTime);
        if(useIncoming) replacements.push({ target:item.current, incoming:item.incoming });
      } else { newPoints.push(item.incoming); }
    });
  }
  replacements.forEach(({target,incoming})=>{
    const keepId = target.id, keepPointId = target.pointId;
    Object.assign(target, cloneData(incoming));
    target.id = keepId;
    target.pointId = keepPointId;
    syncPointSummary(target);
  });
  newPoints.forEach(point=>{
    point.id = makeUid('point');
    point.pointId = nextPointId();
    state.points.push(point);
  });
  clearAllLayers();
  state.zones.filter(z=>z.geometry).forEach(addZoneLayer);
  state.points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).forEach(addPointLayer);
  selectZone(null);
  renderAllDerived();
  await persistProject();
  fitMapToProjectData();
  return true;
}
async function runMergeFlow(){
  try{
    let baseDir = state.projectDir || state.mergeBaseDir;
    let otherDir = state.mergeOtherDir;
    if(!baseDir){ baseDir = await chooseDirectory(t('chooseBaseProject')); state.mergeBaseDir = baseDir; }
    if(!otherDir){ otherDir = await chooseDirectory(t('chooseOtherProject')); state.mergeOtherDir = otherDir; }
    if(!baseDir || !otherDir) return alert(t('mergeNeedProjects'));
    if(baseDir === otherDir) return alert(t('mergeNeedProjects'));
    if(!state.projectDir){
      const bTime = await getProjectMtime(baseDir);
      const oTime = await getProjectMtime(otherDir);
      if(oTime < bTime){ baseDir = state.mergeOtherDir; otherDir = state.mergeBaseDir; }
    }
    state.mergeBaseDir = baseDir; state.mergeOtherDir = otherDir; updateMergePaths();
    renderMergeSummary(`${dirnameLabel(baseDir)} ← ${dirnameLabel(otherDir)}`);
    const ok = await performProjectMerge(baseDir, otherDir);
    if(ok){ closeLayerModal(ui.mergeModal); alert(t('mergeCompleted')); }
  } catch(err){ console.error(err); alert(`${t('mergeFailed')} ${err.message||err}`); }
}
async function runManualBackup(){
  if(!state.projectDir) return alert(t('mergeNeedCurrent'));
  const target = state.backupTargetDir || await chooseDirectory(t('chooseBackupTarget'));
  if(!target) return;
  state.backupTargetDir = target; updateBackupPaths();
  try { const file = await createBackupZip(state.projectDir, target, 'manual'); if(ui.backupSummary) ui.backupSummary.textContent = `${t('backupSuccess')} ${file}`; } catch(err){ console.error(err); alert(`${t('backupFailed')} ${err.message||err}`); }
}

// Fill datalist suggestions. Users can still type any value they need.
function fillDatalist(listEl, values){
  if(!listEl) return;
  listEl.innerHTML = values.map(v => `<option value="${escapeHtml(v)}"></option>`).join('');
}
function refreshSuggestionLists(){
  fillDatalist(ui.habitatOptions, STANDARD_OPTIONS.habitat);
  fillDatalist(ui.abundanceOptions, STANDARD_OPTIONS.abundance);
  fillDatalist(ui.growthFormOptions, STANDARD_OPTIONS.growthForm);
  fillDatalist(ui.floweringStateOptions, STANDARD_OPTIONS.floweringState);
  fillDatalist(ui.cultivatedStatusOptions, STANDARD_OPTIONS.cultivatedStatus);
}

function clearZoneForm() { ui.zoneId.value=''; ui.zoneName.value=''; ui.zoneDescription.value=''; ui.zoneId.dataset.targetId=''; }
function clearPointForm() { ui.pointId.value=''; ui.pointId.dataset.targetId=''; ui.plantNameCn.value=''; ui.plantNameSci.value=''; ui.observer.value=''; ui.surveyDate.value=''; ui.habitat.value=''; ui.abundance.value=''; ui.growthForm.value=''; ui.floweringState.value=''; ui.cultivatedStatus.value=''; ui.plantNote.value=''; ui.imageList.innerHTML=''; if(ui.phenologyTabs) ui.phenologyTabs.innerHTML=''; updatePointSummaryBox(); }

// Initialize Leaflet map and bind the global click handler used by draw / add-point workflow.
function initMap(){ state.map = L.map('map', { center:[29.6088,106.3088], zoom:17, zoomControl:true }); L.control.scale({ imperial:false }).addTo(state.map); state.map.on('click', onMapClick); }
function zoneStyle(selected=false){ return { color:selected?'#4b6bff':'#6e8cff', weight:selected?3:2, fillColor:selected?'#5b7dff':'#92a6ff', fillOpacity:selected?0.26:0.16 }; }
function pointStyle(selected=false, pending=false){ return { radius:pending?10:(selected?9:7), color:'#ffffff', weight:2, fillColor:pending?'#ffb147':(selected?'#ff5e80':'#30b7a0'), fillOpacity:0.96 }; }

function setMode(mode){
  if (state.drawHandler) { try { state.drawHandler.disable(); } catch {} state.drawHandler = null; }
  state.currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  if (mode==='browse') ui.btnModeBrowse.classList.add('active');
  if (mode==='drawZone') ui.btnModeDrawZone.classList.add('active');
  if (mode==='addPoint') ui.btnModeAddPoint.classList.add('active');
  state.map.dragging.enable(); updateStatusBar();
  if (mode==='drawZone') {
    state.drawHandler = new L.Draw.Polygon(state.map, { allowIntersection:false, showArea:true, shapeOptions:{ color:'#6e8cff', weight:2, fillColor:'#92a6ff', fillOpacity:0.18 } });
    state.drawHandler.enable();
    state.map.once(L.Draw.Event.CREATED, async (e) => {
      const zone = { id:makeUid('zone'), zoneId:'', name:'', description:'', geometry:e.layer.toGeoJSON().geometry };
      state.zones.push(zone); addZoneLayer(zone); selectZone(zone.id); setMode('browse'); await persistProject(); renderAllDerived(); toast(t('zoneCreated'));
    });
  }
}
function geometryToLatLngs(geometry){ if (!geometry || geometry.type!=='Polygon' || !Array.isArray(geometry.coordinates?.[0])) return []; return geometry.coordinates[0].map(pair => decodeCoordPair(pair)).filter(Boolean); }
function pointInPolygon(latlng, polygonCoords) { const x = latlng.lng, y = latlng.lat; let inside = false; const ring = polygonCoords[0]; for (let i=0,j=ring.length-1;i<ring.length;j=i++) { const xi=ring[i][0], yi=ring[i][1], xj=ring[j][0], yj=ring[j][1]; const intersect=((yi>y)!==(yj>y))&&(x<((xj-xi)*(y-yi))/((yj-yi)||1e-12)+xi); if(intersect) inside=!inside; } return inside; }
function pointMeta(point){ const entry=getSelectedPhenologyEntry(point)||getPhenologyEntries(point)[0]; const labels=getPhenologyEntries(point).map(x=>x.label).filter(Boolean).join(' / '); return [point.pointId, point.plantNameSci, labels || entry?.floweringState, entry?.habitat, entry?.cultivatedStatus].filter(Boolean).join(' · '); }
function uniqueSpeciesInZone(zoneId){ return new Set(state.points.filter(p=>p.zoneRef===zoneId).map(p=>(p.plantNameSci||p.plantNameCn||'').trim()).filter(Boolean)).size; }
function overallSpeciesCount(){ return new Set(state.points.map(p=>(p.plantNameSci||p.plantNameCn||'').trim()).filter(Boolean)).size; }
function totalPhenologyCount(){ return state.points.reduce((sum, point)=>sum + getPhenologyEntries(point).length, 0); }

function renderPointPopupHtml(point){
  if(!point) return '<div class="point-popup"><div class="pp-title">—</div></div>';
  const entry = getSelectedPhenologyEntry(point) || getPhenologyEntries(point)[0] || null;
  const phenologyLabels = getPhenologyEntries(point).map(item => item.label).filter(Boolean);
  const rows = [
    ['编号', point.pointId], ['中文名', point.plantNameCn], ['学名', point.plantNameSci], ['物候阶段', phenologyLabels.join(' / ')],
    ['记录者', entry?.observer], ['调查日期', entry?.surveyDate], ['微生境', entry?.habitat], ['多度/数量', entry?.abundance], ['生活型', entry?.growthForm], ['物候状态', entry?.floweringState || entry?.label], ['来源属性', entry?.cultivatedStatus], ['备注', entry?.note]
  ].filter(([,v]) => v);
  const rowsHtml = rows.map(([k,v]) => `<div class="pp-row"><span class="pp-key">${escapeHtml(k)}：</span><span class="pp-val">${escapeHtml(v)}</span></div>`).join('');
  const images = normalizeImages(entry?.images);
  const imageSet = images.map(img => toFileUrl(img)).join('|');
  const thumbs = images.length ? `<div class="pp-images">${images.slice(0,4).map(img => `<img class="pp-thumb" src="${escapeHtml(toFileUrl(img))}" data-full-image="${escapeHtml(toFileUrl(img))}" data-image-set="${escapeHtml(imageSet)}" data-caption="${escapeHtml((point.plantNameCn||point.plantNameSci||point.pointId||''))}" alt="thumb" />`).join('')}</div>` : `<div class="pp-empty">${escapeHtml(t('noImage'))}</div>`;
  return `<div class="point-popup"><div class="pp-title">${escapeHtml(pointDisplayName(point))}</div>${rowsHtml || '<div class="pp-empty">暂无详细信息</div>'}${thumbs}</div>`;
}
function toFileUrl(relativePath){ if(!state.projectDir) return relativePath; const normalized=`${state.projectDir}/${relativePath}`.replaceAll('\\','/'); return `file:///${normalized}`; }
function updateZoneTooltip(zone){ const layer = state.zoneLayers.get(zone.id); if (layer && layer.setTooltipContent) layer.setTooltipContent(escapeHtml(zoneDisplayName(zone))); }
function updatePointTooltip(point){ const marker = state.pointLayers.get(point.id); if (!marker) return; const tip = pointMeta(point) ? `${pointDisplayName(point)} · ${pointMeta(point)}` : pointDisplayName(point); if (marker.setTooltipContent) marker.setTooltipContent(escapeHtml(tip)); if (marker.setPopupContent) marker.setPopupContent(renderPointPopupHtml(point)); }

// Two-step point creation: first create a temporary point, then require explicit confirmation before persisting.
function createPendingPointAt(latlng){
  const zone = getSelectedZone(); if (!zone) return alert(t('chooseZoneThenAddPoint')); if (state.pendingPoint) return alert(t('pendingPointBlocked')); if (!pointInPolygon(latlng, zone.geometry.coordinates)) return alert(t('pointMustBeInZone'));
  const layer = L.circleMarker([latlng.lat, latlng.lng], pointStyle(false, true)).addTo(state.map); state.pendingPoint = { zoneId: zone.id, lat: latlng.lat, lng: latlng.lng, layer }; state.selectedPointId = null; clearPointForm(); showPendingControls(true); updateStatusBar(); toast(t('pendingPointHint'));
}
// Render a zone polygon and bind zone selection / add-point interaction.
function addZoneLayer(zone){
  const layer = L.polygon(geometryToLatLngs(zone.geometry), zoneStyle(zone.id===state.selectedZoneId)); layer._zoneId = zone.id;
  layer.on('click', (e)=>{ L.DomEvent.stop(e); state.map.closePopup(); if (state.currentMode === 'addPoint') { if (state.pendingPoint) return alert(t('pendingPointBlocked')); if (state.selectedZoneId !== zone.id) selectZone(zone.id); createPendingPointAt(e.latlng); return; } if (state.pendingPoint) return alert(t('pendingPointBlocked')); selectZone(zone.id); });
  layer.bindTooltip(escapeHtml(zoneDisplayName(zone)), {sticky:true, direction:'top', opacity:0.92}); layer.addTo(state.map); state.zoneLayers.set(zone.id, layer);
}
// Render a saved point marker and attach popup / selection behavior.
function addPointLayer(point){
  const marker = L.circleMarker([point.lat, point.lng], pointStyle(point.id===state.selectedPointId, false)); marker._pointId = point.id;
  marker.on('click', (e)=>{ L.DomEvent.stop(e); state.map.closePopup(); if (state.currentMode === 'addPoint') return; if (state.pendingPoint) return alert(t('pendingPointBlocked')); selectPoint(point.id); marker.openPopup(); });
  const tip = pointMeta(point) ? `${pointDisplayName(point)} · ${pointMeta(point)}` : pointDisplayName(point);
  marker.bindTooltip(escapeHtml(tip), {sticky:true, direction:'top', opacity:0.95}); marker.bindPopup(renderPointPopupHtml(point), { maxWidth: 360, className: 'point-detail-popup' }); marker.addTo(state.map); if(marker.bringToFront) marker.bringToFront(); state.pointLayers.set(point.id, marker);
}
function refreshZoneStyles(){ state.zones.forEach(zone => { const layer = state.zoneLayers.get(zone.id); if (layer) layer.setStyle(zoneStyle(zone.id===state.selectedZoneId)); }); }
function refreshPointStyles(){ state.points.forEach(point => { const marker = state.pointLayers.get(point.id); if (marker) marker.setStyle(pointStyle(point.id===state.selectedPointId,false)); }); }
function selectZone(zoneId){ state.selectedZoneId = zoneId; state.selectedPointId = null; state.selectedPhenologyId=''; refreshZoneStyles(); refreshPointStyles(); populateZoneForm(); clearPointForm(); renderZonePointList(); renderLists(); updateStatusBar(); state.map.closePopup(); updatePointSummaryBox(); }
function selectPoint(pointId){ state.selectedPointId = pointId; const p=getSelectedPoint(); if (p) { state.selectedZoneId=p.zoneRef; if(!state.selectedPhenologyId || !getPhenologyEntries(p).some(x=>x.id===state.selectedPhenologyId)) state.selectedPhenologyId=getPhenologyEntries(p)[0]?.id || ''; } refreshZoneStyles(); refreshPointStyles(); populateZoneForm(); populatePointForm(); renderZonePointList(); renderLists(); updateStatusBar(); const marker = p ? state.pointLayers.get(p.id) : null; if (marker && marker.openPopup) marker.openPopup(); }
function showPendingControls(show){ ui.btnConfirmPoint.classList.toggle('hidden', !show); ui.btnCancelPoint.classList.toggle('hidden', !show); ui.pendingPointHint.classList.toggle('hidden', !show); }
function clearPendingPoint(){ if (state.pendingPoint?.layer) state.map.removeLayer(state.pendingPoint.layer); state.pendingPoint = null; showPendingControls(false); }
async function onMapClick(e){ if (state.currentMode !== 'addPoint') return; if (!state.projectDir) return alert(t('noProject')); createPendingPointAt(e.latlng); }
async function confirmPendingPoint(){
  if (!state.pendingPoint) return;
  const pending = { ...state.pendingPoint };
  const point = normalizePointRecord({
    id:makeUid('point'), pointId:`P${String(state.points.length + 1).padStart(3,'0')}`, zoneRef:pending.zoneId, lat:pending.lat, lng:pending.lng,
    plantNameCn:'', plantNameSci:'', phenologyEntries:[makePhenologyEntry({label:'不明', floweringState:'不明'})]
  });
  clearPendingPoint();
  state.points.push(point); addPointLayer(point); selectPoint(point.id); setMode('browse');
  await persistProject(); renderAllDerived();
  const marker = state.pointLayers.get(point.id); if (marker && marker.openPopup) marker.openPopup();
  toast(t('pointCreated'));
}
function cancelPendingPoint(){ clearPendingPoint(); setMode('browse'); toast(t('pointCreateCancelled')); }

function populateZoneForm() { const z=getSelectedZone(); ui.zoneId.value=z?.zoneId||''; ui.zoneName.value=z?.name||''; ui.zoneDescription.value=z?.description||''; ui.zoneId.dataset.targetId=z?.id||''; }
function updatePointSummaryBox(){
  const p = getSelectedPoint();
  if(!ui.pointSummaryBox) return;
  if(!p){ ui.pointSummaryBox.textContent='—'; return; }
  const labels=getPhenologyEntries(p).map(x=>x.label).filter(Boolean).join(' / ');
  ui.pointSummaryBox.innerHTML = `<div><strong>${escapeHtml(pointDisplayName(p))}</strong></div><div class="subtle">${escapeHtml(p.pointId||'')}</div><div class="subtle">${escapeHtml(labels || t('phenologyListEmpty'))}</div>`;
}
function renderPhenologyTabs(){
  if(!ui.phenologyTabs) return;
  const point=getSelectedPoint();
  ui.phenologyTabs.innerHTML='';
  if(!point){ ui.phenologyTabs.innerHTML=`<span class="subtle">${escapeHtml(t('noPointSelected'))}</span>`; return; }
  const entries=getPhenologyEntries(point);
  if(!entries.length){ ui.phenologyTabs.innerHTML=`<span class="subtle">${escapeHtml(t('phenologyListEmpty'))}</span>`; return; }
  entries.forEach(entry=>{
    const btn=document.createElement('button');
    btn.className='seg-btn phenology-tab-btn';
    if(entry.id===state.selectedPhenologyId) btn.classList.add('active');
    btn.textContent=entry.label || entry.floweringState || t('notFilled');
    btn.addEventListener('click', ()=>{ state.selectedPhenologyId = entry.id; populatePointForm(); });
    ui.phenologyTabs.appendChild(btn);
  });
}
function populatePointForm(){
  const p=getSelectedPoint();
  ui.pointId.value=p?.pointId||''; ui.pointId.dataset.targetId=p?.id||'';
  ui.plantNameCn.value=p?.plantNameCn||''; ui.plantNameSci.value=p?.plantNameSci||'';
  const entry=getSelectedPhenologyEntry(p);
  ui.observer.value=entry?.observer||''; ui.surveyDate.value=entry?.surveyDate||''; ui.habitat.value=entry?.habitat||'';
  ui.abundance.value=entry?.abundance||''; ui.growthForm.value=entry?.growthForm||''; ui.floweringState.value=entry?.floweringState || entry?.label || '';
  ui.cultivatedStatus.value=entry?.cultivatedStatus||''; ui.plantNote.value=entry?.note||'';
  renderPhenologyTabs(); renderImageList(entry?.images||[]); updatePointSummaryBox();
}
async function applyZoneInfo(){ const zone=getEditableZone(); if(!zone) return alert(t('noZoneSelected')); state.selectedZoneId = zone.id; zone.zoneId=ui.zoneId.value.trim(); zone.name=ui.zoneName.value.trim(); zone.description=ui.zoneDescription.value.trim(); updateZoneTooltip(zone); renderAllDerived(); await persistProject(); }
async function applyPointInfo(){
  const point=getEditablePoint(); if(!point) return alert(t('noPointSelected'));
  const entry=getSelectedPhenologyEntry(point); if(!entry) return alert(t('noPhenologySelected'));
  state.selectedPointId = point.id; state.selectedZoneId = point.zoneRef;
  point.pointId=ui.pointId.value.trim(); point.plantNameCn=ui.plantNameCn.value.trim(); point.plantNameSci=ui.plantNameSci.value.trim();
  entry.observer=ui.observer.value.trim(); entry.surveyDate=ui.surveyDate.value; entry.habitat=ui.habitat.value.trim(); entry.abundance=ui.abundance.value.trim(); entry.growthForm=ui.growthForm.value.trim(); entry.floweringState=mapLegacyPhenology(ui.floweringState.value.trim()); entry.label=entry.floweringState; entry.cultivatedStatus=ui.cultivatedStatus.value.trim(); entry.note=ui.plantNote.value.trim();
  syncPointSummary(point); updatePointTooltip(point); renderAllDerived(); await persistProject();
}
function renderImageList(images){
  ui.imageList.innerHTML='';
  if(!images?.length) return;
  const imageSet=(images||[]).map(img=>toFileUrl(img)).join('|');
  images.forEach((imgPath)=>{
    const card=document.createElement('div'); card.className='image-card';
    const img=document.createElement('img'); img.src=toFileUrl(imgPath); img.alt=imgPath; img.dataset.fullImage=toFileUrl(imgPath); img.dataset.imageSet=imageSet; img.dataset.caption=imgPath.split('/').pop();
    const actions=document.createElement('div'); actions.className='img-actions';
    const btn=document.createElement('button'); btn.className='btn btn-danger-soft'; btn.textContent='×';
    btn.addEventListener('click', async ()=>{
      const point=getSelectedPoint(); const entry=getSelectedPhenologyEntry(point); if(!point||!entry) return;
      const ok = await openConfirmDialog({ title:t('confirmDeleteImageTitle'), message:t('confirmDeleteImage') });
      if(!ok) return;
      entry.images=(entry.images||[]).filter(x=>x!==imgPath);
      syncPointSummary(point);
      pushToRecycleBin(buildTrashItem('image', imgPath.split('/').pop(), { pointId: point.id, phenologyId: entry.id, relativePath: imgPath }));
      renderImageList(entry.images); renderAllDerived(); updatePointTooltip(point); await persistProject();
    });
    actions.appendChild(btn);
    const name=document.createElement('div'); name.className='img-name'; name.textContent=imgPath.split('/').pop();
    card.append(img,actions,name); ui.imageList.appendChild(card);
  });
}
async function chooseAndImportImage(){
  const point=getSelectedPoint(); if(!point) return alert(t('noPointSelected'));
  const entry=getSelectedPhenologyEntry(point); if(!entry) return alert(t('noPhenologySelected'));
  const res=await window.plantApp.chooseImage(); if(res.canceled) return;
  const imported=await window.plantApp.importImage({projectDir:state.projectDir, sourcePath:res.filePath});
  if(!imported.ok) return alert(imported.error || t('importImageFailed'));
  entry.images=entry.images||[];
  const isFirstImage = entry.images.length === 0;
  entry.images.push(imported.relativePath);
  if(!entry.surveyDate && imported.exif?.date){ entry.surveyDate = imported.exif.date; ui.surveyDate.value = imported.exif.date; }
  if(isFirstImage && Number.isFinite(imported.exif?.lat) && Number.isFinite(imported.exif?.lng)){
    point.lat = imported.exif.lat; point.lng = imported.exif.lng; const marker = state.pointLayers.get(point.id); if(marker?.setLatLng) marker.setLatLng([point.lat, point.lng]);
  }
  syncPointSummary(point);
  renderImageList(entry.images); updatePointTooltip(point); renderAllDerived(); await persistProject(); toast(t('exifImported'));
}

function renderZonePointList(){ const zone=getSelectedZone(); ui.zonePointList.innerHTML=''; if(!zone) return; const pts=state.points.filter(p=>p.zoneRef===zone.id); if(!pts.length){ const card=document.createElement('div'); card.className='list-item'; card.innerHTML=`<div class="title">${escapeHtml(t('resultsEmpty'))}</div>`; ui.zonePointList.appendChild(card); return; } pts.forEach(p=>{ const card=document.createElement('div'); card.className='list-item'; card.innerHTML=`<div class="title">${escapeHtml(pointDisplayName(p))}</div><div class="meta">${escapeHtml(pointMeta(p)||p.pointId||'')}</div>`; card.addEventListener('click',()=>{ selectPoint(p.id); focusPointOnMap(p.id); }); ui.zonePointList.appendChild(card); }); }
function renderZonePointList(){ const zone=getSelectedZone(); ui.zonePointList.innerHTML=''; if(!zone) return; const pts=state.points.filter(p=>p.zoneRef===zone.id); if(!pts.length){ const card=document.createElement('div'); card.className='list-item'; card.innerHTML=`<div class="title">${escapeHtml(t('resultsEmpty'))}</div>`; ui.zonePointList.appendChild(card); return; } pts.forEach(p=>{ const card=document.createElement('div'); card.className='list-item'; card.innerHTML=`<div class="title">${escapeHtml(pointDisplayName(p))}</div><div class="meta">${escapeHtml(pointMeta(p)||p.pointId||'')}</div>`; card.addEventListener('click',()=>{ selectPoint(p.id); focusPointOnMap(p.id); }); ui.zonePointList.appendChild(card); }); }
function renderCounters(){ ui.zoneCount.textContent=String(state.zones.length); ui.pointCount.textContent=String(state.points.length); }
function updateStatusBar(){ ui.currentModeText.textContent = t(state.currentMode==='browse'?'browse':state.currentMode==='drawZone'?'drawZone':'addPoint'); ui.selectedZoneText.textContent = getSelectedZone() ? zoneDisplayName(getSelectedZone()) : '—'; ui.selectedPointText.textContent = getSelectedPoint() ? pointDisplayName(getSelectedPoint()) : '—'; }
// Search now lives in a dedicated secondary window. The quick filter card was removed to keep the workspace clean.
function populateQueryFilters(){
  const current = ui.queryZone?.value || '';
  if(!ui.queryZone) return;
  ui.queryZone.innerHTML = `<option value="">${escapeHtml(t('notSelected'))}</option>` + state.zones.map(z => `<option value="${escapeHtml(z.id)}">${escapeHtml(zoneDisplayName(z))}</option>`).join('');
  ui.queryZone.value = current;
}
function getQueryResults(){
  const q = String(ui.queryText?.value || '').trim().toLowerCase();
  const filters = {
    zoneId: ui.queryZone?.value || '',
    growthForm: String(ui.queryGrowthForm?.value || '').trim().toLowerCase(),
    floweringState: String(ui.queryFloweringState?.value || '').trim().toLowerCase(),
    cultivatedStatus: String(ui.queryCultivatedStatus?.value || '').trim().toLowerCase(),
    habitat: String(ui.queryHabitat?.value || '').trim().toLowerCase(),
    observer: String(ui.queryObserver?.value || '').trim().toLowerCase(),
    start: ui.queryDateStart?.value || '',
    end: ui.queryDateEnd?.value || ''
  };
  const pointHits = state.points.filter(point => {
    const zone = state.zones.find(z=>z.id===point.zoneRef);
    const entries = getPhenologyEntries(point);
    const haystack = [point.pointId, point.plantNameCn, point.plantNameSci, zone?.zoneId, zone?.name, ...entries.flatMap(entry => [entry.label, entry.floweringState, entry.note, entry.habitat, entry.observer, entry.growthForm, entry.cultivatedStatus, ...(entry.images||[])])].join(' ').toLowerCase();
    if(q && !haystack.includes(q)) return false;
    if(filters.zoneId && point.zoneRef !== filters.zoneId) return false;
    const matchedEntry = entries.find(entry => {
      if(filters.growthForm && !String(entry.growthForm||'').toLowerCase().includes(filters.growthForm)) return false;
      if(filters.floweringState && !(`${entry.label||''} ${entry.floweringState||''}`).toLowerCase().includes(filters.floweringState)) return false;
      if(filters.cultivatedStatus && !String(entry.cultivatedStatus||'').toLowerCase().includes(filters.cultivatedStatus)) return false;
      if(filters.habitat && !String(entry.habitat||'').toLowerCase().includes(filters.habitat)) return false;
      if(filters.observer && !String(entry.observer||'').toLowerCase().includes(filters.observer)) return false;
      if(filters.start && (!entry.surveyDate || entry.surveyDate < filters.start)) return false;
      if(filters.end && (!entry.surveyDate || entry.surveyDate > filters.end)) return false;
      return true;
    });
    const noStructured = !filters.growthForm && !filters.floweringState && !filters.cultivatedStatus && !filters.habitat && !filters.observer && !filters.start && !filters.end;
    return noStructured || !!matchedEntry;
  }).map(point => {
    const zone = state.zones.find(z=>z.id===point.zoneRef);
    const labels = getPhenologyEntries(point).map(x=>x.label).join(' / ');
    return { type:'point', id:point.id, title:pointDisplayName(point), meta:[zoneDisplayName(zone), labels].filter(Boolean).join(' · ') };
  });
  const zoneHits = state.zones.filter(zone => {
    const haystack = [zone.zoneId, zone.name, zone.description].join(' ').toLowerCase();
    if(q && !haystack.includes(q)) return false;
    if(filters.zoneId && zone.id !== filters.zoneId) return false;
    return !filters.growthForm && !filters.floweringState && !filters.cultivatedStatus && !filters.habitat && !filters.observer && !filters.start && !filters.end;
  }).map(zone => ({ type:'zone', id:zone.id, title:zoneDisplayName(zone), meta:zone.zoneId || '' }));
  return [...zoneHits, ...pointHits];
}
function renderQueryResults(){
  if(!ui.queryResults) return;
  const items = getQueryResults();
  ui.queryResults.innerHTML = '';
  ui.queryResultCount.textContent = String(items.length);
  if(!items.length){
    const empty=document.createElement('div'); empty.className='list-item'; empty.innerHTML=`<div class="title">${escapeHtml(t('resultsEmpty'))}</div>`; ui.queryResults.appendChild(empty); return;
  }
  items.forEach(item => {
    const card=document.createElement('div'); card.className='list-item';
    card.innerHTML=`<div class="title">${escapeHtml(item.title)}</div><div class="meta">${escapeHtml(item.meta || '')}</div>`;
    card.addEventListener('click', ()=> { if(item.type==='zone'){ selectZone(item.id); focusZoneOnMap(item.id); } else { selectPoint(item.id); focusPointOnMap(item.id); } closeLayerModal(ui.queryModal); });
    ui.queryResults.appendChild(card);
  });
}
function donutSvgFromCounts(entries, palette){
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  let offset = 0;
  const radius = 46; const circumference = 2 * Math.PI * radius;
  const slices = entries.map(([label, value], index) => {
    const frac = value / total;
    const dash = `${(frac * circumference).toFixed(2)} ${(circumference - frac * circumference).toFixed(2)}`;
    const circle = `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="${palette[index % palette.length]}" stroke-width="18" stroke-dasharray="${dash}" stroke-dashoffset="${-offset.toFixed(2)}" transform="rotate(-90 60 60)" stroke-linecap="round"></circle>`;
    offset += frac * circumference;
    return circle;
  }).join('');
  return `<svg viewBox="0 0 120 120" class="donut-svg"><circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e8e4df" stroke-width="18"></circle>${slices}<text x="60" y="57" text-anchor="middle" class="donut-total">${entries.reduce((s,[,v])=>s+v,0)}</text><text x="60" y="74" text-anchor="middle" class="donut-sub">${escapeHtml(t('recordCount'))}</text></svg>`;
}
function renderMiniLegend(entries, palette){
  return entries.map(([label, value], index) => `<div class="legend-item"><span class="legend-dot" style="background:${palette[index % palette.length]}"></span><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`).join('');
}
function renderBarList(items, valueKey, labelBuilder){
  if(!items.length) return `<div class="subtle">${escapeHtml(t('resultsEmpty'))}</div>`;
  const rows = items.map(item => ({ label: labelBuilder(item), value: Number(item[valueKey] || 0) }));
  const width = Math.max(920, rows.length * 120 + 180);
  const longest = rows.reduce((m, item)=>Math.max(m, String(item.label).length), 0);
  const bottomPad = Math.max(110, 64 + longest * 6);
  const height = Math.max(360, 280 + Math.min(80, longest * 2));
  const padding = { left:72, right:32, top:24, bottom:bottomPad };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...rows.map(item => item.value));
  const ticks = niceTicks(max, 5);
  const top = Math.max(...ticks);
  const palette = chartPalette(rows.length);
  const colW = plotW / Math.max(1, rows.length);
  let grid='', bars='', labels='', axes='';
  ticks.forEach(v=>{
    const y = padding.top + plotH - (v/top)*plotH;
    grid += `<g><line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width-padding.right}" y2="${y.toFixed(1)}" class="chart-grid"></line><line x1="${(padding.left-6).toFixed(1)}" y1="${y.toFixed(1)}" x2="${padding.left}" y2="${y.toFixed(1)}" class="chart-axis-tick"></line><text x="${(padding.left-10).toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="end" class="axis-tick-label">${escapeHtml(v)}</text></g>`;
  });
  rows.forEach((row, idx)=>{
    const x = padding.left + idx*colW + colW*0.18;
    const bw = Math.max(22, colW*0.58);
    const barH = plotH * (row.value/top);
    const y = padding.top + plotH - barH;
    const cx = padding.left + idx*colW + colW/2;
    bars += `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" rx="10" fill="${palette[idx%palette.length]}"></rect><text x="${(x+bw/2).toFixed(1)}" y="${(y-8).toFixed(1)}" text-anchor="middle" class="chart-value">${escapeHtml(row.value)}</text></g>`;
    labels += `<g transform="translate(${cx.toFixed(1)},${(height-padding.bottom+28).toFixed(1)}) rotate(-32)"><text text-anchor="end" class="axis-label axis-label-long">${escapeHtml(String(row.label))}</text></g>`;
    axes += `<line x1="${cx.toFixed(1)}" y1="${(height-padding.bottom).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(height-padding.bottom+6).toFixed(1)}" class="chart-axis-tick"></line>`;
  });
  const svg = `<svg viewBox="0 0 ${width} ${height}" class="combo-chart-svg">${grid}<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height-padding.bottom}" class="chart-axis"></line><line x1="${padding.left}" y1="${height-padding.bottom}" x2="${width-padding.right}" y2="${height-padding.bottom}" class="chart-axis"></line>${axes}${bars}${labels}</svg>`;
  return renderScrollableChart(svg, width, height, 'bar-chart-scroller');
}

function computeStats(){
  const zoneRank = state.zones.map(zone => ({ zone, speciesCount: uniqueSpeciesInZone(zone.id), pointCount: state.points.filter(p=>p.zoneRef===zone.id).length })).sort((a,b)=>b.speciesCount-a.speciesCount || b.pointCount-a.pointCount);
  const countMap = key => {
    const map = new Map();
    state.points.forEach(point => getPhenologyEntries(point).forEach(entry => { const label = entry[key] || (key==='floweringState' ? entry.label : '') || t('notFilled'); map.set(label, (map.get(label)||0)+1); }));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]);
  };
  const sourceCounts = countMap('cultivatedStatus');
  const growthCounts = countMap('growthForm');
  const phenologyCounts = countMap('floweringState');
  const weekAdded = state.points.reduce((sum, point)=>sum + getPhenologyEntries(point).filter(entry => entry.surveyDate && daysBetween(entry.surveyDate, 7)).length, 0);
  const monthAdded = state.points.reduce((sum, point)=>sum + getPhenologyEntries(point).filter(entry => entry.surveyDate && daysBetween(entry.surveyDate, 31)).length, 0);
  return { zoneRank, sourceCounts, growthCounts, phenologyCounts, weekAdded, monthAdded };
}
function statsCategoryRows(category){
  const { zoneRank, sourceCounts, growthCounts, phenologyCounts, weekAdded, monthAdded } = computeStats();
  if(category==='zone') return zoneRank.map(item=>({ label: zoneDisplayName(item.zone), count:item.pointCount, pointCount:item.pointCount, speciesCount:item.speciesCount, percentage: state.points.length? Number((item.pointCount/state.points.length*100).toFixed(1)) : 0 }));
  const toRows = entries => {
    const total = entries.reduce((s,[,v])=>s+v,0) || 1;
    return entries.map(([label, value]) => ({ label, count:value, pointCount:value, speciesCount:value, percentage:Number((value/total*100).toFixed(1)) }));
  };
  if(category==='source') return toRows(sourceCounts);
  if(category==='growth') return toRows(growthCounts);
  if(category==='phenology') return toRows(phenologyCounts);
  if(category==='recent') return [
    { label:t('statsWeek'), count:weekAdded, pointCount:weekAdded, speciesCount:weekAdded, percentage: monthAdded?Number((weekAdded/(monthAdded||1)*100).toFixed(1)):0 },
    { label:t('statsMonth'), count:monthAdded, pointCount:monthAdded, speciesCount:monthAdded, percentage:100 }
  ];
  return [];
}
function metricLabel(metric){
  return t(metric==='count'?'statsMetricCount':metric==='pointCount'?'statsMetricPointCount':metric==='speciesCount'?'statsMetricSpeciesCount':metric==='weekAdded'?'statsMetricWeek':metric==='monthAdded'?'statsMetricMonth':'statsMetricPercentage');
}
function categoryLabel(category){
  return t(category==='zone'?'statsCategoryZone':category==='growth'?'statsCategoryGrowth':category==='source'?'statsCategorySource':category==='phenology'?'statsCategoryPhenology':'statsSectionRecent');
}
function chartPalette(count=6){
  const a=getThemeColor('chartA'), b=getThemeColor('chartB');
  const out=[]; const ah=hexToHsl(a), bh=hexToHsl(b);
  for(let i=0;i<count;i++){
    const frac=count===1?0:i/(count-1);
    const h=Math.round(ah.h + (bh.h-ah.h)*frac);
    const s=Math.round(ah.s + (bh.s-ah.s)*frac);
    const l=Math.round(ah.l + (bh.l-ah.l)*frac);
    out.push(hslToHex(h,s,l));
  }
  return out;
}
function niceTicks(maxValue, count=5){
  const max = Number(maxValue || 0);
  if(!Number.isFinite(max) || max <= 0) return [0,1,2,3,4,5];
  const rough = max / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const norm = rough / mag;
  let step = 1;
  if(norm > 5) step = 10; else if(norm > 2) step = 5; else if(norm > 1) step = 2;
  step *= mag;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for(let v=0; v<=top + step*0.001; v+=step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}
function renderScrollableChart(innerHtml, contentWidth, contentHeight, extraClass=''){
  return `<div class="chart-scroll-wrap ${extraClass}"><div class="chart-scroll-hint">拖动滚动条可查看完整图表</div><div class="chart-scroll-area"><div class="chart-scroll-inner" style="min-width:${Math.ceil(contentWidth)}px;min-height:${Math.ceil(contentHeight)}px">${innerHtml}</div></div></div>`;
}
function renderComboChart(rows, barMetric='count', lineMetric='percentage'){
  if(!rows.length) return `<div class="subtle">${escapeHtml(t('resultsEmpty'))}</div>`;
  const labels = rows.map(r => String(r.label || ''));
  const longest = labels.reduce((m, item)=>Math.max(m, item.length), 0);
  const perColumn = Math.max(120, Math.min(210, longest * 14));
  const width = Math.max(900, rows.length * perColumn + 180);
  const bottomPad = Math.max(118, 68 + longest * 7);
  const height = Math.max(380, 300 + Math.min(80, longest * 2));
  const padding = {left:76,right:72,top:28,bottom:bottomPad};
  const plotW = width-padding.left-padding.right, plotH = height-padding.top-padding.bottom;
  const maxBar = Math.max(1, ...rows.map(r => Number(r[barMetric]||0)));
  const maxLine = Math.max(1, ...rows.map(r => Number(r[lineMetric]||0)));
  const barTicks = niceTicks(maxBar, 5);
  const lineTicks = niceTicks(maxLine, 5);
  const barTop = Math.max(...barTicks);
  const lineTop = Math.max(...lineTicks);
  const colW = plotW / Math.max(1, rows.length);
  const palette = chartPalette(rows.length);
  let bars='', xlabels='', points='', linePath='', yLeftTicks='', yRightTicks='', axes='';
  const linePts=[];
  barTicks.forEach(v=>{
    const y = padding.top + plotH - (v/barTop)*plotH;
    yLeftTicks += `<g><line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width-padding.right}" y2="${y.toFixed(1)}" class="chart-grid"></line><line x1="${(padding.left-6).toFixed(1)}" y1="${y.toFixed(1)}" x2="${padding.left}" y2="${y.toFixed(1)}" class="chart-axis-tick"></line><text x="${(padding.left-10).toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="end" class="axis-tick-label">${escapeHtml(v)}</text></g>`;
  });
  lineTicks.forEach(v=>{
    const y = padding.top + plotH - (v/lineTop)*plotH;
    yRightTicks += `<g><line x1="${(width-padding.right).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(width-padding.right+6).toFixed(1)}" y2="${y.toFixed(1)}" class="chart-axis-tick"></line><text x="${(width-padding.right+10).toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="start" class="axis-tick-label">${escapeHtml(v)}</text></g>`;
  });
  rows.forEach((row, idx)=>{
    const cx = padding.left + idx*colW + colW/2;
    const x = padding.left + idx*colW + colW*0.2;
    const bw = Math.max(20, colW*0.45);
    const barVal = Number(row[barMetric]||0);
    const barH = plotH * (barVal/barTop);
    const y = padding.top + plotH - barH;
    bars += `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" rx="10" fill="${palette[idx%palette.length]}"></rect><text x="${(x+bw/2).toFixed(1)}" y="${(y-8).toFixed(1)}" text-anchor="middle" class="chart-value">${escapeHtml(barVal)}</text></g>`;
    const lineVal = Number(row[lineMetric]||0);
    const lx = padding.left + idx*colW + colW*0.66;
    const ly = padding.top + plotH - (lineVal/lineTop)*plotH;
    linePts.push([lx,ly,lineVal]);
    const label = escapeHtml(String(row.label || ''));
    xlabels += `<g transform="translate(${cx.toFixed(1)},${(height-padding.bottom+28).toFixed(1)}) rotate(-32)"><text text-anchor="end" class="axis-label axis-label-long">${label}</text></g>`;
    axes += `<line x1="${cx.toFixed(1)}" y1="${(height-padding.bottom).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(height-padding.bottom+6).toFixed(1)}" class="chart-axis-tick"></line>`;
  });
  linePath = linePts.map((pt, idx)=>`${idx===0?'M':'L'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
  points = linePts.map(pt=>`<g><circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="4.5" fill="var(--theme-accent-ui)"></circle><text x="${pt[0].toFixed(1)}" y="${(pt[1]-10).toFixed(1)}" text-anchor="middle" class="chart-line-value">${escapeHtml(Number(pt[2]).toFixed(barMetric===lineMetric?0:1))}</text></g>`).join('');
  const axisLines = `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height-padding.bottom}" class="chart-axis"></line><line x1="${padding.left}" y1="${height-padding.bottom}" x2="${width-padding.right}" y2="${height-padding.bottom}" class="chart-axis"></line><line x1="${width-padding.right}" y1="${padding.top}" x2="${width-padding.right}" y2="${height-padding.bottom}" class="chart-axis chart-axis-secondary"></line>`;
  const legend = `<div class="chart-legend-inline"><span><i class="legend-dot" style="background:var(--theme-chart-a)"></i>${escapeHtml(metricLabel(barMetric))}</span><span><i class="legend-dot" style="background:var(--theme-accent-ui)"></i>${escapeHtml(metricLabel(lineMetric))}</span></div>`;
  const svg = `<svg viewBox="0 0 ${width} ${height}" class="combo-chart-svg">${yLeftTicks}${yRightTicks}${axisLines}${axes}${bars}<path d="${linePath}" fill="none" stroke="var(--theme-accent-ui)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>${points}${xlabels}</svg>`;
  return `${legend}${renderScrollableChart(svg, width, height, 'combo-chart-scroller')}`;
}
function renderPieLike(entries, donut=false){
  const palette = chartPalette(entries.length||1);
  return `${donutSvgFromCounts(entries.length?entries:[[t('resultsEmpty'),0]], palette)}<div class="legend-grid">${renderMiniLegend(entries.length?entries:[[t('resultsEmpty'),0]], palette)}</div>`;
}
function renderStatControls(customOnly=false){
  ensureThemeSettings();
  const cfg = state.settings.statsCustom;
  const categoryOptions = ['zone','growth','source','phenology'].map(k=>`<option value="${k}" ${cfg.category===k?'selected':''}>${escapeHtml(categoryLabel(k))}</option>`).join('');
  const metricOptions = ['count','pointCount','speciesCount','percentage'].map(k=>`<option value="${k}">${escapeHtml(metricLabel(k))}</option>`).join('');
  const typeOptions = [['combo',t('statsChartCombo')],['bar',t('statsChartBar')],['line',t('statsChartLine')],['pie',t('statsChartPie')],['donut',t('statsChartDonut')]].map(([v,l])=>`<option value="${v}" ${cfg.chartType===v?'selected':''}>${escapeHtml(l)}</option>`).join('');
  return `<div class="stats-control-card ${customOnly?'stats-control-card-wide':''}"><div class="field"><label>${escapeHtml(t('statsCategory'))}</label><select id="statsCategorySelect" class="input">${categoryOptions}</select></div><div class="field"><label>${escapeHtml(t('statsBarMetric'))}</label><select id="statsBarMetricSelect" class="input">${metricOptions}</select></div><div class="field"><label>${escapeHtml(t('statsLineMetric'))}</label><select id="statsLineMetricSelect" class="input">${metricOptions}</select></div><div class="field"><label>${escapeHtml(t('statsChartType'))}</label><select id="statsChartTypeSelect" class="input">${typeOptions}</select></div></div>`;
}
function resolveMetricsForCategory(category){
  return category==='zone' ? ['speciesCount','pointCount','percentage'] : ['count','percentage'];
}
function bindStatsControlEvents(){
  ['statsCategorySelect','statsBarMetricSelect','statsLineMetricSelect','statsChartTypeSelect'].forEach(id=>{ const node=document.getElementById(id); if(node) node.addEventListener('change', async ()=>{ ensureThemeSettings(); const cfg=state.settings.statsCustom; cfg.category=document.getElementById('statsCategorySelect')?.value || cfg.category; const valid=resolveMetricsForCategory(cfg.category); cfg.barMetric=document.getElementById('statsBarMetricSelect')?.value || cfg.barMetric; cfg.lineMetric=document.getElementById('statsLineMetricSelect')?.value || cfg.lineMetric; cfg.chartType=document.getElementById('statsChartTypeSelect')?.value || cfg.chartType; if(!valid.includes(cfg.barMetric)) cfg.barMetric=valid[0]; if(!valid.includes(cfg.lineMetric)) cfg.lineMetric=valid[Math.min(1, valid.length-1)] || valid[0]; renderStatsModal(); await persistProject(); }); });
  const cat=document.getElementById('statsCategorySelect'); const bar=document.getElementById('statsBarMetricSelect'); const line=document.getElementById('statsLineMetricSelect');
  if(cat&&bar&&line){ const valid=resolveMetricsForCategory(cat.value); [bar,line].forEach(sel=>{ const current=sel.value; sel.innerHTML=valid.map(k=>`<option value="${k}" ${current===k?'selected':''}>${escapeHtml(metricLabel(k))}</option>`).join(''); if(!valid.includes(sel.value)) sel.value=valid[0]; }); }
}
function renderCustomChart(){
  ensureThemeSettings();
  const cfg=state.settings.statsCustom;
  const rows=statsCategoryRows(cfg.category);
  const entries=rows.map(r=>[r.label, Number(r[cfg.barMetric]||0)]);
  if(cfg.chartType==='combo') return `${renderStatControls(true)}<div class="subtle">${escapeHtml(t('statsComboHint'))}</div><div class="chart-card">${renderComboChart(rows, cfg.barMetric, cfg.lineMetric)}</div>`;
  if(cfg.chartType==='bar') return `${renderStatControls(true)}<div class="chart-card">${renderBarList(rows.map(r=>({label:r.label,value:r[cfg.barMetric]})), 'value', item=>item.label)}</div>`;
  if(cfg.chartType==='line') return `${renderStatControls(true)}<div class="chart-card">${renderComboChart(rows, cfg.lineMetric, cfg.lineMetric)}</div>`;
  return `${renderStatControls(true)}<div class="chart-card donut-card">${renderPieLike(entries, cfg.chartType==='donut')}</div>`;
}
function renderStatsModal(){
  if(!ui.statsModalBody) return;
  ensureThemeSettings();
  const { zoneRank, sourceCounts, growthCounts, phenologyCounts, weekAdded, monthAdded } = computeStats();
  const palette = chartPalette(8);
  const topZones = zoneRank.slice(0, 8);
  document.querySelectorAll('.stats-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === state.statsTab));
  if(state.statsTab === 'overview'){
    const rows = statsCategoryRows(state.settings.statsCustom.category || 'zone');
    const overviewEntries = rows.slice(0,6).map(item => [item.label, Number(item[state.settings.statsCustom.barMetric] || item.count || 0)]);
    ui.statsModalBody.innerHTML = `
      <div class="stats-summary-grid">
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsZones'))}</span><strong>${state.zones.length}</strong></div>
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsPoints'))}</span><strong>${state.points.length}</strong></div>
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsSpecies'))}</span><strong>${overallSpeciesCount()}</strong></div>
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsWeek'))}</span><strong>${weekAdded}</strong></div>
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsMonth'))}</span><strong>${monthAdded}</strong></div>
      </div>
      ${renderStatControls(false)}
      <div class="stats-two-col">
        <div class="chart-card"><h3>${escapeHtml(categoryLabel(state.settings.statsCustom.category || 'zone'))}</h3><p class="subtle">${escapeHtml(t('statsOverviewHint'))}</p>${renderComboChart(rows, state.settings.statsCustom.barMetric, state.settings.statsCustom.lineMetric)}</div>
        <div class="chart-card donut-card"><h3>${escapeHtml(metricLabel(state.settings.statsCustom.barMetric))}</h3>${renderPieLike(overviewEntries, true)}</div>
      </div>`;
      bindStatsControlEvents();
    return;
  }
  if(state.statsTab === 'zone'){
    ui.statsModalBody.innerHTML = `<div class="stats-two-col"><div class="chart-card"><h3>${escapeHtml(t('statsSectionZoneRank'))}</h3>${renderComboChart(topZones.map(item=>({label:zoneDisplayName(item.zone), speciesCount:item.speciesCount, pointCount:item.pointCount, percentage: state.points.length?Number((item.pointCount/state.points.length*100).toFixed(1)):0})), 'speciesCount', 'pointCount')}</div><div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionZoneRank'))}</h3>${renderPieLike(topZones.slice(0,5).map(item=>[zoneDisplayName(item.zone), item.speciesCount]), true)}</div></div>`;
    return;
  }
  if(state.statsTab === 'species'){
    const sourceEntries = sourceCounts.length?sourceCounts:[[t('resultsEmpty'),0]];
    const growthEntries = growthCounts.length?growthCounts:[[t('resultsEmpty'),0]];
    const phenologyEntries = phenologyCounts.length?phenologyCounts:[[t('resultsEmpty'),0]];
    ui.statsModalBody.innerHTML = `
      <div class="stats-three-col">
        <div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionSource'))}</h3>${renderPieLike(sourceEntries, true)}</div>
        <div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionGrowth'))}</h3>${renderPieLike(growthEntries, true)}</div>
        <div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionPhenology'))}</h3>${renderPieLike(phenologyEntries, true)}</div>
      </div>`;
    return;
  }
  if(state.statsTab === 'time'){
    ui.statsModalBody.innerHTML = `<div class="stats-two-col"><div class="chart-card"><h3>${escapeHtml(t('statsSectionRecent'))}</h3>${renderComboChart([{label:t('statsWeek'), count:weekAdded, percentage: monthAdded?Number((weekAdded/(monthAdded||1)*100).toFixed(1)):0},{label:t('statsMonth'), count:monthAdded, percentage:100}], 'count', 'percentage')}</div><div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionSource'))}</h3>${renderPieLike((sourceCounts.length?sourceCounts:[[t('resultsEmpty'),0]]), false)}</div></div>`;
    return;
  }
  ui.statsModalBody.innerHTML = renderCustomChart();
  bindStatsControlEvents();
}
function renderTrashList(){
  if(!ui.trashList) return;
  const trash = getRecycleBin();
  ui.trashCount.textContent = String(trash.length);
  ui.trashList.innerHTML = '';
  if(!trash.length){
    const empty=document.createElement('div'); empty.className='list-item'; empty.innerHTML=`<div class="title">${escapeHtml(t('trashEmpty'))}</div>`; ui.trashList.appendChild(empty); return;
  }
  trash.forEach(item => {
    const card=document.createElement('div'); card.className='list-item'; if(state.trashSelectedId===item.id) card.style.borderColor='#9d8f82';
    const typeLabel = item.type==='zone' ? t('itemTypeZone') : item.type==='point' ? t('itemTypePoint') : t('itemTypeImage');
    card.innerHTML=`<div class="title">${escapeHtml(item.label || typeLabel)}</div><div class="meta">${escapeHtml(typeLabel)} · ${escapeHtml(t('deletedAt'))} ${escapeHtml(formatDateTimeLabel(item.deletedAt))}</div>`;
    card.addEventListener('click', ()=>{ state.trashSelectedId=item.id; renderTrashList(); });
    ui.trashList.appendChild(card);
  });
}

function renderLists(){
  if(!ui.zoneListPanel || !ui.pointListPanel) return;
  ui.btnTabZones?.classList.toggle('active', state.activeListTab==='zones');
  ui.btnTabPoints?.classList.toggle('active', state.activeListTab==='points');
  ui.zoneListPanel.classList.toggle('hidden', state.activeListTab!=='zones');
  ui.pointListPanel.classList.toggle('hidden', state.activeListTab!=='points');
  ui.zoneListPanel.innerHTML='';
  ui.pointListPanel.innerHTML='';
  state.listSummaryCount && (ui.listSummaryCount.textContent = String(state.activeListTab==='zones' ? state.zones.length : state.points.length));
  state.zones.forEach(zone=>{
    const card=document.createElement('div'); card.className='list-item';
    card.innerHTML=`<div class="title">${escapeHtml(zoneDisplayName(zone))}</div><div class="meta">${escapeHtml(zone.zoneId||'')}</div>`;
    card.addEventListener('click', ()=>{ selectZone(zone.id); focusZoneOnMap(zone.id); });
    ui.zoneListPanel.appendChild(card);
  });
  state.points.forEach(point=>{
    const card=document.createElement('div'); card.className='list-item';
    card.innerHTML=`<div class="title">${escapeHtml(pointDisplayName(point))}</div><div class="meta">${escapeHtml(pointMeta(point)||point.pointId||'')}</div>`;
    card.addEventListener('click', ()=>{ selectPoint(point.id); focusPointOnMap(point.id); });
    ui.pointListPanel.appendChild(card);
  });
}

function renderAllDerived(){ renderCounters(); renderZonePointList(); renderLists(); renderStatsModal(); renderTrashList(); populateQueryFilters(); renderQueryResults(); updateStatusBar(); updatePointSummaryBox(); }
function basemapLabel(bm){ const lang=state.settings?.language||'zh'; const name=typeof bm.name==='string'?bm.name:(bm.name?.[lang]||bm.name?.zh||bm.id); return `${name}${bm.builtIn?` · ${t('builtIn')}`:''}`; }
function renderBaseMapSelect(){ if(!state.settings) return; ui.baseMapSelect.innerHTML=''; state.settings.baseMaps.forEach(bm=>{ const opt=document.createElement('option'); opt.value=bm.id; opt.textContent=basemapLabel(bm); ui.baseMapSelect.appendChild(opt); }); ui.baseMapSelect.value=state.settings.activeBaseMapId || state.settings.baseMaps[0]?.id || ''; }
function renderBasemapEditTargetSelect(){ if(!state.settings) return; ui.bmEditTarget.innerHTML=''; const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent='—'; ui.bmEditTarget.appendChild(placeholder); state.settings.baseMaps.forEach(bm=>{ const opt=document.createElement('option'); opt.value=bm.id; opt.textContent=basemapLabel(bm); ui.bmEditTarget.appendChild(opt); }); ui.bmEditTarget.value=state.currentBasemapEditId || ''; }
function createLeafletBaseLayer(bm){ if(!bm) return null; if(bm.type==='wms') return L.tileLayer.wms(bm.url, { layers:bm.layers||'', format:bm.format||'image/png', transparent:String(bm.transparent??true)==='true', attribution:bm.attribution||'', maxZoom:Number(bm.maxZoom||19) }); return L.tileLayer(bm.url, { attribution:bm.attribution||'', maxZoom:Number(bm.maxZoom||19), subdomains:(bm.subdomains||'').trim()? (bm.subdomains||'').split('') : undefined }); }
function fillBasemapForm(bm){ if(!bm) return; state.currentBasemapEditId=bm.id; ui.bmEditTarget.value=bm.id; ui.bmNameZh.value=typeof bm.name==='string'?bm.name:(bm.name?.zh||''); ui.bmNameEn.value=typeof bm.name==='string'?bm.name:(bm.name?.en||''); ui.bmType.value=bm.type||'xyz'; ui.bmUrl.value=bm.url||''; ui.bmAttribution.value=bm.attribution||''; ui.bmMaxZoom.value=bm.maxZoom||19; ui.bmSubdomains.value=bm.subdomains||''; ui.bmLayers.value=bm.layers||''; ui.bmFormat.value=bm.format||'image/png'; ui.bmTransparent.value=String(bm.transparent??true); }
function applyActiveBaseMap(){ if(!state.settings) return; if(state.currentBaseLayer) state.map.removeLayer(state.currentBaseLayer); const bm=state.settings.baseMaps.find(x=>x.id===state.settings.activeBaseMapId) || state.settings.baseMaps[0]; if(!bm) return; state.currentBaseLayer=createLeafletBaseLayer(bm); state.currentBaseLayer.addTo(state.map); renderBaseMapSelect(); renderBasemapEditTargetSelect(); const editing=state.settings.baseMaps.find(x=>x.id===state.currentBasemapEditId); if(editing) fillBasemapForm(editing); else fillBasemapForm(bm); }
function newBasemapForm(){ state.currentBasemapEditId=null; ui.bmEditTarget.value=''; ui.bmNameZh.value=''; ui.bmNameEn.value=''; ui.bmType.value='xyz'; ui.bmUrl.value=''; ui.bmAttribution.value=''; ui.bmMaxZoom.value=19; ui.bmSubdomains.value=''; ui.bmLayers.value=''; ui.bmFormat.value='image/png'; ui.bmTransparent.value='true'; }
async function saveBasemap(){ const id=state.currentBasemapEditId || `bm_${Date.now()}`; const existing=state.settings.baseMaps.find(b=>b.id===id); const bm={ id, name:{ zh:ui.bmNameZh.value.trim(), en:ui.bmNameEn.value.trim()||ui.bmNameZh.value.trim() }, type:ui.bmType.value, url:ui.bmUrl.value.trim(), attribution:ui.bmAttribution.value.trim(), maxZoom:Number(ui.bmMaxZoom.value||19), subdomains:ui.bmSubdomains.value.trim(), layers:ui.bmLayers.value.trim(), format:ui.bmFormat.value.trim()||'image/png', transparent:ui.bmTransparent.value, builtIn:existing?.builtIn||false }; if(!bm.url) return; if(existing) Object.assign(existing,bm); else { state.settings.baseMaps.push(bm); state.settings.activeBaseMapId=bm.id; } state.currentBasemapEditId=id; renderBasemapEditTargetSelect(); applyActiveBaseMap(); await persistProject(); toast(t('basemapSaved')); }
async function deleteBasemap(){ const bm=state.settings.baseMaps.find(b=>b.id===state.currentBasemapEditId); if(!bm) return; if(bm.builtIn) return alert(t('cannotDeleteBuiltin')); state.settings.baseMaps=state.settings.baseMaps.filter(b=>b.id!==bm.id); if(state.settings.activeBaseMapId===bm.id){ state.settings.activeBaseMapId=state.settings.baseMaps[0]?.id||null; } newBasemapForm(); applyActiveBaseMap(); await persistProject(); toast(t('basemapDeleted')); }


function ensureZoneForImport(zoneId, zoneName='') {
  let zone = state.zones.find(z => (zoneId && z.zoneId === zoneId) || (!zoneId && zoneName && z.name === zoneName));
  if (zone) return zone;
  zone = { id: `zone_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, zoneId: zoneId || `Z${String(state.zones.length+1).padStart(3,'0')}`, name: zoneName || zoneId || t('unnamedZone'), description: '', geometry: null };
  state.zones.push(zone);
  return zone;
}

function createImportedPoint(record) {
  const point = normalizePointRecord({
    id: `point_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    pointId: record.pointId || `P${String(state.points.length+1).padStart(3,'0')}`,
    zoneRef: record.zoneRef,
    lng: Number(record.lng || 0),
    lat: Number(record.lat || 0),
    plantNameCn: record.plantNameCn || '',
    plantNameSci: record.plantNameSci || '',
    phenologyEntries: [makePhenologyEntry({
      label: mapLegacyPhenology(record.floweringState),
      floweringState: record.floweringState,
      observer: record.observer || '', surveyDate: record.surveyDate || '', habitat: record.habitat || '', abundance: record.abundance || '', growthForm: record.growthForm || '', cultivatedStatus: record.cultivatedStatus || '', note: record.note || '', images: Array.isArray(record.images) ? record.images : String(record.images || '').split(/\s*;\s*/).filter(Boolean)
    })]
  });
  state.points.push(point); addPointLayer(point); return point;
}

function parseCsvText(text) {
  const clean = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { cell += '"'; i++; } else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      row.push(cell); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some(v => String(v).trim() !== '')) rows.push(row);
      row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some(v => String(v).trim() !== '')) rows.push(row);
  return rows;
}

function normalizeCsvImportRows(text) {
  const rows = parseCsvText(text);
  if (!rows.length) return [];
  const header = rows[0].map(v => String(v).trim());
  const map = { '分区编号':'zoneId', '分区名称':'zoneName', '点位编号':'pointId', '中文名':'plantNameCn', '学名':'plantNameSci', '记录者':'observer', '调查日期':'surveyDate', '微生境':'habitat', '多度/数量':'abundance', '生活型':'growthForm', '物候状态':'floweringState', '来源属性':'cultivatedStatus', '备注':'note', '图片文件':'images', '经度':'lng', '纬度':'lat' };
  return rows.slice(1).map(r => {
    const obj = {};
    header.forEach((h, idx) => obj[map[h] || h] = r[idx] ?? '');
    return obj;
  }).filter(r => r.zoneId || r.zoneName || r.pointId || r.plantNameCn || r.plantNameSci);
}

async function importRecordsCSV(){
  if(!state.projectDir) return alert(t('noProject'));
  const res = await window.plantApp.openDataFile({ title:t('importCsv'), filters:[{name:'CSV', extensions:['csv']}] });
  if(res.canceled) return;
  try {
    await autoBackupProjects([state.projectDir], 'import_csv');
    const text = await window.plantApp.readTextFile({ filePath: res.filePath });
    const records = normalizeCsvImportRows(text);
    records.forEach(record => {
      const zone = ensureZoneForImport(record.zoneId, record.zoneName);
      if (!state.zoneLayers.has(zone.id) && zone.geometry) addZoneLayer(zone);
      createImportedPoint({ ...record, zoneRef: zone.id });
    });
    renderAllDerived();
    await persistProject();
    alert(t('importSuccess'));
  } catch (err) {
    console.error(err);
    alert(`${t('importFailed')} ${err.message || err}`);
  }
}

async function importGeoJSON(){
  if(!state.projectDir) return alert(t('noProject'));
  const res = await window.plantApp.openDataFile({ title:t('importGeoJSON'), filters:[{name:'GeoJSON', extensions:['geojson','json']}] });
  if(res.canceled) return;
  try {
    await autoBackupProjects([state.projectDir], 'import_geojson');
    const text = await window.plantApp.readTextFile({ filePath: res.filePath });
    const geo = JSON.parse(text);
    const features = Array.isArray(geo.features) ? geo.features : [];
    features.forEach(f => {
      if (f?.geometry?.type !== 'Point') return;
      const p = f.properties || {};
      const zone = ensureZoneForImport(p.zoneId, p.zoneName);
      const [lng, lat] = f.geometry.coordinates || [0,0];
      createImportedPoint({ ...p, lng, lat, zoneRef: zone.id });
    });
    renderAllDerived();
    await persistProject();
    alert(t('importSuccess'));
  } catch (err) {
    console.error(err);
    alert(`${t('importFailed')} ${err.message || err}`);
  }
}

function exportCsvString(){
  const rows = state.points.flatMap(point => {
    const zone = state.zones.find(z=>z.id===point.zoneRef);
    return getPhenologyEntries(point).map(entry => ({
      zoneId: zone?.zoneId || '', zoneName: zoneDisplayName(zone), pointId: point.pointId || '', plantNameCn: point.plantNameCn || '', plantNameSci: point.plantNameSci || '',
      observer: entry.observer || '', surveyDate: entry.surveyDate || '', habitat: entry.habitat || '', abundance: entry.abundance || '', growthForm: entry.growthForm || '', floweringState: entry.floweringState || entry.label || '', cultivatedStatus: entry.cultivatedStatus || '', note: entry.note || '', images: (entry.images||[]).join('; '), lng: point.lng, lat: point.lat
    }));
  });
  const headers = EXPORT_COLUMNS_ZH.map(([key])=>key);
  const labels = EXPORT_COLUMNS_ZH.map(([,label])=>label);
  const esc = (v)=> `"${String(v??'').replaceAll('"','""')}"`;
  return [labels.join(','), ...rows.map(r=>headers.map(h=>esc(r[h])).join(','))] .join('\n');
}
function exportGeoJSONString(){
  const features = state.points.flatMap(point => {
    const zone = state.zones.find(z=>z.id===point.zoneRef);
    return getPhenologyEntries(point).map(entry => ({ type:'Feature', geometry:{type:'Point', coordinates:[point.lng, point.lat]}, properties:{ zoneId: zone?.zoneId || '', zoneName: zoneDisplayName(zone), pointId: point.pointId || '', plantNameCn: point.plantNameCn || '', plantNameSci: point.plantNameSci || '', observer: entry.observer || '', surveyDate: entry.surveyDate || '', habitat: entry.habitat || '', abundance: entry.abundance || '', growthForm: entry.growthForm || '', floweringState: entry.floweringState || entry.label || '', cultivatedStatus: entry.cultivatedStatus || '', note: entry.note || '', images: entry.images || [] } }));
  });
  return JSON.stringify({ type:'FeatureCollection', features }, null, 2);
}
async function exportRecordsCSV(){ if(!state.projectDir) return alert(t('noProject')); const res = await window.plantApp.saveFileDialog({ title:t('exportCsv'), defaultPath:'plant_records.csv', filters:[{name:'CSV', extensions:['csv']}] }); if(res.canceled) return; await window.plantApp.writeTextFile({ filePath: res.filePath, content: '﻿'+exportCsvString() }); alert(t('exportSuccess')); }
async function exportGeoJSON(){ if(!state.projectDir) return alert(t('noProject')); const res = await window.plantApp.saveFileDialog({ title:t('exportGeoJSON'), defaultPath:'plant_points.geojson', filters:[{name:'GeoJSON', extensions:['geojson','json']}] }); if(res.canceled) return; await window.plantApp.writeTextFile({ filePath: res.filePath, content: exportGeoJSONString() }); alert(t('exportSuccess')); }

// Persist the current in-memory project state to the selected project directory.
async function persistProject(){ if(!state.projectDir || !state.settings) return; state.settings.mapCenter=[state.map.getCenter().lat,state.map.getCenter().lng]; state.settings.mapZoom=state.map.getZoom(); await window.plantApp.saveProject({ projectDir:state.projectDir, settings:state.settings, zones:state.zones, points:state.points }); }
function clearAllLayers(){ state.zoneLayers.forEach(layer=>state.map.removeLayer(layer)); state.zoneLayers.clear(); state.pointLayers.forEach(layer=>state.map.removeLayer(layer)); state.pointLayers.clear(); clearPendingPoint(); }
async function loadProject(dir){ const data=await window.plantApp.loadProject(dir); state.projectDir=data.projectDir; state.projectModifiedTime = data.projectModifiedTime || Date.now(); state.settings=ensureSettingsShape(data.settings); applyThemeVariables(); state.zones=(data.zones||[]).map(normalizeZoneRecord); state.points=(data.points||[]).map(p=>normalizePointRecord({observer:'',surveyDate:'',habitat:'',abundance:'',growthForm:'',floweringState:'',cultivatedStatus:'',...p})); ui.projectPath.textContent=data.projectDir; clearAllLayers(); if(state.settings.mapCenter) state.map.setView(state.settings.mapCenter, state.settings.mapZoom||17); applyI18n(); applyActiveBaseMap(); state.zones.filter(z=>z.geometry).forEach(addZoneLayer); state.points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).forEach(addPointLayer); selectZone(null); renderAllDerived(); requestAnimationFrame(()=>{ state.map.invalidateSize(); fitMapToProjectData(); }); await maybeHandleExpiredBackups(data.projectDir); toast(t('projectCreated')); }
function applyI18n(){ applyThemeVariables(); document.querySelectorAll('[data-i18n]').forEach(node=>{ const key=node.getAttribute('data-i18n'); if(node.tagName==='INPUT' && node.placeholder!==undefined) node.placeholder=t(key); else node.textContent=t(key); }); if(ui.queryText) ui.queryText.placeholder=t('searchPlaceholder'); document.querySelectorAll('.seg-btn[data-lang]').forEach(btn=>btn.classList.toggle('active', btn.dataset.lang===(state.settings?.language||'zh'))); renderBaseMapSelect(); renderBasemapEditTargetSelect(); renderAllDerived(); }

function removePointLayer(pointId){
  const marker = state.pointLayers.get(pointId);
  if(marker){ state.map.removeLayer(marker); state.pointLayers.delete(pointId); }
}
function removeZoneLayer(zoneId){
  const layer = state.zoneLayers.get(zoneId);
  if(layer){ state.map.removeLayer(layer); state.zoneLayers.delete(zoneId); }
}
function softDeletePointById(pointId){
  const point = state.points.find(p=>p.id===pointId); if(!point) return false;
  pushToRecycleBin(buildTrashItem('point', pointDisplayName(point), { point: structuredClone(point) }));
  removePointLayer(point.id);
  state.points = state.points.filter(p=>p.id!==point.id);
  if(state.selectedPointId===point.id) state.selectedPointId=null;
  if(ui.pointId.dataset.targetId===point.id) clearPointForm();
  state.map.closePopup();
  populatePointForm();
  renderAllDerived();
  updateStatusBar();
  return true;
}
async function deleteCurrentPoint(){
  const point=getSelectedPoint(); if(!point) return alert(t('noPointSelected'));
  const ok = await openConfirmDialog({ title:t('confirmDeletePointTitle'), message:t('confirmDeletePoint') });
  if(!ok) return;
  if(softDeletePointById(point.id)) await persistProject();
}
async function deleteCurrentZone(){
  const zone=getEditableZone(); if(!zone) return alert(t('noZoneSelected'));
  const ok = await openConfirmDialog({ title:t('confirmDeleteZoneTitle'), message:t('confirmDeleteZone') });
  if(!ok) return;
  const linkedPoints = state.points.filter(p=>p.zoneRef===zone.id).map(p=>structuredClone(p));
  pushToRecycleBin(buildTrashItem('zone', zoneDisplayName(zone), { zone: structuredClone(zone), points: linkedPoints }));
  linkedPoints.forEach(p => removePointLayer(p.id));
  state.points = state.points.filter(p=>p.zoneRef!==zone.id);
  removeZoneLayer(zone.id);
  state.zones = state.zones.filter(z=>z.id!==zone.id);
  if(state.selectedZoneId===zone.id) state.selectedZoneId=null;
  if(linkedPoints.some(p=>p.id===state.selectedPointId)) state.selectedPointId=null;
  clearZoneForm();
  clearPointForm();
  renderAllDerived();
  setMode('browse');
  await persistProject();
}
async function restoreSelectedTrash(){
  const item = getTrashSelection(); if(!item) return;
  const trash = getRecycleBin();
  if(item.type==='zone'){
    const zone = item.payload?.zone; const points = item.payload?.points || [];
    if(zone && !state.zones.some(z=>z.id===zone.id)) { state.zones.push(zone); addZoneLayer(zone); }
    points.forEach(point => {
      if(!state.points.some(p=>p.id===point.id)) { state.points.push(normalizePointRecord(point)); addPointLayer(point); }
    });
  } else if(item.type==='point'){
    const point = item.payload?.point;
    if(point && !state.points.some(p=>p.id===point.id)) { state.points.push(normalizePointRecord(point)); addPointLayer(point); }
  } else if(item.type==='image'){
    const { pointId, phenologyId, relativePath } = item.payload || {};
    const point = state.points.find(p=>p.id===pointId);
    const entry = point ? (getPhenologyEntries(point).find(item=>item.id===phenologyId) || getPhenologyEntries(point)[0]) : null;
    if(point && entry && relativePath && !(entry.images||[]).includes(relativePath)) {
      entry.images = entry.images || []; entry.images.push(relativePath);
      syncPointSummary(point);
      if(state.selectedPointId===point.id) renderImageList(entry.images);
      updatePointTooltip(point);
    }
  }
  state.settings.recycleBin = trash.filter(entry=>entry.id!==item.id);
  state.trashSelectedId='';
  renderAllDerived();
  await persistProject();
}
async function deleteTrashForever(){ 
  const item = getTrashSelection(); if(!item) return;
  const ok = await openConfirmDialog({ title:t('confirmDeleteForeverTitle'), message:t('deleteForeverSelected') });
  if(!ok) return;
  if(item.type==='image' && item.payload?.relativePath){
    await window.plantApp.deleteImage({ projectDir: state.projectDir, relativePath: item.payload.relativePath });
  }
  state.settings.recycleBin = getRecycleBin().filter(entry=>entry.id!==item.id);
  state.trashSelectedId='';
  renderAllDerived();
  await persistProject();
}

// Image preview supports wheel zoom, drag-to-pan after zoom, double-click reset, and previous/next navigation.
// Image preview supports wheel zoom, drag-to-pan after zoom, double-click reset, and previous/next navigation.
function applyImagePreviewTransform(){
  ui.imagePreviewFull.style.transform = `translate(${state.imagePreviewTranslateX}px, ${state.imagePreviewTranslateY}px) scale(${state.imagePreviewScale})`;
  ui.imagePreviewZoom.textContent = `${state.imagePreviewScale.toFixed(1)}×`;
  ui.imagePreviewFull.style.cursor = state.imagePreviewScale > 1 ? (state.imagePreviewDragging ? 'grabbing' : 'grab') : 'zoom-in';
}
function updatePreviewNavButtons(){
  const many = state.currentPreviewImages.length > 1;
  ui.btnImagePrev.disabled = !many || state.currentPreviewIndex <= 0;
  ui.btnImageNext.disabled = !many || state.currentPreviewIndex >= state.currentPreviewImages.length - 1;
}
function setPreviewImageByIndex(index){
  if(!state.currentPreviewImages.length) return;
  state.currentPreviewIndex = Math.max(0, Math.min(index, state.currentPreviewImages.length - 1));
  ui.imagePreviewFull.src = state.currentPreviewImages[state.currentPreviewIndex];
  updatePreviewNavButtons();
}
function resetImagePreviewView(){
  state.imagePreviewScale = 1;
  state.imagePreviewTranslateX = 0;
  state.imagePreviewTranslateY = 0;
  applyImagePreviewTransform();
}
function updateImagePreviewZoom(scale, originX='50%', originY='50%'){
  const next = Math.min(10, Math.max(1, Number(scale) || 1));
  state.imagePreviewScale = next;
  ui.imagePreviewFull.style.transformOrigin = `${originX} ${originY}`;
  if (next === 1) {
    state.imagePreviewTranslateX = 0;
    state.imagePreviewTranslateY = 0;
  }
  applyImagePreviewTransform();
}
function openImagePreview(src, caption='', imageSet=[]){
  const normalized = Array.isArray(imageSet) && imageSet.length ? imageSet : [src];
  state.currentPreviewImages = normalized;
  state.currentPreviewIndex = Math.max(0, normalized.indexOf(src));
  ui.imagePreviewCaption.textContent = caption||t('imagePreview');
  ui.imagePreviewModal.classList.remove('hidden');
  setPreviewImageByIndex(state.currentPreviewIndex);
  resetImagePreviewView();
}
function closeImagePreview(){
  ui.imagePreviewModal.classList.add('hidden');
  ui.imagePreviewFull.src='';
  state.currentPreviewImages = [];
  state.currentPreviewIndex = 0;
  resetImagePreviewView();
}
function handleImagePreviewWheel(e){
  if (ui.imagePreviewModal.classList.contains('hidden')) return;
  e.preventDefault();
  const rect = ui.imagePreviewFull.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ox = `${((e.clientX - rect.left) / rect.width * 100).toFixed(2)}%`;
  const oy = `${((e.clientY - rect.top) / rect.height * 100).toFixed(2)}%`;
  const delta = e.deltaY < 0 ? 0.2 : -0.2;
  updateImagePreviewZoom(state.imagePreviewScale + delta, ox, oy);
}
function handleImagePreviewPointerDown(e){
  if (state.imagePreviewScale <= 1) return;
  e.preventDefault();
  state.imagePreviewDragging = true;
  state.imagePreviewDragStart = { x: e.clientX, y: e.clientY, tx: state.imagePreviewTranslateX, ty: state.imagePreviewTranslateY };
  applyImagePreviewTransform();
}
function handleImagePreviewPointerMove(e){
  if (!state.imagePreviewDragging || !state.imagePreviewDragStart) return;
  state.imagePreviewTranslateX = state.imagePreviewDragStart.tx + (e.clientX - state.imagePreviewDragStart.x);
  state.imagePreviewTranslateY = state.imagePreviewDragStart.ty + (e.clientY - state.imagePreviewDragStart.y);
  applyImagePreviewTransform();
}
function handleImagePreviewPointerUp(){
  state.imagePreviewDragging = false;
  state.imagePreviewDragStart = null;
  applyImagePreviewTransform();
}
function showPreviousPreviewImage(){
  if(state.currentPreviewIndex > 0){
    setPreviewImageByIndex(state.currentPreviewIndex - 1);
    resetImagePreviewView();
  }
}
function showNextPreviewImage(){
  if(state.currentPreviewIndex < state.currentPreviewImages.length - 1){
    setPreviewImageByIndex(state.currentPreviewIndex + 1);
    resetImagePreviewView();
  }
}


function openPointEditor(){
  const point=getSelectedPoint();
  if(!point) return alert(t('noPointSelected'));
  populatePointForm();
  openLayerModal(ui.pointEditorModal);
}
function closePointEditor(){ closeLayerModal(ui.pointEditorModal); }

function renderPresetPalette(container, colors){
  if(!container) return;
  container.innerHTML='';
  colors.forEach(color=>{
    const btn=document.createElement('button'); btn.type='button'; btn.className='preset-swatch'; btn.style.background=color; btn.addEventListener('click', ()=>{ setThemeColor(state.themeSlot, color); syncThemeControls(); }); container.appendChild(btn);
  });
}
function syncThemeControls(){
  const color=getThemeColor(state.themeSlot); const hsl=hexToHsl(color);
  if(ui.themeHue) ui.themeHue.value=hsl.h;
  if(ui.themeSaturation) ui.themeSaturation.value=hsl.s;
  if(ui.themePreviewSwatch) ui.themePreviewSwatch.style.background=color;
  document.querySelectorAll('.theme-slot-btn').forEach(btn=>btn.classList.toggle('active', btn.dataset.slot===state.themeSlot));
}
function openThemeCenter(){ ensureThemeSettings(); renderPresetPalette(ui.themeMorandiPresets, MORANDI_PRESETS); renderPresetPalette(ui.themeMacaronPresets, MACARON_PRESETS); syncThemeControls(); openLayerModal(ui.themeModal); }
function openSmallPrompt(title, initial=''){
  ui.smallPromptTitle.textContent = title;
  ui.smallPromptInput.value = initial;
  openLayerModal(ui.smallPromptModal);
  ui.smallPromptInput.focus();
  return new Promise(resolve => { state.promptResolver = resolve; });
}
function settleSmallPrompt(value){ closeLayerModal(ui.smallPromptModal); if(state.promptResolver) state.promptResolver(value); state.promptResolver = null; }
async function addPhenologyEntry(){
  const point=getSelectedPoint(); if(!point) return alert(t('noPointSelected'));
  const value = await openSmallPrompt(t('addPhenologyPrompt'));
  if(!value) return;
  const label = mapLegacyPhenology(String(value).trim());
  const entry = makePhenologyEntry({ label, floweringState: label });
  point.phenologyEntries.push(entry);
  state.selectedPhenologyId = entry.id;
  syncPointSummary(point); populatePointForm(); renderAllDerived(); await persistProject();
}
async function deletePhenologyEntry(){
  const point=getSelectedPoint(); const entry=getSelectedPhenologyEntry(point); if(!point||!entry) return alert(t('noPhenologySelected'));
  if(point.phenologyEntries.length<=1){
    point.phenologyEntries[0] = makePhenologyEntry({ label:'不明', floweringState:'不明' });
    state.selectedPhenologyId = point.phenologyEntries[0].id;
    syncPointSummary(point); populatePointForm(); renderAllDerived(); await persistProject();
    return;
  }
  const ok = await openConfirmDialog({ title:t('deletePhenology'), message:t('deletePhenologyPrompt') });
  if(!ok) return;
  point.phenologyEntries = point.phenologyEntries.filter(item => item.id !== entry.id);
  state.selectedPhenologyId = point.phenologyEntries[0]?.id || '';
  syncPointSummary(point); populatePointForm(); renderAllDerived(); await persistProject();
}

function bindEvents(){
  ui.btnChooseDir.addEventListener('click', async ()=>{ const res=await window.plantApp.chooseProjectDir(); if(res.canceled) return; await loadProject(res.projectDir); });
  ui.btnModeBrowse.addEventListener('click',()=>setMode('browse'));
  ui.btnModeDrawZone.addEventListener('click',()=>{ if(!state.projectDir) return alert(t('noProject')); if(state.pendingPoint) return alert(t('pendingPointBlocked')); setMode('drawZone'); });
  ui.btnModeAddPoint.addEventListener('click',()=>{ if(!state.projectDir) return alert(t('noProject')); if(!getSelectedZone()) return alert(t('chooseZoneThenAddPoint')); setMode('addPoint'); });
  ui.btnConfirmPoint.addEventListener('click',confirmPendingPoint);
  ui.btnCancelPoint.addEventListener('click',cancelPendingPoint);
  ui.btnDeleteZone.addEventListener('click',deleteCurrentZone);
  ui.btnDeletePoint.addEventListener('click',deleteCurrentPoint);
  ui.btnSave.addEventListener('click', async ()=>{ await persistProject(); alert(t('saveSuccess')); });
  ui.btnApplyZone.addEventListener('click',applyZoneInfo);
  ui.btnApplyPoint.addEventListener('click',applyPointInfo);
  ui.btnChooseImage.addEventListener('click',chooseAndImportImage);
  ui.baseMapSelect.addEventListener('change', async ()=>{ state.settings.activeBaseMapId=ui.baseMapSelect.value; applyActiveBaseMap(); await persistProject(); });
  ui.bmEditTarget.addEventListener('change', ()=>{ const bm=state.settings?.baseMaps.find(b=>b.id===ui.bmEditTarget.value); if(bm) fillBasemapForm(bm); else newBasemapForm(); });
  ui.btnToggleBasemapEditor.addEventListener('click',()=>{ ui.basemapEditor.classList.toggle('hidden'); if(!ui.basemapEditor.classList.contains('hidden')){ renderBasemapEditTargetSelect(); const editing=state.settings?.baseMaps.find(b=>b.id===state.currentBasemapEditId)||state.settings?.baseMaps.find(b=>b.id===state.settings.activeBaseMapId); if(editing) fillBasemapForm(editing); } });
  ui.btnNewBaseMap.addEventListener('click',newBasemapForm);
  ui.btnSaveBaseMap.addEventListener('click',saveBasemap);
  ui.btnDeleteBaseMap.addEventListener('click',deleteBasemap);
  document.querySelectorAll('.seg-btn[data-lang]').forEach(btn=>btn.addEventListener('click', async ()=>{ if(!state.settings) return; state.settings.language=btn.dataset.lang; applyI18n(); await persistProject(); }));
  ui.btnTabZones.addEventListener('click',()=>{ state.activeListTab='zones'; renderLists(); });
  ui.btnTabPoints.addEventListener('click',()=>{ state.activeListTab='points'; renderLists(); });
  ui.btnExportCsv.addEventListener('click',exportRecordsCSV);
  ui.btnExportGeoJSON.addEventListener('click',exportGeoJSON);
  ui.btnImportCsv.addEventListener('click',importRecordsCSV);
  ui.btnImportGeoJSON.addEventListener('click',importGeoJSON);

  ui.btnOpenStats.addEventListener('click', ()=>{ state.statsTab='overview'; renderStatsModal(); openLayerModal(ui.statsModal); });
  ui.btnCloseStatsModal.addEventListener('click', ()=> closeLayerModal(ui.statsModal));
  ui.statsModal.querySelector('.layer-modal-backdrop').addEventListener('click', ()=> closeLayerModal(ui.statsModal));
  document.querySelectorAll('.stats-tab').forEach(btn => btn.addEventListener('click', ()=>{ state.statsTab = btn.dataset.tab; renderStatsModal(); }));

  ui.btnOpenQuery.addEventListener('click', ()=>{ populateQueryFilters(); renderQueryResults(); openLayerModal(ui.queryModal); ui.queryText.focus(); });
  ui.btnCloseQueryModal.addEventListener('click', ()=> closeLayerModal(ui.queryModal));
  ui.queryModal.querySelector('.layer-modal-backdrop').addEventListener('click', ()=> closeLayerModal(ui.queryModal));
  [ui.queryText, ui.queryZone, ui.queryGrowthForm, ui.queryFloweringState, ui.queryCultivatedStatus, ui.queryHabitat, ui.queryObserver, ui.queryDateStart, ui.queryDateEnd].forEach(node => node && node.addEventListener('input', renderQueryResults));
  ui.queryZone?.addEventListener('change', renderQueryResults);
  ui.btnRunQuery.addEventListener('click', renderQueryResults);
  ui.btnResetQuery.addEventListener('click', ()=>{ ui.queryText.value=''; ui.queryZone.value=''; ui.queryGrowthForm.value=''; ui.queryFloweringState.value=''; ui.queryCultivatedStatus.value=''; ui.queryHabitat.value=''; ui.queryObserver.value=''; ui.queryDateStart.value=''; ui.queryDateEnd.value=''; renderQueryResults(); });

  ui.btnOpenTrash.addEventListener('click', ()=>{ renderTrashList(); openLayerModal(ui.trashModal); });
  ui.btnOpenTheme?.addEventListener('click', ()=> openThemeCenter());
  ui.btnOpenMerge?.addEventListener('click', ()=> openMergeCenter());
  ui.btnBackupProject?.addEventListener('click', ()=> openBackupCenter());
  ui.btnOpenPointEditor?.addEventListener('click', openPointEditor);
  ui.btnOpenPointEditorInline?.addEventListener('click', openPointEditor);
  ui.btnClosePointEditorModal?.addEventListener('click', closePointEditor);
  ui.pointEditorModal?.querySelector('.layer-modal-backdrop')?.addEventListener('click', closePointEditor);
  ui.btnAddPhenology?.addEventListener('click', addPhenologyEntry);
  ui.btnDeletePhenology?.addEventListener('click', deletePhenologyEntry);
  ui.btnCloseTrashModal.addEventListener('click', ()=> closeLayerModal(ui.trashModal));
  ui.btnCloseThemeModal?.addEventListener('click', ()=> closeLayerModal(ui.themeModal));
  ui.trashModal.querySelector('.layer-modal-backdrop').addEventListener('click', ()=> closeLayerModal(ui.trashModal));
  ui.themeModal?.querySelector('.layer-modal-backdrop')?.addEventListener('click', ()=> closeLayerModal(ui.themeModal));
  document.querySelectorAll('.theme-slot-btn').forEach(btn=>btn.addEventListener('click', ()=>{ state.themeSlot=btn.dataset.slot; syncThemeControls(); }));
  ui.themeHue?.addEventListener('input', ()=>{ const h=Number(ui.themeHue.value||0); const s=Number(ui.themeSaturation.value||0); const l=hexToHsl(getThemeColor(state.themeSlot)).l; setThemeColor(state.themeSlot, hslToHex(h,s,l)); syncThemeControls(); });
  ui.themeSaturation?.addEventListener('input', ()=>{ const h=Number(ui.themeHue.value||0); const s=Number(ui.themeSaturation.value||0); const l=hexToHsl(getThemeColor(state.themeSlot)).l; setThemeColor(state.themeSlot, hslToHex(h,s,l)); syncThemeControls(); });
  ui.btnResetThemeSlot?.addEventListener('click', ()=>{ setThemeColor(state.themeSlot, THEME_DEFAULTS[state.themeSlot]||'#93a4b4'); syncThemeControls(); });
  ui.btnResetThemeAll?.addEventListener('click', ()=>{ state.settings.uiTheme={...THEME_DEFAULTS}; applyThemeVariables(); syncThemeControls(); });
  ui.btnSaveTheme?.addEventListener('click', async ()=>{ applyThemeVariables(); await persistProject(); closeLayerModal(ui.themeModal); });
  ui.btnRestoreTrash.addEventListener('click', restoreSelectedTrash);
  ui.btnDeleteTrashForever.addEventListener('click', deleteTrashForever);

  ui.btnCloseMergeModal?.addEventListener('click', ()=> closeLayerModal(ui.mergeModal));
  ui.mergeModal?.querySelector('.layer-modal-backdrop')?.addEventListener('click', ()=> closeLayerModal(ui.mergeModal));
  ui.btnChooseMergeBase?.addEventListener('click', async ()=>{ state.mergeBaseDir = await chooseDirectory(t('chooseBaseProject')) || state.mergeBaseDir; updateMergePaths(); });
  ui.btnChooseMergeOther?.addEventListener('click', async ()=>{ state.mergeOtherDir = await chooseDirectory(t('chooseOtherProject')) || state.mergeOtherDir; updateMergePaths(); });
  ui.btnRunMerge?.addEventListener('click', runMergeFlow);
  ui.btnCloseMergeReviewModal?.addEventListener('click', ()=> settleMergeReview(null));
  ui.mergeReviewModal?.querySelector('.layer-modal-backdrop')?.addEventListener('click', ()=> settleMergeReview(null));
  ui.btnMergeReviewCancel?.addEventListener('click', ()=> settleMergeReview(null));
  ui.btnMergeReviewApply?.addEventListener('click', ()=>{ const mergeIdxs=[...ui.mergeReviewList.querySelectorAll('input[type=checkbox][data-idx]:checked')].map(node=>Number(node.dataset.idx)); settleMergeReview({ mergeIdxs }); });

  ui.btnCloseBackupModal?.addEventListener('click', ()=> closeLayerModal(ui.backupModal));
  ui.backupModal?.querySelector('.layer-modal-backdrop')?.addEventListener('click', ()=> closeLayerModal(ui.backupModal));
  ui.btnChooseBackupTarget?.addEventListener('click', async ()=>{ state.backupTargetDir = await chooseDirectory(t('chooseBackupTarget')) || state.backupTargetDir; updateBackupPaths(); });
  ui.btnRunManualBackup?.addEventListener('click', runManualBackup);

  ui.btnConfirmCancel.addEventListener('click', ()=> settleConfirmDialog(false));
  ui.btnConfirmAccept.addEventListener('click', ()=> settleConfirmDialog(true));
  ui.confirmModal.querySelector('.layer-modal-backdrop').addEventListener('click', ()=> settleConfirmDialog(false));
  ui.btnSmallPromptCancel?.addEventListener('click', ()=> settleSmallPrompt(''));
  ui.btnSmallPromptAccept?.addEventListener('click', ()=> settleSmallPrompt(ui.smallPromptInput.value.trim()));
  ui.smallPromptModal?.querySelector('.layer-modal-backdrop')?.addEventListener('click', ()=> settleSmallPrompt(''));
  ui.smallPromptInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') settleSmallPrompt(ui.smallPromptInput.value.trim()); });

  ui.btnCloseImageModal.addEventListener('click', closeImagePreview); ui.imagePreviewModal.querySelector('.image-modal-backdrop').addEventListener('click', closeImagePreview); ui.imagePreviewFull.addEventListener('wheel', handleImagePreviewWheel, { passive:false });
  ui.imagePreviewFull.addEventListener('pointerdown', handleImagePreviewPointerDown);
  window.addEventListener('pointermove', handleImagePreviewPointerMove);
  window.addEventListener('pointerup', handleImagePreviewPointerUp);
  ui.imagePreviewFull.addEventListener('dblclick', resetImagePreviewView);
  ui.btnImagePrev.addEventListener('click', showPreviousPreviewImage);
  ui.btnImageNext.addEventListener('click', showNextPreviewImage);
  ui.btnImageReset.addEventListener('click', resetImagePreviewView);
  document.addEventListener('keydown', (e)=>{ if(!ui.imagePreviewModal.classList.contains('hidden')){ if(e.key==='Escape') closeImagePreview(); if(e.key==='ArrowLeft') showPreviousPreviewImage(); if(e.key==='ArrowRight') showNextPreviewImage(); } if(!ui.queryModal.classList.contains('hidden') && e.key==='Escape') closeLayerModal(ui.queryModal); if(!ui.statsModal.classList.contains('hidden') && e.key==='Escape') closeLayerModal(ui.statsModal); if(!ui.trashModal.classList.contains('hidden') && e.key==='Escape') closeLayerModal(ui.trashModal); if(ui.themeModal && !ui.themeModal.classList.contains('hidden') && e.key==='Escape') closeLayerModal(ui.themeModal); if(ui.pointEditorModal && !ui.pointEditorModal.classList.contains('hidden') && e.key==='Escape') closePointEditor(); if(ui.smallPromptModal && !ui.smallPromptModal.classList.contains('hidden') && e.key==='Escape') settleSmallPrompt(''); if(!ui.confirmModal.classList.contains('hidden') && e.key==='Escape') settleConfirmDialog(false); });
  document.addEventListener('click', (e)=>{ const img=e.target.closest('.pp-thumb, .image-card img'); if(img?.dataset.fullImage) { const imageSet = (img.dataset.imageSet||'').split('|').filter(Boolean); openImagePreview(img.dataset.fullImage, img.dataset.caption||'', imageSet); } });
}

document.addEventListener('DOMContentLoaded', ()=>{
  // Boot sequence: map first, then suggestion lists, then UI bindings.
  initMap();
  refreshSuggestionLists();
  state.settings = ensureSettingsShape({ language:'zh', mapCenter:[29.6088,106.3088], mapZoom:17, activeBaseMapId:'esri', baseMaps:[], recycleBin:[], uiTheme:{...THEME_DEFAULTS}, statsCustom:{ category:'zone', chartType:'combo', barMetric:'speciesCount', lineMetric:'pointCount' } }); applyThemeVariables();
  bindEvents();
  applyI18n();
  showPendingControls(false);
  renderLists();
  renderStatsModal();
  renderTrashList();
  populateQueryFilters();
  renderQueryResults();
});
