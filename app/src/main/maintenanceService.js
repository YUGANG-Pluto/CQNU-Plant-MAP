const fs = require('fs');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const { normalizeProjectDir, resolveImageRelative } = require('./pathGuard');

const MAX_IMAGE_REF_CHECKS = 5000;

function checkImageRefs(payload = {}) {
  const projectDir = normalizeProjectDir(payload.projectDir);
  const refs = Array.isArray(payload.refs) ? payload.refs : [];
  if (refs.length > MAX_IMAGE_REF_CHECKS) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '一次最多检查 5000 个图片引用。');
  }

  const uniqueRefs = [...new Set(refs.map(ref => String(ref || '').trim()).filter(Boolean))];
  return {
    checked: uniqueRefs.length,
    items: uniqueRefs.map(ref => {
      try {
        const filePath = resolveImageRelative(projectDir, ref);
        return { ref, exists: fs.existsSync(filePath) };
      } catch (error) {
        return {
          ref,
          exists: false,
          code: error.code || ERROR_CODES.INVALID_PATH,
          message: error.message || String(error)
        };
      }
    })
  };
}

module.exports = {
  checkImageRefs
};
