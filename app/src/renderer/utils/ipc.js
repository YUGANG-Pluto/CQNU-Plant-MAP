function unwrapIpc(response) {
  if (!response || response.ok !== true) {
    const err = response?.error || {};
    const error = new Error(err.message || 'IPC 调用失败。');
    error.code = err.code || 'IPC_ERROR';
    throw error;
  }
  return response.data;
}

async function callIpc(promise) {
  return unwrapIpc(await promise);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    unwrapIpc,
    callIpc
  };
}
