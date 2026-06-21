import { computed, ref } from 'vue'
import { userApi } from '../api'
import { requestErrorMessage } from '../utils/requestErrors'
import { normalizeUserProfile } from '../utils/userProfile'
import {
  isEmergencyLoginPath,
  normalizeUserId,
  THIRD_PARTY_USER_ID_QUERY_KEYS,
} from '../utils/userIdentity'
import {
  clearStoredCurrentUser,
  readStoredThirdPartyUserId,
  saveStoredCurrentUser,
  saveStoredThirdPartyUserId
} from '../utils/userStorage'

export const useUserSession = () => {
  const currentUser = ref(null)
  const sessionReady = ref(false)
  const registerForm = ref({
    user_id: '',
    username: ''
  })
  const registerLoading = ref(false)
  const registerError = ref('')
  const isEmergencyLoginPage = ref(isEmergencyLoginPath(window.location.pathname))

  const isCurrentUserTestAccount = computed(() => {
    return Boolean(currentUser.value?.test_account || currentUser.value?.testAccount)
  })

  const saveCurrentUser = (user) => {
    const normalizedUser = saveStoredCurrentUser(user)
    currentUser.value = normalizedUser
    return normalizedUser
  }

  const clearCurrentUser = () => {
    currentUser.value = null
    clearStoredCurrentUser()
  }

  const resolveThirdPartyUserId = () => {
    const params = new URLSearchParams(window.location.search)
    const queryUserId = THIRD_PARTY_USER_ID_QUERY_KEYS
      .map(key => params.get(key))
      .find(value => value)
    const normalizedQueryUserId = saveStoredThirdPartyUserId(queryUserId)
    if (normalizedQueryUserId) {
      return normalizedQueryUserId
    }

    return readStoredThirdPartyUserId()
  }

  const loadExistingSessionUser = async (userId) => {
    if (!userId) {
      return false
    }
    try {
      const res = await userApi.getMe()
      if (res.code === 0 && res.data) {
        const existingUser = normalizeUserProfile(res.data)
        if (existingUser?.user_id && existingUser.user_id !== userId) {
          return false
        }
        saveCurrentUser(existingUser || res.data)
        return true
      }
    } catch (error) {
      if (![401, 403, 404].includes(error?.response?.status)) {
        console.error('Failed to load current user:', error)
      }
    }
    return false
  }

  const bootstrapRegisteredUserSession = async (userId) => {
    if (!userId) {
      return {
        success: false,
        newUserRequired: true,
        message: ''
      }
    }
    try {
      const res = await userApi.addUser({
        user_id: userId,
        username: ''
      })
      if (res.code === 0 && res.data) {
        saveCurrentUser(res.data)
        return {
          success: true,
          newUserRequired: false,
          message: ''
        }
      }
      return {
        success: false,
        newUserRequired: false,
        message: res.message || '参赛信息加载失败'
      }
    } catch (error) {
      const responseMessage = error?.response?.data?.message || ''
      if (error?.response?.status === 400 && responseMessage.includes('请输入昵称')) {
        return {
          success: false,
          newUserRequired: true,
          message: ''
        }
      }
      console.error('Failed to bootstrap registered user session:', error)
      return {
        success: false,
        newUserRequired: false,
        message: requestErrorMessage(error, '参赛信息加载失败', { prefixFallback: true })
      }
    }
  }

  const initializeSession = async () => {
    if (isEmergencyLoginPage.value) {
      sessionReady.value = true
      return
    }
    try {
      const resolvedUserId = resolveThirdPartyUserId()
      registerForm.value.user_id = resolvedUserId
      registerError.value = resolvedUserId ? '' : '未获取到有效工号，请从大赛入口进入'

      const hasSession = await loadExistingSessionUser(resolvedUserId)
      const bootstrapResult = hasSession
        ? { success: true, newUserRequired: false, message: '' }
        : await bootstrapRegisteredUserSession(resolvedUserId)
      if (!bootstrapResult.success) {
        clearCurrentUser()
        registerError.value = bootstrapResult.newUserRequired ? '' : bootstrapResult.message || registerError.value
      }
    } finally {
      sessionReady.value = true
    }
  }

  const loginUser = async () => {
    registerError.value = ''
    const userId = normalizeUserId(registerForm.value.user_id)

    if (!userId || userId.length !== 8) {
      registerError.value = '未获取到有效工号，请先完成第三方登录'
      return
    }
    if (!registerForm.value.username.trim()) {
      registerError.value = '请输入昵称'
      return
    }

    registerLoading.value = true
    try {
      const payload = {
        user_id: userId,
        username: registerForm.value.username.trim()
      }
      const res = await userApi.addUser(payload)

      if (res.code === 0 || res.code === 409) {
        saveCurrentUser(res.data || payload)
      } else {
        registerError.value = res.message || '登录失败'
      }
    } catch (error) {
      console.error('Login error:', error)
      registerError.value = requestErrorMessage(error, '登录失败，请检查网络连接', { prefixFallback: true })
    } finally {
      registerLoading.value = false
    }
  }

  const loginEmergencyUser = async () => {
    registerError.value = ''
    const userId = normalizeUserId(registerForm.value.user_id)

    if (!userId || userId.length !== 8) {
      registerError.value = '请输入有效的 8 位工号'
      return
    }

    registerLoading.value = true
    try {
      const res = await userApi.emergencyLogin({
        user_id: userId,
        username: ''
      })

      if (res.code === 0 && res.data) {
        saveCurrentUser(res.data)
        saveStoredThirdPartyUserId(userId)
        isEmergencyLoginPage.value = false
        window.history.replaceState({}, '', '/')
      } else {
        registerError.value = res.message || '应急登录失败'
      }
    } catch (error) {
      console.error('Emergency login error:', error)
      registerError.value = requestErrorMessage(error, '应急登录失败', { prefixFallback: true })
    } finally {
      registerLoading.value = false
    }
  }

  return {
    currentUser,
    sessionReady,
    registerForm,
    registerLoading,
    registerError,
    isEmergencyLoginPage,
    isCurrentUserTestAccount,
    initializeSession,
    loginUser,
    loginEmergencyUser
  }
}

export const userSessionInternals = {
  normalizeUserId,
  normalizeUserProfile,
  requestErrorMessage
}
