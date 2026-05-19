import axios from 'axios'

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080'

const normalizeBaseUrl = (url) => {
  return String(url || '').replace(/\/+$/, '')
}

const getBaseUrl = () => {
  return normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)
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
  addUser: (data) => api.post('/api/users', data),
  updateUser: (userId, data) => api.put(`/api/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/api/users/${userId}`)
}

export const rankApi = {
  getRankList: (limit) => api.get('/api/rank', {
    params: { limit }
  }),
  getUserRank: (userId) => api.get(`/api/rank/${userId}`)
}

export const commonApi = {
  uploadCode: (userId, formData) => api.post(`/api/upload/${userId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export default api
