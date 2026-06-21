export const USER_STORAGE_KEY = 'agent_game_user'
export const THIRD_PARTY_USER_ID_STORAGE_KEY = 'agent_game_third_party_user_id'
export const THIRD_PARTY_USER_ID_QUERY_KEYS = ['user_id', 'userId', 'employee_id', 'employeeId', 'work_id', 'workId']
export const EMERGENCY_LOGIN_PATH = '/emergency-login'

export const normalizeUserId = (value) => {
  const normalized = String(value || '').replace(/\D/g, '').slice(0, 8)
  return normalized.length === 8 ? normalized : ''
}

export const isEmergencyLoginPath = (pathname = '') => {
  return String(pathname || '').replace(/\/+$/, '') === EMERGENCY_LOGIN_PATH
}
