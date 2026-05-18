const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const exifr = require('exifr');
const { AppError, logError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const { IMAGE_EXTENSIONS } = require('./constants');
const { ensureProjectStructure } = require('./projectStore');
const {
  resolveImageRelative,
  normalizeSelectedImage
} = require('./pathGuard');
const { copyFileExclusive } = require('./fileWrite');

const IMAGE_NAME_ATTEMPTS = 20;

function createImageFileName(sourcePath) {
  const ext = path.extname(sourcePath).toLowerCase() || '.jpg';
  const random = Math.random().toString(36).slice(2, 8);
  return `img_${Date.now()}_${random}${ext}`;
}

function imageFilters() {
  return [{
    name: 'Images',
    extensions: [...IMAGE_EXTENSIONS].map(ext => ext.slice(1))
  }];
}

function copyImageIntoProject(paths, sourcePath) {
  for (let attempt = 0; attempt < IMAGE_NAME_ATTEMPTS; attempt += 1) {
    const fileName = createImageFileName(sourcePath);
    const relativePath = path.join('information', 'images', fileName).replaceAll('\\', '/');
    const destPath = resolveImageRelative(paths.root, relativePath, '图片目标路径');

    try {
      copyFileExclusive(sourcePath, destPath);
      return { relativePath, destPath };
    } catch (error) {
      if (error?.code === 'EEXIST') {
        continue;
      }
      throw error;
    }
  }

  throw new AppError(ERROR_CODES.INTERNAL_ERROR, '图片归档文件名冲突，请重试。');
}

// EXIF 仅补齐空白日期和首张图片坐标，解析失败不阻断导入。
async function readExif(sourcePath) {
  const exif = { date: '', lat: '', lng: '' };

  try {
    const meta = await exifr.parse(sourcePath, {
      gps: true,
      exif: true,
      tiff: true,
      ifd0: true
    });

    const date = meta?.DateTimeOriginal
      || meta?.CreateDate
      || meta?.ModifyDate
      || meta?.DateTimeDigitized
      || meta?.DateTime;

    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      exif.date = date.toISOString().slice(0, 10);
    }

    if (Number.isFinite(meta?.latitude) && Number.isFinite(meta?.longitude)) {
      exif.lat = meta.latitude;
      exif.lng = meta.longitude;
    }
  } catch (error) {
    logError('image:exif', error);
  }

  return exif;
}

// 图片选择在 main process 内完成，renderer 不能提交任意源路径。
async function importImage(payload) {
  const projectDir = payload?.projectDir;
  if (!projectDir) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '缺少项目目录。');
  }

  const result = await dialog.showOpenDialog({
    title: '选择图片文件',
    properties: ['openFile'],
    filters: imageFilters()
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  const paths = ensureProjectStructure(projectDir);
  const sourcePath = normalizeSelectedImage(result.filePaths[0]);
  const { relativePath, destPath } = copyImageIntoProject(paths, sourcePath);

  return {
    canceled: false,
    relativePath,
    absolutePath: destPath,
    exif: await readExif(sourcePath)
  };
}

// 删除前经 pathGuard 限定到项目图片目录，回收站只保存相对路径。
function deleteImage(payload) {
  if (!payload?.projectDir || !payload?.relativePath) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '缺少图片删除参数。');
  }

  const imagePath = resolveImageRelative(payload.projectDir, payload.relativePath, '待删除图片');
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }

  return { deleted: true };
}

module.exports = {
  importImage,
  deleteImage
};
