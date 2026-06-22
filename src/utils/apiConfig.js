export const DEFAULT_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000

export const normalizeApiBaseUrl = (url) => {
  return String(url ?? '').trim().replace(/\/+$/, '')
}

export const resolveApiBaseUrl = (env = {}) => {
  return normalizeApiBaseUrl(env.VITE_API_BASE_URL)
}

export const resolveWriteApiKey = (env = {}) => {
  return String(env.VITE_WRITE_API_KEY || '').trim()
}

export const resolveUploadTimeoutMs = (env = {}) => {
  const timeout = Number(env.VITE_UPLOAD_TIMEOUT_MS)
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_UPLOAD_TIMEOUT_MS
}
