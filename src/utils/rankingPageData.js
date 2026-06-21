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
    totalPages: numberOrDefault(source.total_pages),
    totalParticipants: numberOrDefault(source.total_participants),
    maxScore: numberOrDefault(source.max_score),
    page: positiveNumberOrDefault(source.page, fallbackPage),
    pageSize: positiveNumberOrDefault(source.page_size, fallbackPageSize)
  }
}
