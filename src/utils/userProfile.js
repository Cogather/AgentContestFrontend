import { normalizeUserId } from './userIdentity.js'

export const normalizeUserProfile = (user) => {
  if (!user) {
    return null
  }

  return {
    ...user,
    uuid: String(user.uuid || user.client_uuid || user.clientUuid || '').trim(),
    user_id: normalizeUserId(user.user_id || user.userId),
    username: String(user.username || '').trim()
  }
}
