const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const exifr = require('exifr');
const AdmZip = require('adm-zip');

// Main application window reference. Kept globally so it is not garbage-collected.
let mainWindow = null;

// Create the desktop shell window that hosts the front-end map application.
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1560,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#f6f8fb',
    title: '校园植物分区管理系统',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}


function siblingBackupDir(projectDir) {
  const parent = path.dirname(projectDir);
  const base = path.basename(projectDir);
  return path.join(parent, `${base}_backups`);
}

function timestampSlug() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function computeProjectModifiedTime(projectDir) {
  const infoDir = path.join(projectDir, 'information');
  let latest = 0;
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      latest = Math.max(latest, stat.mtimeMs || 0);
      if (stat.isDirectory()) walk(full);
    }
  }
  walk(infoDir);
  if (!latest && fs.existsSync(projectDir)) latest = fs.statSync(projectDir).mtimeMs || Date.now();
  return latest || Date.now();
}

function createProjectZipBackup(sourceDir, targetDir, label='backup') {
  ensureDir(targetDir);
  const base = path.basename(sourceDir);
  const fileName = `${base}_${label}_${timestampSlug()}.zip`;
  const dest = path.join(targetDir, fileName);
  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir, base);
  zip.writeZip(dest);
  return dest;
}

function listExpiredBackups(projectDir, days=7) {
  const dir = siblingBackupDir(projectDir);
  if (!fs.existsSync(dir)) return [];
  const now = Date.now();
  const cutoff = days * 24 * 60 * 60 * 1000;
  return fs.readdirSync(dir)
    .filter(name => name.toLowerCase().endsWith('.zip'))
    .map(name => {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      return { name, path: full, mtimeMs: stat.mtimeMs || 0 };
    })
    .filter(item => now - item.mtimeMs > cutoff);
}

function defaultSettings() {
  return {
    language: 'zh',
    mapCenter: [29.6088, 106.3088],
    mapZoom: 17,
    activeBaseMapId: 'esri',
    baseMaps: [
      {
        id: 'osm',
        name: { zh: '街道图（OSM）', en: 'Street (OSM)' },
        type: 'xyz',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: 'abc',
        builtIn: true
      },
      {
        id: 'esri',
        name: { zh: '卫星图（Esri）', en: 'Satellite (Esri)' },
        type: 'xyz',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
        builtIn: true
      },
      {
        id: 'topo',
        name: { zh: '地形图（OpenTopoMap）', en: 'Topo (OpenTopoMap)' },
        type: 'xyz',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenTopoMap contributors',
        maxZoom: 17,
        subdomains: 'abc',
        builtIn: true
      }
    ],
    recycleBin: [],
    uiTheme: {
      primary: '#93a4b4',
      workspace: '#b6a7b2',
      accent: '#c9b39f',
      chartA: '#9ca9b1',
      chartB: '#c8a68c'
    },
    statsCustom: {
      category: 'zone',
      chartType: 'combo',
      barMetric: 'speciesCount',
      lineMetric: 'pointCount'
    }
  };
}

// Guarantee that the chosen project directory always contains the standard information/ structure.
function ensureProjectStructure(projectDir) {
  ensureDir(projectDir);
  const infoDir = path.join(projectDir, 'information');
  const imgDir = path.join(infoDir, 'images');
  ensureDir(infoDir);
  ensureDir(imgDir);

  const settingsPath = path.join(infoDir, 'settings.json');
  const zonesPath = path.join(infoDir, 'zones.json');
  const pointsPath = path.join(infoDir, 'points.json');

  if (!fs.existsSync(settingsPath)) writeJson(settingsPath, defaultSettings());
  if (!fs.existsSync(zonesPath)) writeJson(zonesPath, []);
  if (!fs.existsSync(pointsPath)) writeJson(pointsPath, []);

  return { infoDir, imgDir, settingsPath, zonesPath, pointsPath };
}

ipcMain.handle('dialog:chooseProjectDir', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择项目目录',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const projectDir = result.filePaths[0];
  const paths = ensureProjectStructure(projectDir);
  return { canceled: false, projectDir, ...paths };
});

// Load all persisted JSON files for a project into renderer state.
ipcMain.handle('project:load', async (_event, projectDir) => {
  const paths = ensureProjectStructure(projectDir);
  const settings = readJson(paths.settingsPath, defaultSettings());
  const zones = readJson(paths.zonesPath, []);
  const points = readJson(paths.pointsPath, []);
  return {
    projectDir,
    infoDir: paths.infoDir,
    imagesDir: paths.imgDir,
    settings,
    zones,
    points,
    projectModifiedTime: computeProjectModifiedTime(projectDir)
  };
});

ipcMain.handle('project:getModifiedTime', async (_event, { projectDir }) => {
  return { modifiedTime: computeProjectModifiedTime(projectDir) };
});

// Save the full project snapshot written by the renderer.
ipcMain.handle('project:save', async (_event, payload) => {
  const { projectDir, settings, zones, points } = payload;
  const paths = ensureProjectStructure(projectDir);
  writeJson(paths.settingsPath, settings || defaultSettings());
  writeJson(paths.zonesPath, zones || []);
  writeJson(paths.pointsPath, points || []);
  return { ok: true };
});

// Copy a user-selected local image into the managed project images folder.
ipcMain.handle('image:import', async (_event, { projectDir, sourcePath }) => {
  const paths = ensureProjectStructure(projectDir);
  if (!sourcePath || !fs.existsSync(sourcePath)) return { ok: false, error: '源文件不存在。' };
  const ext = path.extname(sourcePath) || '.jpg';
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const destPath = path.join(paths.imgDir, name);
  fs.copyFileSync(sourcePath, destPath);
  let exif = { date: '', lat: '', lng: '' };
  try {
    const meta = await exifr.parse(sourcePath, { gps: true, exif: true, tiff: true, ifd0: true });
    const exifDate = meta?.DateTimeOriginal || meta?.CreateDate || meta?.ModifyDate || meta?.DateTimeDigitized || meta?.DateTime;
    if (exifDate instanceof Date && !Number.isNaN(exifDate.getTime())) exif.date = exifDate.toISOString().slice(0,10);
    if (Number.isFinite(meta?.latitude) && Number.isFinite(meta?.longitude)) {
      exif.lat = meta.latitude;
      exif.lng = meta.longitude;
    }
  } catch (err) {
    // Best-effort EXIF parsing only.
  }
  return {
    ok: true,
    relativePath: path.join('information', 'images', name).replaceAll('\\', '/'),
    absolutePath: destPath,
    exif
  };
});

ipcMain.handle('image:pickAndImport', async (_event, { projectDir }) => {
  const res = await dialog.showOpenDialog({
    title: '选择图片文件',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }]
  });
  if (res.canceled || !res.filePaths.length) return { canceled: true };
  return ipcMain.emit;
});

ipcMain.handle('dialog:chooseImage', async () => {
  const res = await dialog.showOpenDialog({
    title: '选择图片文件',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }]
  });
  if (res.canceled || !res.filePaths.length) return { canceled: true };
  return { canceled: false, filePath: res.filePaths[0] };
});

ipcMain.handle('image:delete', async (_event, { projectDir, relativePath }) => {
  const fullPath = path.join(projectDir, relativePath);
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch (err) {
      return { ok: false, error: err.message };
    }
  }
  return { ok: true };
});



ipcMain.handle('dialog:openDataFile', async (_event, { title, filters }) => {
  const result = await dialog.showOpenDialog({ title: title || '选择导入文件', properties: ['openFile'], filters: filters || [] });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  return { canceled: false, filePath: result.filePaths[0] };
});

ipcMain.handle('file:readText', async (_event, { filePath }) => {
  return fs.readFileSync(filePath, 'utf8');
});
// Save exported CSV / GeoJSON files chosen by the user.
ipcMain.handle('dialog:saveFile', async (_event, { title, defaultPath, filters }) => {
  const result = await dialog.showSaveDialog({ title: title || '导出文件', defaultPath, filters: filters || [] });
  if (result.canceled || !result.filePath) return { canceled: true };
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('file:writeText', async (_event, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true };
});

ipcMain.handle('path:join', async (_e, { basePath, relativePath }) => {
  return path.join(basePath, relativePath);
});

ipcMain.handle('dialog:chooseDirectory', async (_event, { title } = {}) => {
  const result = await dialog.showOpenDialog({ title: title || '选择文件夹', properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  return { canceled: false, dirPath: result.filePaths[0] };
});

ipcMain.handle('backup:getSiblingDir', async (_event, { projectDir }) => {
  return { dirPath: siblingBackupDir(projectDir) };
});

ipcMain.handle('backup:createZip', async (_event, { sourceDir, targetDir, label }) => {
  try {
    const filePath = createProjectZipBackup(sourceDir, targetDir, label || 'backup');
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('backup:listExpired', async (_event, { projectDir, days }) => {
  try {
    return { ok: true, items: listExpiredBackups(projectDir, days || 7) };
  } catch (err) {
    return { ok: false, error: err.message, items: [] };
  }
});

ipcMain.handle('backup:touchFiles', async (_event, { paths }) => {
  try {
    const now = new Date();
    (paths || []).forEach(file => { if (fs.existsSync(file)) fs.utimesSync(file, now, now); });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('backup:deleteFiles', async (_event, { paths }) => {
  try {
    (paths || []).forEach(file => { if (fs.existsSync(file)) fs.unlinkSync(file); });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

