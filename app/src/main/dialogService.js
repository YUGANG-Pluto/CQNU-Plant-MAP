const fs = require('fs');
const { dialog } = require('electron');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const {
  MAX_IMPORT_TEXT_BYTES,
  CSV_EXTENSIONS,
  GEOJSON_EXTENSIONS
} = require('./constants');
const {
  normalizeProjectDir,
  normalizeImportFile,
  normalizeExportFile,
  trustBackupDirFromDialog
} = require('./pathGuard');
const { writeTextFileAtomic } = require('./fileWrite');

function extensionList(extSet) {
  return [...extSet].map(ext => ext.replace('.', ''));
}

async function chooseProjectDir() {
  const result = await dialog.showOpenDialog({
    title: '选择项目目录',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  return {
    canceled: false,
    projectDir: normalizeProjectDir(result.filePaths[0])
  };
}

async function chooseMergeProjectDir() {
  return chooseProjectDir();
}

async function chooseBackupDir() {
  const result = await dialog.showOpenDialog({
    title: '选择备份目录',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  return {
    canceled: false,
    backupDir: trustBackupDirFromDialog(result.filePaths[0])
  };
}

// CSV/GeoJSON 导入保留原字段文本，只在边界层限制类型和体积。
function readSelectedTextFile(filePath, kind) {
  const normalized = normalizeImportFile(filePath, kind);
  const stat = fs.statSync(normalized);
  if (stat.size > MAX_IMPORT_TEXT_BYTES) {
    throw new AppError(ERROR_CODES.FILE_TOO_LARGE, '导入文件过大。');
  }

  return {
    filePath: normalized,
    content: fs.readFileSync(normalized, 'utf8')
  };
}

async function importCsv() {
  const result = await dialog.showOpenDialog({
    title: '导入 CSV',
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: extensionList(CSV_EXTENSIONS) }]
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  return {
    canceled: false,
    ...readSelectedTextFile(result.filePaths[0], 'csv')
  };
}

async function importGeoJson() {
  const result = await dialog.showOpenDialog({
    title: '导入 GeoJSON',
    properties: ['openFile'],
    filters: [{ name: 'GeoJSON', extensions: extensionList(GEOJSON_EXTENSIONS) }]
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  return {
    canceled: false,
    ...readSelectedTextFile(result.filePaths[0], 'geojson')
  };
}

// 导出仍由 main 处理；保存框路径只在扩展名校验通过后写入。
async function exportTextByDialog({ title, defaultPath, filters, content, allowed, defaultExt }) {
  if (typeof content !== 'string') {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '导出内容必须是字符串。');
  }

  const result = await dialog.showSaveDialog({
    title,
    defaultPath,
    filters
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const target = normalizeExportFile(result.filePath, allowed, defaultExt);
  writeTextFileAtomic(target, content);

  return {
    canceled: false,
    filePath: target
  };
}

async function exportCsv(payload) {
  return exportTextByDialog({
    title: '导出 CSV',
    defaultPath: payload.defaultPath || 'plant_records.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    content: payload.content ?? '',
    allowed: CSV_EXTENSIONS,
    defaultExt: '.csv'
  });
}

async function exportGeoJson(payload) {
  return exportTextByDialog({
    title: '导出 GeoJSON',
    defaultPath: payload.defaultPath || 'plant_points.geojson',
    filters: [{ name: 'GeoJSON', extensions: ['geojson', 'json'] }],
    content: payload.content ?? '',
    allowed: GEOJSON_EXTENSIONS,
    defaultExt: '.geojson'
  });
}

module.exports = {
  chooseProjectDir,
  chooseMergeProjectDir,
  chooseBackupDir,
  importCsv,
  importGeoJson,
  exportCsv,
  exportGeoJson
};
