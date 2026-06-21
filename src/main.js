import axios from 'axios'
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import {
  isEmergencyLoginPath,
  normalizeUserIdFromRecord
} from './utils/userIdentity'
import { redirectHttpToHttps, redirectToLogin } from './utils/appBootstrap'
import { saveStoredThirdPartyUserId } from './utils/userStorage'

const LOGIN_STATUS_PATH = import.meta.env.VITE_LOGIN_STATUS_PATH || '/auth/login'
const LOGIN_PAGE_URL = import.meta.env.VITE_LOGIN_PAGE_URL || '/auth/login'
const ENABLE_LOGIN_GUARD = import.meta.env.VITE_ENABLE_LOGIN_GUARD === 'true'

const mountApp = () => {
  createApp(App).mount('#app')
}

const initializeApp = async () => {
  if (redirectHttpToHttps()) {
    return
  }

  if (isEmergencyLoginPath(window.location.pathname)) {
    mountApp()
    return
  }

  if (!ENABLE_LOGIN_GUARD) {
    mountApp()
    return
  }

  try {
    const res = await axios.get(LOGIN_STATUS_PATH, { withCredentials: true })
    const userId = normalizeUserIdFromRecord(res?.data)
    if (userId) {
      saveStoredThirdPartyUserId(userId)
      mountApp()
      return
    }
  } catch (error) {
    console.error('Failed to check third-party login:', error)
  }

  redirectToLogin(LOGIN_PAGE_URL)
}

initializeApp()
