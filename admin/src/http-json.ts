export type JsonObject = Record<string, unknown>;

async function boundedText(request: Request, maxBytes: number): Promise<string> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new Error('REQUEST_BODY_TOO_LARGE');
  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) throw new Error('REQUEST_BODY_TOO_LARGE');
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function readJson(
  request: Request,
  maxBytes = 32 * 1024
): Promise<JsonObject> {
  const text = await boundedText(request, maxBytes);
  if (!text) return {};
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as JsonObject;
  } catch {
    throw new Error('REQUEST_BODY_INVALID');
  }
}
