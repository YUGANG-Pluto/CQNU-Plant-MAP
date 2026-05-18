const fs = require('fs');
const path = require('path');

function createTempPath(filePath) {
  const dirPath = path.dirname(filePath);
  const baseName = path.basename(filePath);
  return path.join(
    dirPath,
    `.${baseName}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  );
}

function closeQuietly(fd) {
  if (fd === undefined) {
    return;
  }

  try {
    fs.closeSync(fd);
  } catch (_) {
    // Preserve the original write error.
  }
}

function removeQuietly(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  } catch (_) {
    // Best-effort cleanup only.
  }
}

function writeTextFileAtomic(filePath, text) {
  const tempPath = createTempPath(filePath);
  let fd;

  try {
    fd = fs.openSync(tempPath, 'wx');
    fs.writeFileSync(fd, text, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    closeQuietly(fd);
    removeQuietly(tempPath);
    throw error;
  }
}

function copyFileExclusive(sourcePath, destPath) {
  fs.copyFileSync(sourcePath, destPath, fs.constants.COPYFILE_EXCL);
}

module.exports = {
  createTempPath,
  writeTextFileAtomic,
  copyFileExclusive,
  removeQuietly
};
