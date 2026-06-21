import axios from 'axios'
import { getCurrentStoredUserId } from '../utils/userStorage'

const DEFAULT_API_BASE_URL = ''
const DEFAULT_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000
const WRITE_KEY_HEADER = 'X-Agent-Contest-Write-Key'
const CURRENT_USER_ID_HEADER = 'X-Agent-Contest-User-Id'

const normalizeBaseUrl = (url) => {
  return String(url || '').replace(/\/+$/, '')
}

const getBaseUrl = () => {
  return normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)
}

const getWriteApiKey = () => {
  return String(import.meta.env.VITE_WRITE_API_KEY || '').trim()
}

const getUploadTimeout = () => {
  const timeout = Number(import.meta.env.VITE_UPLOAD_TIMEOUT_MS)
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_UPLOAD_TIMEOUT_MS
}

const isWriteMethod = (method) => {
  return ['post', 'put', 'patch', 'delete'].includes(String(method || '').toLowerCase())
}

const isExpectedSessionProbeError = (error) => {
  const config = error?.config
  const status = error?.response?.status
  return config?.url === '/api/users/me'
    && String(config?.method || '').toLowerCase() === 'get'
    && [401, 403, 404].includes(status)
}

const isOptionalContestConfigError = (error) => {
  const config = error?.config
  return config?.url === '/api/contest/config'
    && String(config?.method || '').toLowerCase() === 'get'
}

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  config => {
    config.baseURL = getBaseUrl()
    const writeApiKey = getWriteApiKey()
    if (writeApiKey && isWriteMethod(config.method)) {
      config.headers = config.headers || {}
      config.headers[WRITE_KEY_HEADER] = writeApiKey
    }
    const currentUserId = getCurrentStoredUserId()
    if (currentUserId) {
      config.headers = config.headers || {}
      config.headers[CURRENT_USER_ID_HEADER] = currentUserId
    }
    return config
  },
  error => Promise.reject(error)
)

api.interceptors.response.use(
  response => response.data,
  error => {
    if (!isExpectedSessionProbeError(error) && !isOptionalContestConfigError(error)) {
      console.error('API Error:', error)
    }
    return Promise.reject(error)
  }
)

export const userApi = {
  getUsers: () => api.get('/api/users'),
  getMe: () => api.get('/api/users/me'),
  getUser: () => api.get('/api/users/me'),
  getSubmissions: () => api.get('/api/users/me/submissions'),
  getSubmissionQueueSummary: () => api.get('/api/users/me/submissions/summary'),
  addUser: (data) => api.post('/api/users', data),
  emergencyLogin: (data) => api.post('/api/users/emergency-login', data),
  updateUser: (data) => api.put('/api/users/me', data),
  cancelSubmission: (submissionId) => api.post(`/api/users/me/submissions/${submissionId}/cancel`),
  deleteUser: () => api.delete('/api/users/me')
}

export const rankApi = {
  getRankList: (limit) => api.get('/api/rank', {
    params: { limit }
  }),
  getRankPage: (params) => api.get('/api/rank/page', {
    params
  }),
  getUserRank: () => api.get('/api/rank/me')
}

export const contestApi = {
  getConfig: () => api.get('/api/contest/config')
}

export const commonApi = {
  uploadCode: (formData) => api.post('/api/upload/me', formData, {
    timeout: getUploadTimeout(),
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export default api
