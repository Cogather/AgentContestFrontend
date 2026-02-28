import axios from 'axios'

// 区域配置
const ZONES = {
  yellow: 'http://172.22.0.10:8080',
  green: 'http://10.12.0.10:8080'
}

// 获取 Base URL
const getBaseUrl = () => {
  try {
    const user = JSON.parse(localStorage.getItem('agent_game_user') || '{}')
    // 根据区域返回不同的 Base URL
    if (user.area === 'green') {
      return ZONES.green // 绿区地址
    }
    return ZONES.yellow // 黄区地址（默认）
  } catch (e) {
    return ZONES.yellow
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
  // 获取排行榜列表（聚合黄区和绿区数据）
  getRankList: async (limit) => {
    // 定义请求函数
    const fetchRank = async (baseUrl) => {
      try {
        const res = await axios.get(`${baseUrl}/api/rank`, { 
          params: { limit },
          timeout: 5000 // 调整超时时间为 5s，避免等待过久
        })
        return res.data
      } catch (e) {
        console.warn(`Fetch rank from ${baseUrl} failed:`, e.message)
        return { code: -1, data: [] }
      }
    }

    try {
      // 并行请求两个区域
      const [res1, res2] = await Promise.all([
        fetchRank(ZONES.yellow),
        fetchRank(ZONES.green)
      ])

      const list1 = (res1.code === 0 && Array.isArray(res1.data)) ? res1.data : []
      const list2 = (res2.code === 0 && Array.isArray(res2.data)) ? res2.data : []

      // 合并数据
      const allData = [...list1, ...list2]
      
      // 去重逻辑：工号相同取时间最新的
      const map = new Map()
      
      allData.forEach(item => {
        if (!item.user_id) return
        
        const existing = map.get(item.user_id)
        if (!existing) {
          map.set(item.user_id, item)
        } else {
          // 比较时间，保留较新的
          const existingTime = new Date(existing.updated_at || 0).getTime()
          const newTime = new Date(item.updated_at || 0).getTime()
          if (newTime > existingTime) {
            map.set(item.user_id, item)
          }
        }
      })

      // 转回数组并按分数排序
      const mergedList = Array.from(map.values()).sort((a, b) => (b.score || 0) - (a.score || 0))

      return {
        code: 0,
        data: mergedList
      }
    } catch (error) {
      console.error('Aggregate rank error:', error)
      return { code: -1, message: '获取排名失败', data: [] }
    }
  },

  // 获取单个用户排名
  getUserRank: async (userId) => {
    const fetchUser = async (baseUrl) => {
      try {
        const res = await axios.get(`${baseUrl}/api/rank/${userId}`, {
          timeout: 5000 // 调整超时时间为 5s
        })
        return res.data
      } catch (e) {
        console.warn(`Fetch user rank from ${baseUrl} failed:`, e.message)
        return { code: -1 }
      }
    }

    try {
      const [res1, res2] = await Promise.all([
        fetchUser(ZONES.yellow),
        fetchUser(ZONES.green)
      ])

      const data1 = (res1.code === 0 && res1.data) ? res1.data : null
      const data2 = (res2.code === 0 && res2.data) ? res2.data : null

      if (!data1 && !data2) return { code: -1, message: '未找到用户排名信息' }
      if (data1 && !data2) return res1
      if (!data1 && data2) return res2

      // 比较更新时间，返回最新的
      const time1 = new Date(data1.updated_at || 0).getTime()
      const time2 = new Date(data2.updated_at || 0).getTime()

      return time1 >= time2 ? res1 : res2
    } catch (error) {
      console.error('Aggregate user rank error:', error)
      return { code: -1, message: '获取用户排名失败' }
    }
  }
}

// 通用接口
export const commonApi = {
  // 上传代码
  uploadCode: (formData) => api.post('/api/upload', formData)
}

export default api
