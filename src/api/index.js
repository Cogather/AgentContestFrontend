import axios from 'axios'
import {
  resolveApiBaseUrl,
  resolveUploadTimeoutMs,
  resolveWriteApiKey
} from '../utils/apiConfig'
import { shouldLogApiError } from '../utils/apiErrorLogging'
import { getCurrentStoredUserId } from '../utils/userStorage'

const WRITE_KEY_HEADER = 'X-Agent-Contest-Write-Key'
const CURRENT_USER_ID_HEADER = 'X-Agent-Contest-User-Id'

const getBaseUrl = () => {
  return resolveApiBaseUrl(import.meta.env)
}

const getWriteApiKey = () => {
  return resolveWriteApiKey(import.meta.env)
}

const isWriteMethod = (method) => {
  return ['post', 'put', 'patch', 'delete'].includes(String(method || '').toLowerCase())
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
    if (shouldLogApiError(error)) {
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
    timeout: resolveUploadTimeoutMs(import.meta.env),
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export default api
