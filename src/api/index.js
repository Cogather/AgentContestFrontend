import axios from 'axios'

// 获取 Base URL
const getBaseUrl = () => {
  try {
    const user = JSON.parse(localStorage.getItem('agent_game_user') || '{}')
    // 根据区域返回不同的 Base URL
    if (user.area === 'green') {
      return 'http://10.12.0.10:8080' // 绿区地址
    }
    return 'http://172.22.0.10:8080' // 黄区地址（默认）
  } catch (e) {
    return 'http://172.22.0.10:8080'
  }
}

// 创建 axios 实例
const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 每次请求前动态获取 baseURL，确保配置修改后立即生效
    config.baseURL = getBaseUrl()
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// 用户相关API
export const userApi = {
  // 获取所有用户
  getUsers: () => api.get('/api/users'),

  // 获取单个用户
  getUser: (userId) => api.get(`/api/users/${userId}`),

  // 添加用户
  addUser: (data) => api.post('/api/users', data),

  // 更新用户
  updateUser: (userId, data) => api.put(`/api/users/${userId}`, data),

  // 删除用户
  deleteUser: (userId) => api.delete(`/api/users/${userId}`)
}

// 排行榜相关API
export const rankApi = {
  // 获取排行榜列表
  getRankList: (limit) => api.get('/api/rank', { params: { limit } }),

  // 获取单个用户排名
  getUserRank: (userId) => api.get(`/api/rank/${userId}`)
}

// 通用接口
export const commonApi = {
  // 上传代码
  uploadCode: (formData) => api.post('/api/upload', formData)
}

export default api
