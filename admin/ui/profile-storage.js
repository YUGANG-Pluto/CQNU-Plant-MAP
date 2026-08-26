(() => {
  const STORAGE_PREFIX = 'cqnu-plant-map:avatar:v1:';
  const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
  const MAX_DATA_URL_LENGTH = 320 * 1024;
  const OUTPUT_SIZE = 256;
  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  function storageKey(accountId) {
    const normalized = String(accountId || '').trim().slice(0, 128);
    return normalized ? `${STORAGE_PREFIX}${normalized}` : '';
  }

  function validAvatar(value) {
    return typeof value === 'string'
      && value.length <= MAX_DATA_URL_LENGTH
      && /^data:image\/(?:jpeg|png|webp);base64,/u.test(value);
  }

  function read(accountId) {
    const key = storageKey(accountId);
    if (!key) return '';
    try {
      const value = localStorage.getItem(key) || '';
      return validAvatar(value) ? value : '';
    } catch {
      return '';
    }
  }

  function write(accountId, value) {
    const key = storageKey(accountId);
    if (!key || !validAvatar(value)) throw new Error('头像数据无效。');
    try {
      localStorage.setItem(key, value);
    } catch {
      throw new Error('浏览器本地空间不足，头像未保存。');
    }
  }

  function remove(accountId) {
    const key = storageKey(accountId);
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // A storage policy may block local profile preferences.
    }
  }

  function imageElement(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const source = URL.createObjectURL(file);
      const release = () => URL.revokeObjectURL(source);
      image.addEventListener('load', () => {
        release();
        resolve(image);
      }, { once: true });
      image.addEventListener('error', () => {
        release();
        reject(new Error('头像图片无法解码。'));
      }, { once: true });
      image.src = source;
    });
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('头像图片无法压缩。'));
      }, type, quality);
    });
  }

  function blobDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result || '')), { once: true });
      reader.addEventListener('error', () => reject(new Error('头像图片无法读取。')), { once: true });
      reader.readAsDataURL(blob);
    });
  }

  async function prepare(file) {
    if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type)) {
      throw new Error('请选择 JPG、PNG 或 WebP 图片。');
    }
    if (file.size <= 0 || file.size > MAX_SOURCE_BYTES) {
      throw new Error('头像图片需小于 5 MB。');
    }
    const image = await imageElement(file);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error('头像图片尺寸无效。');
    const sourceSize = Math.min(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('当前浏览器无法处理头像图片。');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(
      image,
      (width - sourceSize) / 2,
      (height - sourceSize) / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );
    const type = file.type === 'image/png' ? 'image/png' : 'image/webp';
    const blob = await canvasBlob(canvas, type, 0.84);
    const value = await blobDataUrl(blob);
    if (!validAvatar(value)) throw new Error('压缩后的头像仍然过大，请换一张图片。');
    return value;
  }

  Object.defineProperty(window, 'cqnuLocalProfile', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({ read, write, remove, prepare })
  });
})();
