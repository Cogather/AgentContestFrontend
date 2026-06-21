export const requestErrorDetail = (error) => {
  const responseMessage = error?.response?.data?.message
  if (responseMessage) {
    return String(responseMessage)
  }
  if (error?.response?.status) {
    return `HTTP ${error.response.status}`
  }
  if (error?.code === 'ECONNABORTED') {
    return '请求超时'
  }
  if (error?.message) {
    return String(error.message)
  }
  return ''
}

export const requestErrorMessage = (error, fallback, { prefixFallback = false } = {}) => {
  const detail = requestErrorDetail(error)
  if (!detail) {
    return fallback
  }
  return prefixFallback ? `${fallback}：${detail}` : detail
}
