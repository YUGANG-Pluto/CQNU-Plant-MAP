const COORD_SYSTEMS = Object.freeze({
  WGS84: 'WGS84',
  GCJ02: 'GCJ02',
  BD09: 'BD09'
});

const EARTH_RADIUS_A = 6378245.0;
const EARTH_EE = 0.00669342162296594323;
const BD_PI = Math.PI * 3000.0 / 180.0;

function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) *
    2.0 / 3.0;
  ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) *
    2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) *
    2.0 / 3.0;
  return ret;
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) *
    2.0 / 3.0;
  ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) *
    2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) *
    2.0 / 3.0;
  return ret;
}

function delta(lng, lat) {
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - EARTH_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((EARTH_RADIUS_A * (1 - EARTH_EE)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (EARTH_RADIUS_A / sqrtMagic * Math.cos(radLat) * Math.PI);
  return [dLng, dLat];
}

function wgs84ToGcj02(lng, lat) {
  lng = Number(lng);
  lat = Number(lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [lng, lat];
  if (outOfChina(lng, lat)) return [lng, lat];
  const [dLng, dLat] = delta(lng, lat);
  return [lng + dLng, lat + dLat];
}

function gcj02ToWgs84(lng, lat) {
  lng = Number(lng);
  lat = Number(lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [lng, lat];
  if (outOfChina(lng, lat)) return [lng, lat];
  const [dLng, dLat] = delta(lng, lat);
  return [lng - dLng, lat - dLat];
}

function gcj02ToWgs84Exact(lng, lat) {
  let minLng = lng - 0.01;
  let maxLng = lng + 0.01;
  let minLat = lat - 0.01;
  let maxLat = lat + 0.01;
  let resultLng = lng;
  let resultLat = lat;

  for (let i = 0; i < 24; i += 1) {
    resultLng = (minLng + maxLng) / 2;
    resultLat = (minLat + maxLat) / 2;
    const [tmpLng, tmpLat] = wgs84ToGcj02(resultLng, resultLat);
    const dLng = tmpLng - lng;
    const dLat = tmpLat - lat;
    if (Math.abs(dLng) < 1e-7 && Math.abs(dLat) < 1e-7) break;
    if (dLng > 0) maxLng = resultLng;
    else minLng = resultLng;
    if (dLat > 0) maxLat = resultLat;
    else minLat = resultLat;
  }

  return [resultLng, resultLat];
}

function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * BD_PI);
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * BD_PI);
  return [z * Math.cos(theta) + 0.0065, z * Math.sin(theta) + 0.006];
}

function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * BD_PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * BD_PI);
  return [z * Math.cos(theta), z * Math.sin(theta)];
}

function wgs84ToBd09(lng, lat) {
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
  return gcj02ToBd09(gcjLng, gcjLat);
}

function bd09ToWgs84(lng, lat) {
  const [gcjLng, gcjLat] = bd09ToGcj02(lng, lat);
  return gcj02ToWgs84Exact(gcjLng, gcjLat);
}

function normalizeCoordSystem(value) {
  const text = String(value || 'WGS84').toUpperCase();
  if (text === 'GCJ02' || text === 'GCJ-02') return COORD_SYSTEMS.GCJ02;
  if (text === 'BD09' || text === 'BD-09') return COORD_SYSTEMS.BD09;
  return COORD_SYSTEMS.WGS84;
}

function convertLngLat(lng, lat, from, to) {
  const source = normalizeCoordSystem(from);
  const target = normalizeCoordSystem(to);
  if (source === target) return [Number(lng), Number(lat)];

  let wgsLng = Number(lng);
  let wgsLat = Number(lat);
  if (source === COORD_SYSTEMS.GCJ02) {
    [wgsLng, wgsLat] = gcj02ToWgs84Exact(wgsLng, wgsLat);
  } else if (source === COORD_SYSTEMS.BD09) {
    [wgsLng, wgsLat] = bd09ToWgs84(wgsLng, wgsLat);
  }

  if (target === COORD_SYSTEMS.GCJ02) return wgs84ToGcj02(wgsLng, wgsLat);
  if (target === COORD_SYSTEMS.BD09) return wgs84ToBd09(wgsLng, wgsLat);
  return [wgsLng, wgsLat];
}

function activeCoordSystem() {
  const basemap = typeof getActiveBaseMapConfig === 'function' ? getActiveBaseMapConfig() : null;
  return normalizeCoordSystem(basemap?.coordSystem || state.currentBaseMapCoordSystem || 'WGS84');
}

function storagePointToDisplayLatLng(point) {
  const [lng, lat] = convertLngLat(point.lng, point.lat, 'WGS84', activeCoordSystem());
  return L.latLng(lat, lng);
}

function displayLatLngToStorageLatLng(latlng) {
  const [lng, lat] = convertLngLat(latlng.lng, latlng.lat, activeCoordSystem(), 'WGS84');
  return L.latLng(lat, lng);
}

function storageLngLatToDisplayLatLng(lng, lat) {
  const [displayLng, displayLat] = convertLngLat(lng, lat, 'WGS84', activeCoordSystem());
  return L.latLng(displayLat, displayLng);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COORD_SYSTEMS,
    outOfChina,
    wgs84ToGcj02,
    gcj02ToWgs84,
    gcj02ToWgs84Exact,
    gcj02ToBd09,
    bd09ToGcj02,
    wgs84ToBd09,
    bd09ToWgs84,
    normalizeCoordSystem,
    convertLngLat
  };
}
