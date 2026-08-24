function cloneMaintenanceJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function maintenanceText(key, fallback = '') {
  return typeof t === 'function' ? t(key) : fallback || key;
}

function maintenanceProjectLabel() {
  if (typeof dirnameLabel === 'function') {
    return dirnameLabel(state.projectDir);
  }
  return state.projectDir || '—';
}

function setMaintenanceBusy(button, busy) {
  if (!button) return;
  button.disabled = !!busy;
}
