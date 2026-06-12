import axios from 'axios'
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const THIRD_PARTY_USER_ID_STORAGE_KEY = 'agent_game_third_party_user_id'
const LOGIN_STATUS_PATH = import.meta.env.VITE_LOGIN_STATUS_PATH || '/auth/login'
const LOGIN_PAGE_URL = import.meta.env.VITE_LOGIN_PAGE_URL || '/auth/login'
const ENABLE_LOGIN_GUARD = import.meta.env.VITE_ENABLE_LOGIN_GUARD === 'true'
const EMERGENCY_LOGIN_PATH = '/emergency-login'
const LOCAL_HTTP_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

const redirectHttpToHttps = () => {
  if (window.location.protocol !== 'http:' || LOCAL_HTTP_HOSTS.has(window.location.hostname)) {
    return false
  }
  const httpsUrl = new URL(window.location.href)
  httpsUrl.protocol = 'https:'
  window.location.replace(httpsUrl.toString())
  return true
}

const normalizeUserId = (value) => {
  const normalized = String(value || '').replace(/\D/g, '').slice(0, 8)
  return normalized.length === 8 ? normalized : ''
}

const extractUserId = (data) => {
  if (!data || typeof data !== 'object') {
    return ''
  }
  return normalizeUserId(
    data.userId ||
    data.user_id ||
    data.employeeId ||
    data.employee_id ||
    data.workId ||
    data.work_id
  )
}

const redirectToLogin = () => {
  const redirectUrl = new URL(LOGIN_PAGE_URL, window.location.origin)
  redirectUrl.searchParams.set('redirect', window.location.href)
  window.location.replace(redirectUrl.toString())
}

const isEmergencyLoginPath = () => {
  return window.location.pathname.replace(/\/+$/, '') === EMERGENCY_LOGIN_PATH
}

const mountApp = () => {
  createApp(App).mount('#app')
}

const initializeApp = async () => {
  if (redirectHttpToHttps()) {
    return
  }

  if (isEmergencyLoginPath()) {
    mountApp()
    return
  }

  if (!ENABLE_LOGIN_GUARD) {
    mountApp()
    return
  }

  try {
    const res = await axios.get(LOGIN_STATUS_PATH, { withCredentials: true })
    const userId = extractUserId(res?.data)
    if (userId) {
      localStorage.setItem(THIRD_PARTY_USER_ID_STORAGE_KEY, userId)
      mountApp()
      return
    }
  } catch (error) {
    console.error('Failed to check third-party login:', error)
  }

  redirectToLogin()
}

initializeApp()
