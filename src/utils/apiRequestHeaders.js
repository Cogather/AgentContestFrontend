const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

export const shouldAttachWriteApiKey = (method) => {
  return WRITE_METHODS.has(String(method || '').toLowerCase())
}
