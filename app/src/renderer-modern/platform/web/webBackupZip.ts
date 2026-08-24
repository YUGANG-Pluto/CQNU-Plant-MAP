export const WEB_BACKUP_DATA_FILES = [
  'information/settings.json',
  'information/zones.json',
  'information/points.json'
] as const;

const SAFE_DIRECTORY_ENTRIES = new Set(['information/', 'information/images/']);

export interface WebBackupArchiveLimits {
  maxArchiveBytes: number;
  maxEntries: number;
  maxEntryBytes: number;
  maxUncompressedBytes: number;
}

export const WEB_BACKUP_ARCHIVE_LIMITS: Readonly<WebBackupArchiveLimits> = Object.freeze({
  maxArchiveBytes: 256 * 1024 * 1024,
  maxEntries: 4096,
  maxEntryBytes: 64 * 1024 * 1024,
  maxUncompressedBytes: 512 * 1024 * 1024
});

export interface WebBackupArchiveEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compression: 0 | 8;
  crc32: number;
  directory: boolean;
}

export interface WebBackupArchivePreflight {
  archiveBytes: number;
  uncompressedBytes: number;
  entries: WebBackupArchiveEntry[];
}

function failArchive(message: string): never {
  throw new Error(`备份 ZIP 无法使用：${message}`);
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function decodeEntryName(bytes: Uint8Array, utf8: boolean): string {
  if (!utf8 && bytes.some(value => value > 0x7f)) {
    return failArchive('文件名必须使用 UTF-8 编码。');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return failArchive('存在无法解码的文件名。');
  }
}

function isAllowedArchivePath(name: string, directory: boolean): boolean {
  if (!name || name.length > 180 || name.includes('\\') || name.includes('\0')) return false;
  if (name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.startsWith('//')) return false;
  const segments = name.split('/');
  if (segments.some(segment => segment === '.' || segment === '..')) return false;
  if (directory) return SAFE_DIRECTORY_ENTRIES.has(name);
  if (name === 'backup-manifest.json'
    || WEB_BACKUP_DATA_FILES.includes(name as typeof WEB_BACKUP_DATA_FILES[number])) return true;
  return /^information\/images\/[^/]{1,140}$/.test(name);
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const view = viewOf(bytes);
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return failArchive('未找到有效的 ZIP 中央目录。');
}

function mergeLimits(limits?: Partial<WebBackupArchiveLimits>): WebBackupArchiveLimits {
  const merged = { ...WEB_BACKUP_ARCHIVE_LIMITS, ...(limits || {}) };
  if (Object.values(merged).some(value => !Number.isSafeInteger(value) || value <= 0)) {
    return failArchive('归档限制配置无效。');
  }
  return merged;
}

export function preflightWebBackupArchive(
  bytes: Uint8Array,
  limits?: Partial<WebBackupArchiveLimits>
): WebBackupArchivePreflight {
  const activeLimits = mergeLimits(limits);
  if (!(bytes instanceof Uint8Array) || bytes.length < 22) return failArchive('文件不是有效的 ZIP。');
  if (bytes.length > activeLimits.maxArchiveBytes) return failArchive('文件体积超过允许上限。');

  const view = viewOf(bytes);
  const endOffset = findEndOfCentralDirectory(bytes);
  const diskNumber = view.getUint16(endOffset + 4, true);
  const centralDisk = view.getUint16(endOffset + 6, true);
  const diskEntries = view.getUint16(endOffset + 8, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const commentLength = view.getUint16(endOffset + 20, true);
  if (endOffset + 22 + commentLength !== bytes.length) return failArchive('ZIP 尾部结构异常。');
  if (diskNumber || centralDisk || diskEntries !== entryCount) return failArchive('不支持分卷 ZIP。');
  if (entryCount === 0 || entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    return failArchive('不支持空归档或 Zip64 归档。');
  }
  if (entryCount > activeLimits.maxEntries) return failArchive('文件条目数量超过允许上限。');
  if (centralOffset + centralSize !== endOffset) return failArchive('ZIP 中央目录范围异常。');

  const entries: WebBackupArchiveEntry[] = [];
  const normalizedNames = new Set<string>();
  const localRanges: Array<[number, number]> = [];
  let offset = centralOffset;
  let uncompressedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > endOffset || view.getUint32(offset, true) !== 0x02014b50) {
      return failArchive('ZIP 中央目录条目损坏。');
    }
    const flags = view.getUint16(offset + 8, true);
    const compression = view.getUint16(offset + 10, true);
    const crc32 = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const entryCommentLength = view.getUint16(offset + 32, true);
    const startDisk = view.getUint16(offset + 34, true);
    const localOffset = view.getUint32(offset + 42, true);
    const entryEnd = offset + 46 + nameLength + extraLength + entryCommentLength;
    if (entryEnd > endOffset) return failArchive('ZIP 条目边界异常。');
    if ((flags & 0x0001) !== 0) return failArchive('不支持加密 ZIP。');
    if (startDisk || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
      return failArchive('不支持分卷或 Zip64 条目。');
    }
    if (compression !== 0 && compression !== 8) return failArchive('ZIP 使用了不支持的压缩方法。');
    if (uncompressedSize > activeLimits.maxEntryBytes) return failArchive('单个文件超过允许上限。');
    uncompressedBytes += uncompressedSize;
    if (uncompressedBytes > activeLimits.maxUncompressedBytes) return failArchive('解压后总体积超过允许上限。');

    const name = decodeEntryName(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
      (flags & 0x0800) !== 0
    );
    const directory = name.endsWith('/');
    if (!isAllowedArchivePath(name, directory)) return failArchive(`包含不允许的路径：${name}`);
    const normalized = name.toLocaleLowerCase('en-US');
    if (normalizedNames.has(normalized)) return failArchive(`包含重复路径：${name}`);
    normalizedNames.add(normalized);

    if (localOffset + 30 > centralOffset || view.getUint32(localOffset, true) !== 0x04034b50) {
      return failArchive(`文件头损坏：${name}`);
    }
    const localFlags = view.getUint16(localOffset + 6, true);
    const localCompression = view.getUint16(localOffset + 8, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const localDataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const localEnd = localDataOffset + compressedSize;
    if ((localFlags & 0x0001) !== 0 || localCompression !== compression) {
      return failArchive(`文件头参数不一致：${name}`);
    }
    if (localEnd > centralOffset) return failArchive(`文件数据越界：${name}`);
    if (localRanges.some(([start, end]) => localOffset < end && localEnd > start)) {
      return failArchive(`文件数据范围重叠：${name}`);
    }
    localRanges.push([localOffset, localEnd]);
    const localName = decodeEntryName(
      bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength),
      (localFlags & 0x0800) !== 0
    );
    if (localName !== name) return failArchive(`文件名记录不一致：${name}`);

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      compression: compression as 0 | 8,
      crc32,
      directory
    });
    offset = entryEnd;
  }
  if (offset !== endOffset) return failArchive('ZIP 中央目录包含未识别数据。');
  return { archiveBytes: bytes.length, uncompressedBytes, entries };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export function calculateCrc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
