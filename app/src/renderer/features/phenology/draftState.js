let pointEditorSaving = false;
let pointEditorDraftController = null;

const POINT_EDITOR_DRAFT_FIELDS = [
  'pointId',
  'plantNameCn',
  'plantNameSci',
  'familyInput',
  'genusInput',
  'identificationStatus',
  'taxonomySource',
  'taxonomyVerificationStatus',
  'taxonomyUpdatedAt',
  'observer',
  'surveyDate',
  'habitat',
  'abundance',
  'growthForm',
  'floweringState',
  'cultivatedStatus',
  'plantNote'
];

function getPointEditorDraftController() {
  const createController = window.rendererDomain?.phenology?.createDraftController;
  if (!pointEditorDraftController && typeof createController === 'function') {
    pointEditorDraftController = createController(POINT_EDITOR_DRAFT_FIELDS);
  }
  return pointEditorDraftController;
}

function pointEditorFormValues() {
  return Object.fromEntries(POINT_EDITOR_DRAFT_FIELDS.map(id => [id, String(ui[id]?.value || '')]));
}

function pointEditorStoredValues() {
  const point = getEditablePoint();
  const entry = getSelectedPhenologyEntry(point);
  return {
    pointId: String(point?.pointId || ''),
    plantNameCn: String(point?.plantNameCn || ''),
    plantNameSci: String(point?.plantNameSci || ''),
    familyInput: String(point?.family || ''),
    genusInput: String(point?.genus || ''),
    identificationStatus: String(point?.identificationStatus || 'draft'),
    taxonomySource: String(point?.taxonomySource || 'unknown'),
    taxonomyVerificationStatus: String(point?.taxonomyVerificationStatus || 'unverified'),
    taxonomyUpdatedAt: String(point?.taxonomyUpdatedAt || ''),
    observer: String(entry?.observer || ''),
    surveyDate: String(entry?.surveyDate || ''),
    habitat: String(entry?.habitat || ''),
    abundance: String(entry?.abundance || ''),
    growthForm: String(entry?.growthForm || ''),
    floweringState: String(entry?.floweringState || entry?.label || ''),
    cultivatedStatus: String(entry?.cultivatedStatus || ''),
    plantNote: String(entry?.note || '')
  };
}

function pointEditorHasUnsavedChanges() {
  if (!getEditablePoint()) return false;
  const current = pointEditorFormValues();
  const stored = pointEditorStoredValues();
  const controller = getPointEditorDraftController();
  if (controller) return controller.inspect(current, stored).dirty;
  return JSON.stringify(current) !== JSON.stringify(stored);
}

function setPointEditorSaveState(status = 'saved') {
  getPointEditorDraftController()?.transition(status);
  if (typeof setProjectDraftSource === 'function') {
    setProjectDraftSource('point-editor', status === 'dirty');
  }
  const node = ui.pointEditorSaveState;
  if (!node) return;
  const states = {
    saved: ['pointEditorStateSaved', 'is-success'],
    dirty: ['pointEditorStateDirty', 'is-warning'],
    saving: ['pointEditorStateSaving', 'is-loading'],
    error: ['pointEditorStateError', 'is-error']
  };
  const [key, className] = states[status] || states.saved;
  node.classList.remove('is-neutral', 'is-success', 'is-warning', 'is-loading', 'is-error');
  node.classList.add(className);
  node.dataset.feedbackTone = status;
  const label = node.querySelector('[data-feedback-label]');
  if (label) {
    label.dataset.i18n = key;
    label.textContent = t(key);
  }
}

function refreshPointEditorDraftState() {
  if (pointEditorSaving) return;
  setPointEditorSaveState(pointEditorHasUnsavedChanges() ? 'dirty' : 'saved');
}

function setPointEditorDraftBaseline() {
  pointEditorSaving = false;
  refreshPointEditorDraftState();
}

function bindPointEditorDraftEvents() {
  if (!ui.pointEditorModal || ui.pointEditorModal.dataset.draftEventsBound === 'true') return;
  const handleDraftChange = event => {
    if (!POINT_EDITOR_DRAFT_FIELDS.includes(event.target?.id)) return;
    refreshPointEditorDraftState();
  };
  ui.pointEditorModal.addEventListener('input', handleDraftChange);
  ui.pointEditorModal.addEventListener('change', handleDraftChange);
  ui.pointEditorModal.dataset.draftEventsBound = 'true';
}

async function confirmDiscardPointEditorDraft() {
  if (!pointEditorHasUnsavedChanges()) return true;
  return openConfirmDialog({
    title: t('pointEditorUnsavedTitle'),
    message: t('pointEditorUnsavedPrompt'),
    acceptLabel: t('confirmAction'),
    cancelLabel: t('cancelAction')
  });
}
