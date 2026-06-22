export const firstDefined = (...values) => {
  return values.find(value => value !== null && value !== undefined && value !== '')
}

export const formatNumber = (value, options = {}) => {
  const {
    emptyFallback = '-',
    invalidFallback = '-'
  } = options
  if (value === null || value === undefined || value === '') {
    return emptyFallback
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString('zh-CN') : invalidFallback
}

export const isTruthyFlag = (value) => {
  if (value === true || value === 1) {
    return true
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.trim().toLowerCase())
  }
  return false
}
