const isTruthyFlag = (value) => {
  if (value === true || value === 1) {
    return true
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.trim().toLowerCase())
  }
  return false
}

export const RANKING_COLUMN_SIZE = 10

export const getSubmissionCount = (item) => item?.submission_count ?? item?.submissionCount ?? 0

export const getRankTokenUsage = (item) => item?.token_usage ?? item?.tokenUsage ?? null

export const isTestAccountRank = (item) => {
  return isTruthyFlag(item?.test_account)
    || isTruthyFlag(item?.testAccount)
}

export const rankRowClass = (item) => ({
  'top-three': item.rank <= 3,
  'rank-first-row': item.rank === 1,
  'rank-second-row': item.rank === 2,
  'rank-third-row': item.rank === 3,
  'top-ten': item.rank > 3 && item.rank <= 10,
  'top-twenty': item.rank > 10 && item.rank <= 20,
  'top-fifty': item.rank > 20 && item.rank <= 50,
  'top-hundred': item.rank > 50 && item.rank <= 100,
  'top-two-hundred': item.rank > 100 && item.rank <= 200
})

export const visiblePageNumbers = (total, current) => {
  const pages = []
  if (total <= 5) {
    for (let page = 1; page <= total; page++) {
      pages.push(page)
    }
    return pages
  }
  if (current <= 3) {
    return [1, 2, 3, 4, 5]
  }
  if (current >= total - 2) {
    for (let page = total - 4; page <= total; page++) {
      pages.push(page)
    }
    return pages
  }
  for (let page = current - 2; page <= current + 2; page++) {
    pages.push(page)
  }
  return pages
}

export const parseJumpPageInput = (value) => {
  const normalized = String(value ?? '').trim()
  if (!/^\d+$/.test(normalized)) {
    return null
  }
  const page = Number(normalized)
  return Number.isSafeInteger(page) && page > 0 ? page : null
}

export const splitIntoRankingColumns = (items, columnSize = RANKING_COLUMN_SIZE) => {
  const sourceItems = Array.isArray(items) ? items : []
  const safeColumnSize = Number.isFinite(Number(columnSize)) && Number(columnSize) > 0
    ? Math.floor(Number(columnSize))
    : RANKING_COLUMN_SIZE
  const columns = []
  for (let index = 0; index < sourceItems.length; index += safeColumnSize) {
    columns.push(sourceItems.slice(index, index + safeColumnSize))
  }
  return columns
}
