const isGetRequest = (config) => String(config?.method || '').toLowerCase() === 'get'

const isExpectedSessionProbeError = (error) => {
  return error?.config?.url === '/api/users/me'
    && isGetRequest(error?.config)
    && [401, 403, 404].includes(error?.response?.status)
}

const isOptionalContestConfigError = (error) => {
  return error?.config?.url === '/api/contest/config'
    && isGetRequest(error?.config)
}

export const shouldLogApiError = (error) => {
  return !isExpectedSessionProbeError(error) && !isOptionalContestConfigError(error)
}
