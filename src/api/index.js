import axios from 'axios'

const DEFAULT_API_BASE_URL = ''
const DEFAULT_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000
const WRITE_KEY_HEADER = 'X-Agent-Contest-Write-Key'

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

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
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
    return config
  },
  error => Promise.reject(error)
)

api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const userApi = {
  getUsers: () => api.get('/api/users'),
  getUser: (userId) => api.get(`/api/users/${userId}`),
  getSubmissions: (userId) => api.get(`/api/users/${userId}/submissions`),
  addUser: (data) => api.post('/api/users', data),
  updateUser: (userId, data) => api.put(`/api/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/api/users/${userId}`)
}

export const rankApi = {
  getRankList: (limit) => api.get('/api/rank', {
    params: { limit }
  }),
  getRankPage: (params) => api.get('/api/rank/page', {
    params
  }),
  getUserRank: (userId) => api.get(`/api/rank/${userId}`)
}

export const commonApi = {
  uploadCode: (userId, formData) => api.post(`/api/upload/${userId}`, formData, {
    timeout: getUploadTimeout(),
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export default api
