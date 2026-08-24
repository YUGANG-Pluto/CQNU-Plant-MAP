const https = require('https');
const fs = require('fs');
const path = require('path');
const { AppError } = require('../errors');
const { ERROR_CODES } = require('../errorCodes');
const { IMAGE_EXTENSIONS } = require('../constants');
const { cleanText } = require('./textUtils');

const REQUEST_TIMEOUT_MS = 12000;
const IMAGE_COMPARE_TIMEOUT_MS = 30000;
const MAX_COMPARE_IMAGE_BYTES = 8 * 1024 * 1024;

async function fetchJsonOnce(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'CQNU-Plant-MAP/1.0 species-reference'
      },
      timeout: timeoutMs
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new AppError(ERROR_CODES.INTERNAL_ERROR, `参考 API 请求失败：HTTP ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (error) {
          reject(new AppError(ERROR_CODES.INVALID_JSON, '参考 API 返回了无效 JSON。', error));
        }
      });
    });

    request.on('timeout', () => {
      request.destroy(new AppError(ERROR_CODES.INTERNAL_ERROR, '参考 API 请求超时。'));
    });
    request.on('error', error => {
      reject(error instanceof AppError ? error : new AppError(ERROR_CODES.INTERNAL_ERROR, error.message || '参考 API 请求失败。', error));
    });
  });
}

async function fetchJson(url) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchJsonOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
  }
  throw lastError;
}

function imageCompareFilters() {
  return [{
    name: 'Images',
    extensions: [...IMAGE_EXTENSIONS].map(ext => ext.slice(1))
  }];
}

function mimeFromImagePath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

function safeFileName(filePath) {
  return path.basename(filePath).replace(/[^\w.\-()\u4e00-\u9fa5]+/g, '_');
}

function buildMultipartImageBody(filePath, fields = {}) {
  const boundary = `----cqnu-plant-map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fileBuffer = fs.readFileSync(filePath);
  if (fileBuffer.length > MAX_COMPARE_IMAGE_BYTES) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '图片超过 8MB，无法用于轻量图像比对。');
  }
  const parts = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    parts.push(Buffer.from(
      `--${boundary}\r\n`
      + `Content-Disposition: form-data; name="${key}"\r\n\r\n`
      + `${String(value)}\r\n`,
      'utf8'
    ));
  });
  parts.push(Buffer.from(
    `--${boundary}\r\n`
    + `Content-Disposition: form-data; name="image"; filename="${safeFileName(filePath)}"\r\n`
    + `Content-Type: ${mimeFromImagePath(filePath)}\r\n\r\n`,
    'utf8'
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));
  return {
    boundary,
    body: Buffer.concat(parts),
    size: fileBuffer.length
  };
}

async function postMultipartJson(url, filePath, fields = {}, token = '') {
  const multipart = buildMultipartImageBody(filePath, fields);
  const headers = {
    accept: 'application/json',
    'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
    'content-length': multipart.body.length,
    'user-agent': 'CQNU-Plant-MAP/1.0 species-image-compare'
  };
  const cleanToken = cleanText(token);
  if (cleanToken) {
    headers.authorization = /^Bearer\s+/i.test(cleanToken) ? cleanToken : `Bearer ${cleanToken}`;
  }

  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers,
      timeout: IMAGE_COMPARE_TIMEOUT_MS
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = null;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { message: text };
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const message = response.statusCode === 401
            ? 'iNaturalist 图像比对需要有效访问令牌；令牌只会用于本次请求，不会保存。'
            : (data?.error || data?.message || `iNaturalist 图像比对失败：HTTP ${response.statusCode}`);
          reject(new AppError(ERROR_CODES.INTERNAL_ERROR, message));
          return;
        }
        resolve({
          data,
          uploadedBytes: multipart.size
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new AppError(ERROR_CODES.INTERNAL_ERROR, 'iNaturalist 图像比对请求超时。'));
    });
    request.on('error', error => {
      reject(error instanceof AppError ? error : new AppError(ERROR_CODES.INTERNAL_ERROR, error.message || 'iNaturalist 图像比对失败。', error));
    });
    request.write(multipart.body);
    request.end();
  });
}

module.exports = {
  REQUEST_TIMEOUT_MS,
  IMAGE_COMPARE_TIMEOUT_MS,
  MAX_COMPARE_IMAGE_BYTES,
  fetchJsonOnce,
  fetchJson,
  imageCompareFilters,
  postMultipartJson
};
