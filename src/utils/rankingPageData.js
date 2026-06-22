import { firstDefined } from './valueHelpers.js'

const numberOrDefault = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const positiveNumberOrDefault = (value, fallback) => {
  const parsed = numberOrDefault(value, fallback)
  return parsed > 0 ? parsed : fallback
}

export const normalizeRankingPageData = (pageData, fallbackPage, fallbackPageSize) => {
  const source = pageData && typeof pageData === 'object' ? pageData : {}
  return {
    items: Array.isArray(source.items) ? source.items : [],
    total: numberOrDefault(source.total),
    totalPages: numberOrDefault(firstDefined(source.total_pages, source.totalPages)),
    totalParticipants: numberOrDefault(firstDefined(source.total_participants, source.totalParticipants)),
    maxScore: numberOrDefault(firstDefined(source.max_score, source.maxScore)),
    page: positiveNumberOrDefault(source.page, fallbackPage),
    pageSize: positiveNumberOrDefault(firstDefined(source.page_size, source.pageSize), fallbackPageSize)
  }
}
