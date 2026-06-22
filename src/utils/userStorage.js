import {
  normalizeUserId,
  THIRD_PARTY_USER_ID_STORAGE_KEY,
  USER_STORAGE_KEY
} from './userIdentity.js'
import { normalizeUserProfile } from './userProfile.js'

const browserStorage = () => {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
}

const readJsonStorageItem = (key) => {
  const storage = browserStorage()
  if (!storage) {
    return null
  }

  try {
    return JSON.parse(storage.getItem(key) || 'null')
  } catch {
    storage.removeItem(key)
    return null
  }
}

export const readStoredCurrentUser = () => {
  const storedUser = readJsonStorageItem(USER_STORAGE_KEY)
  return normalizeUserProfile(storedUser) || storedUser
}

export const saveStoredCurrentUser = (user) => {
  const normalizedUser = normalizeUserProfile(user) || user
  const storage = browserStorage()
  if (storage) {
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
  }
  return normalizedUser
}

export const clearStoredCurrentUser = () => {
  const storage = browserStorage()
  if (storage) {
    storage.removeItem(USER_STORAGE_KEY)
  }
}

export const readStoredThirdPartyUserId = () => {
  const storage = browserStorage()
  return normalizeUserId(storage?.getItem(THIRD_PARTY_USER_ID_STORAGE_KEY))
}

export const saveStoredThirdPartyUserId = (userId) => {
  const normalizedUserId = normalizeUserId(userId)
  const storage = browserStorage()
  if (storage && normalizedUserId) {
    storage.setItem(THIRD_PARTY_USER_ID_STORAGE_KEY, normalizedUserId)
  }
  return normalizedUserId
}

export const getCurrentStoredUserId = () => {
  return readStoredThirdPartyUserId()
    || normalizeUserId(readStoredCurrentUser()?.user_id)
}
