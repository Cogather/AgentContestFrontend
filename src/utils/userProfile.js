import { normalizeUserId } from './userIdentity.js'
import { isTruthyFlag } from './valueHelpers.js'

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

export const isTestAccountProfile = (user) => {
  return isTruthyFlag(user?.test_account) || isTruthyFlag(user?.testAccount)
}
