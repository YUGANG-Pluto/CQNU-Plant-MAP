function renderImageCard(imgPath, imageSet) {
  const card = document.createElement('div');
  card.className = 'image-card';

  const img = document.createElement('img');
  img.src = toFileUrl(imgPath);
  img.alt = imgPath;
  img.dataset.fullImage = toFileUrl(imgPath);
  img.dataset.imageSet = imageSet;
  img.dataset.caption = imgPath.split('/').pop();

  const actions = document.createElement('div');
  actions.className = 'img-actions';
  actions.appendChild(createDeleteImageButton(imgPath));

  const name = document.createElement('div');
  name.className = 'img-name';
  name.textContent = imgPath.split('/').pop();

  card.append(img, actions, name);
  return card;
}

function createDeleteImageButton(imgPath) {
  const button = document.createElement('button');
  button.className = 'btn btn-danger-soft';
  button.textContent = '×';
  button.dataset.safeModeLocked = '1';
  button.addEventListener('click', () => removeImageFromPoint(imgPath));
  return button;
}

// 图片软删除只移除引用并记录回收站，物理文件留到彻底删除阶段。
async function removeImageFromPoint(imgPath) {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('remove-image')) return;
  const point = getSelectedPoint();
  const entry = getSelectedPhenologyEntry(point);
  if (!point || !entry) return;

  const ok = await openConfirmDialog({
    title: t('confirmDeleteImageTitle'),
    message: t('confirmDeleteImage')
  });
  if (!ok) return;

  entry.images = (entry.images || []).filter(item => item !== imgPath);
  syncPointSummary(point);
  pushToRecycleBin(buildTrashItem('image', imgPath.split('/').pop(), {
    pointId: point.id,
    phenologyId: entry.id,
    relativePath: imgPath
  }));

  renderImageList(entry.images);
  renderAllDerived();
  updatePointTooltip(point);
  await persistProject();
}

function renderImageList(images) {
  ui.imageList.innerHTML = '';
  if (!images?.length) {
    if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
    return;
  }

  const imageSet = images.map(img => toFileUrl(img)).join('|');
  images.forEach(imgPath => {
    ui.imageList.appendChild(renderImageCard(imgPath, imageSet));
  });
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
}

// EXIF 日期只填补空白调查日期，首张图片坐标可校正新建点位置。
async function chooseAndImportImage() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('import-image')) return;
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));

  const entry = getSelectedPhenologyEntry(point);
  if (!entry) return showAlert(t('noPhenologySelected'));

  const imported = await callIpc(window.platformAdapter.image.import({ projectDir: state.projectDir }));
  if (imported.canceled) return;

  entry.images = entry.images || [];
  const isFirstImage = entry.images.length === 0;
  entry.images.push(imported.relativePath);

  if (!entry.surveyDate && imported.exif?.date) {
    entry.surveyDate = imported.exif.date;
    ui.surveyDate.value = imported.exif.date;
  }

  if (isFirstImage && Number.isFinite(imported.exif?.lat) && Number.isFinite(imported.exif?.lng)) {
    point.lat = imported.exif.lat;
    point.lng = imported.exif.lng;
    const marker = state.pointLayers.get(point.id);
    if (marker?.setLatLng) marker.setLatLng([point.lat, point.lng]);
  }

  syncPointSummary(point);
  renderImageList(entry.images);
  updatePointTooltip(point);
  renderAllDerived();
  await persistProject();
  toast(t('exifImported'));
}

function applyImagePreviewTransform() {
  ui.imagePreviewFull.style.transform = `translate(${state.imagePreviewTranslateX}px, `
    + `${state.imagePreviewTranslateY}px) scale(${state.imagePreviewScale})`;
  ui.imagePreviewZoom.textContent = `${state.imagePreviewScale.toFixed(1)}×`;
  ui.imagePreviewFull.style.cursor = state.imagePreviewScale > 1
    ? (state.imagePreviewDragging ? 'grabbing' : 'grab')
    : 'zoom-in';
}

function updatePreviewNavButtons() {
  const many = state.currentPreviewImages.length > 1;
  ui.btnImagePrev.disabled = !many || state.currentPreviewIndex <= 0;
  ui.btnImageNext.disabled = !many ||
    state.currentPreviewIndex >= state.currentPreviewImages.length - 1;
}

function setPreviewImageByIndex(index) {
  if (!state.currentPreviewImages.length) return;
  state.currentPreviewIndex = Math.max(0, Math.min(index, state.currentPreviewImages.length - 1));
  ui.imagePreviewFull.src = state.currentPreviewImages[state.currentPreviewIndex];
  updatePreviewNavButtons();
}

function resetImagePreviewView() {
  state.imagePreviewScale = 1;
  state.imagePreviewTranslateX = 0;
  state.imagePreviewTranslateY = 0;
  applyImagePreviewTransform();
}

function updateImagePreviewZoom(scale, originX = '50%', originY = '50%') {
  const next = Math.min(10, Math.max(1, Number(scale) || 1));
  state.imagePreviewScale = next;
  ui.imagePreviewFull.style.transformOrigin = `${originX} ${originY}`;

  if (next === 1) {
    state.imagePreviewTranslateX = 0;
    state.imagePreviewTranslateY = 0;
  }

  applyImagePreviewTransform();
}

function openImagePreview(src, caption = '', imageSet = []) {
  const normalized = Array.isArray(imageSet) && imageSet.length ? imageSet : [src];
  state.currentPreviewImages = normalized;
  state.currentPreviewIndex = Math.max(0, normalized.indexOf(src));
  ui.imagePreviewCaption.textContent = caption || t('imagePreview');
  openLayerModal(ui.imagePreviewModal, { focusTarget: ui.btnCloseImageModal });
  setPreviewImageByIndex(state.currentPreviewIndex);
  resetImagePreviewView();
}

function closeImagePreview() {
  closeLayerModal(ui.imagePreviewModal, { returnFocus: document.activeElement });
  const delay = document.documentElement.classList.contains('motion-disabled') ? 0 : getMotionDurationMs('--motion-duration', 580);
  window.setTimeout(() => {
    if (!ui.imagePreviewModal.classList.contains('hidden')) return;
    ui.imagePreviewFull.src = '';
    state.currentPreviewImages = [];
    state.currentPreviewIndex = 0;
    resetImagePreviewView();
  }, delay + 20);
}

function handleImagePreviewWheel(event) {
  if (ui.imagePreviewModal.classList.contains('hidden')) return;
  event.preventDefault();

  const rect = ui.imagePreviewFull.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const originX = `${((event.clientX - rect.left) / rect.width * 100).toFixed(2)}%`;
  const originY = `${((event.clientY - rect.top) / rect.height * 100).toFixed(2)}%`;
  const delta = event.deltaY < 0 ? 0.2 : -0.2;
  updateImagePreviewZoom(state.imagePreviewScale + delta, originX, originY);
}

function handleImagePreviewPointerDown(event) {
  if (state.imagePreviewScale <= 1) return;
  event.preventDefault();
  state.imagePreviewDragging = true;
  state.imagePreviewDragStart = {
    x: event.clientX,
    y: event.clientY,
    tx: state.imagePreviewTranslateX,
    ty: state.imagePreviewTranslateY
  };
  applyImagePreviewTransform();
}

function handleImagePreviewPointerMove(event) {
  if (!state.imagePreviewDragging || !state.imagePreviewDragStart) return;
  state.imagePreviewTranslateX = state.imagePreviewDragStart.tx +
    (event.clientX - state.imagePreviewDragStart.x);
  state.imagePreviewTranslateY = state.imagePreviewDragStart.ty +
    (event.clientY - state.imagePreviewDragStart.y);
  applyImagePreviewTransform();
}

function handleImagePreviewPointerUp() {
  state.imagePreviewDragging = false;
  state.imagePreviewDragStart = null;
  applyImagePreviewTransform();
}

function showPreviousPreviewImage() {
  if (state.currentPreviewIndex <= 0) return;
  setPreviewImageByIndex(state.currentPreviewIndex - 1);
  resetImagePreviewView();
}

function showNextPreviewImage() {
  if (state.currentPreviewIndex >= state.currentPreviewImages.length - 1) return;
  setPreviewImageByIndex(state.currentPreviewIndex + 1);
  resetImagePreviewView();
}
