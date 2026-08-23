import { createWebProjectSession } from '/assets/web-project.js';

const root = document.querySelector('[data-web-workspace]');

if (root) {
  const fileInput = root.querySelector('#workspaceFiles');
  const selectButton = root.querySelector('[data-workspace-select]');
  const clearButton = root.querySelector('[data-workspace-clear]');
  const exportButton = root.querySelector('[data-workspace-export]');
  const status = root.querySelector('[data-workspace-status]');
  const dropzone = root.querySelector('[data-workspace-dropzone]');
  const results = root.querySelector('[data-workspace-results]');
  const title = root.querySelector('[data-workspace-title]');
  const qualityList = root.querySelector('[data-workspace-quality]');
  const zoneRows = root.querySelector('[data-workspace-zones]');
  let currentSummary = null;

  const cleanText = value => {
    const text = String(value ?? '').trim();
    return ['null', 'undefined', 'n/a', 'na', '—', '——'].includes(text.toLocaleLowerCase()) ? '' : text;
  };

  const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const firstText = (record, keys) => {
    for (const key of keys) {
      const value = cleanText(record?.[key]);
      if (value) return value;
    }
    return '';
  };

  const speciesKey = point => firstText(point, [
    'plantNameSci', 'scientificName', 'latinName', '学名',
    'plantNameCn', 'chineseName', 'name', '中文名'
  ]).toLocaleLowerCase();

  const validCoordinate = point => {
    const lat = Number(point?.lat ?? point?.latitude);
    const lng = Number(point?.lng ?? point?.lon ?? point?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng)
      && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  const percent = (value, total) => total > 0 ? `${(value / total * 100).toFixed(1)}%` : '0.0%';

  function zoneIdentity(zone, index) {
    return firstText(zone, ['id', 'zoneId', 'code']) || `zone-${index + 1}`;
  }

  function zoneLabel(zone, index) {
    return firstText(zone, ['name', 'title', 'label', 'displayName', 'zoneId', 'id']) || `未命名分区 ${index + 1}`;
  }

  function pointZoneKey(point) {
    const properties = isRecord(point?.properties) ? point.properties : {};
    return firstText(point, ['zoneRef', 'zoneId', 'zone', 'zoneKey']) || cleanText(properties.zoneId);
  }

  function buildSummary(session) {
    const zones = Array.isArray(session.zones) ? session.zones.filter(isRecord) : [];
    const points = Array.isArray(session.points) ? session.points.filter(isRecord) : [];
    const zoneLookup = new Map();
    const zoneModels = zones.map((zone, index) => {
      const model = {
        id: zoneIdentity(zone, index),
        label: zoneLabel(zone, index),
        pointCount: 0,
        species: new Set(),
        missingScientificName: 0,
        missingCoordinate: 0
      };
      [zone.id, zone.zoneId, zone.code, zone.name, model.id].map(cleanText).filter(Boolean)
        .forEach(key => zoneLookup.set(key, model));
      return model;
    });
    const unassigned = {
      id: 'unassigned',
      label: '未关联分区',
      pointCount: 0,
      species: new Set(),
      missingScientificName: 0,
      missingCoordinate: 0
    };
    const species = new Set();
    const families = new Set();
    const genera = new Set();
    let validCoordinates = 0;
    let verifiedTaxonomy = 0;
    let missingScientificName = 0;
    let missingFamily = 0;
    let missingGenus = 0;
    let unassignedPoints = 0;

    points.forEach(point => {
      const key = speciesKey(point);
      const scientificName = firstText(point, ['plantNameSci', 'scientificName', 'latinName', '学名']);
      const family = firstText(point, ['family', 'familyName', '科']);
      const genus = firstText(point, ['genus', 'genusName', '属']);
      const coordinateOk = validCoordinate(point);
      const zone = zoneLookup.get(pointZoneKey(point)) || unassigned;
      zone.pointCount += 1;
      if (key) {
        species.add(key);
        zone.species.add(key);
      }
      if (!scientificName) {
        missingScientificName += 1;
        zone.missingScientificName += 1;
      }
      if (!coordinateOk) zone.missingCoordinate += 1;
      else validCoordinates += 1;
      if (family) families.add(family.toLocaleLowerCase());
      else missingFamily += 1;
      if (genus) genera.add(genus.toLocaleLowerCase());
      else missingGenus += 1;
      if (cleanText(point.taxonomyVerificationStatus) === 'manuallyVerified') verifiedTaxonomy += 1;
      if (zone === unassigned) unassignedPoints += 1;
    });

    const zoneSummary = [...zoneModels, ...(unassigned.pointCount ? [unassigned] : [])]
      .map(zone => ({
        id: zone.id,
        label: zone.label,
        pointCount: zone.pointCount,
        speciesRichness: zone.species.size,
        missingScientificName: zone.missingScientificName,
        missingCoordinate: zone.missingCoordinate
      }));
    const quality = {
      missingScientificName,
      missingFamily,
      missingGenus,
      missingCoordinate: points.length - validCoordinates,
      unassignedPoints
    };
    return {
      generatedAt: new Date().toISOString(),
      sourceLabel: session.label,
      projectSummary: {
        zoneCount: zones.length,
        pointCount: points.length,
        speciesRichness: species.size,
        familyRichness: families.size,
        genusRichness: genera.size,
        coordinateCompleteness: points.length ? validCoordinates / points.length : 0,
        manuallyVerifiedTaxonomyCount: verifiedTaxonomy
      },
      dataQuality: quality,
      zoneSummaries: zoneSummary,
      notes: [
        '摘要仅基于当前浏览器会话中用户主动选择的本地文件。',
        '有效物种数按学名优先、中文名回退的唯一名称统计。',
        '本页不会修改项目、读写 SQLite 或上传原始文件。'
      ]
    };
  }

  function metric(name, value) {
    const node = root.querySelector(`[data-metric="${name}"]`);
    if (node) node.textContent = String(value);
  }

  function listItem(label, value, total) {
    const item = document.createElement('li');
    const copy = document.createElement('span');
    const count = document.createElement('strong');
    copy.textContent = label;
    count.textContent = `${value} 条${total ? ` · ${percent(value, total)}` : ''}`;
    item.append(copy, count);
    return item;
  }

  function renderSummary(summary) {
    const project = summary.projectSummary;
    const total = project.pointCount;
    if (title) title.textContent = summary.sourceLabel;
    metric('zones', project.zoneCount);
    metric('points', project.pointCount);
    metric('species', project.speciesRichness);
    metric('taxonomy', `${project.familyRichness} / ${project.genusRichness}`);
    metric('coordinates', `${(project.coordinateCompleteness * 100).toFixed(1)}%`);
    metric('verified', project.manuallyVerifiedTaxonomyCount);

    qualityList?.replaceChildren(
      listItem('缺失学名', summary.dataQuality.missingScientificName, total),
      listItem('缺失科', summary.dataQuality.missingFamily, total),
      listItem('缺失属', summary.dataQuality.missingGenus, total),
      listItem('缺失或异常坐标', summary.dataQuality.missingCoordinate, total),
      listItem('未关联分区', summary.dataQuality.unassignedPoints, total)
    );

    zoneRows?.replaceChildren(...summary.zoneSummaries.map(zone => {
      const row = document.createElement('tr');
      const label = document.createElement('td');
      label.textContent = zone.label;
      label.title = zone.label;
      [label, zone.pointCount, zone.speciesRichness, zone.missingScientificName, zone.missingCoordinate]
        .forEach(value => {
          if (value instanceof HTMLElement) row.appendChild(value);
          else {
            const cell = document.createElement('td');
            cell.textContent = String(value);
            row.appendChild(cell);
          }
        });
      return row;
    }));
    results.hidden = false;
    clearButton.disabled = false;
    exportButton.disabled = false;
  }

  function setStatus(message, state = 'neutral') {
    status.textContent = message;
    status.dataset.state = state;
  }

  async function loadFiles(files) {
    if (!files.length) return;
    selectButton.disabled = true;
    setStatus('正在本机内存中读取并核对文件…', 'busy');
    try {
      const session = await createWebProjectSession(files);
      currentSummary = buildSummary(session);
      renderSummary(currentSummary);
      setStatus(`已加载 ${files.length} 个本地文件；未向站点发送项目数据。`, 'success');
    } catch (error) {
      currentSummary = null;
      results.hidden = true;
      clearButton.disabled = true;
      exportButton.disabled = true;
      setStatus(error instanceof Error ? error.message : '文件无法读取。', 'error');
    } finally {
      selectButton.disabled = false;
    }
  }

  function clearWorkspace() {
    currentSummary = null;
    fileInput.value = '';
    results.hidden = true;
    clearButton.disabled = true;
    exportButton.disabled = true;
    qualityList?.replaceChildren();
    zoneRows?.replaceChildren();
    setStatus('已清空当前浏览器会话数据。', 'neutral');
  }

  function exportSummary() {
    if (!currentSummary) return;
    const source = JSON.stringify(currentSummary, null, 2);
    const blob = new Blob([source], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cqnu_plant_map_readonly_summary_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.json`;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus('只读摘要已生成；原始项目文件未改动。', 'success');
  }

  selectButton?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => loadFiles([...(fileInput.files || [])]));
  clearButton?.addEventListener('click', clearWorkspace);
  exportButton?.addEventListener('click', exportSummary);
  dropzone?.addEventListener('dragover', event => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
  dropzone?.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    loadFiles([...(event.dataTransfer?.files || [])]);
  });
}
