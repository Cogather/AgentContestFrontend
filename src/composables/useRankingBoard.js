import { computed, onMounted, ref, unref, watch } from 'vue'
import { rankApi } from '../api'

const RANKING_COLUMN_SIZE = 10

const isTruthyFlag = (value) => {
  if (value === true || value === 1) {
    return true
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.trim().toLowerCase())
  }
  return false
}

export const getSubmissionCount = (item) => item?.submission_count ?? item?.submissionCount ?? 0

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

const emptyPersonalRank = () => ({
  rank: '-',
  score: 0,
  token_usage: null,
  submission_count: 0
})

const visiblePageNumbers = (total, current) => {
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

export const useRankingBoard = (currentUserId) => {
  const rankingList = ref([])
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalItems = ref(0)
  const totalPagesCount = ref(0)
  const totalParticipantsCount = ref(0)
  const maxScore = ref(0)
  const personalRank = ref(null)
  const jumpPageNum = ref('')
  const searchValue = ref('')
  const sortField = ref('score')
  const sortOrder = ref('desc')
  const rankingError = ref('')
  let rankingRequestSeq = 0
  let personalRankRequestSeq = 0

  const searchPlaceholder = computed(() => '搜索昵称...')
  const totalParticipants = computed(() => totalParticipantsCount.value)
  const totalScore = computed(() => maxScore.value)
  const totalPages = computed(() => totalPagesCount.value)
  const paginatedList = computed(() => rankingList.value)
  const rankingColumns = computed(() => {
    const columns = []
    for (let index = 0; index < paginatedList.value.length; index += RANKING_COLUMN_SIZE) {
      columns.push(paginatedList.value.slice(index, index + RANKING_COLUMN_SIZE))
    }
    return columns
  })
  const visiblePages = computed(() => visiblePageNumbers(totalPages.value, currentPage.value))

  const sortIconFor = (field) => {
    if (sortField.value !== field) {
      return '↕'
    }
    return sortOrder.value === 'desc' ? '↓' : '↑'
  }

  const toggleSort = (field) => {
    if (sortField.value === field) {
      sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
      return
    }
    sortField.value = field
    sortOrder.value = 'desc'
  }

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const handleJump = () => {
    const page = parseInt(jumpPageNum.value)
    if (page >= 1 && page <= totalPages.value) {
      changePage(page)
      jumpPageNum.value = ''
    }
  }

  const loadPersonalRank = async () => {
    const requestSeq = ++personalRankRequestSeq
    if (!unref(currentUserId)) {
      personalRank.value = null
      return
    }

    try {
      const userRankRes = await rankApi.getUserRank()
      if (requestSeq !== personalRankRequestSeq) return
      personalRank.value = userRankRes?.data || emptyPersonalRank()
    } catch {
      if (requestSeq !== personalRankRequestSeq) return
      personalRank.value = emptyPersonalRank()
    }
  }

  const loadRanking = async (silent = false) => {
    const requestSeq = ++rankingRequestSeq
    const requestPage = currentPage.value
    const requestPageSize = pageSize.value
    const requestKeyword = searchValue.value.trim()
    const requestSortField = sortField.value
    const requestSortOrder = sortOrder.value

    try {
      const res = await rankApi.getRankPage({
        page: requestPage,
        pageSize: requestPageSize,
        searchField: 'nickname',
        keyword: requestKeyword,
        sortField: requestSortField,
        sortOrder: requestSortOrder
      })

      if (requestSeq !== rankingRequestSeq) return

      if (res.code === 0 && res.data) {
        const pageData = res.data
        rankingError.value = ''
        rankingList.value = pageData.items || []
        totalItems.value = Number(pageData.total || 0)
        totalPagesCount.value = Number(pageData.total_pages || 0)
        totalParticipantsCount.value = Number(pageData.total_participants || 0)
        maxScore.value = Number(pageData.max_score || 0)
        currentPage.value = Number(pageData.page || requestPage)
        pageSize.value = Number(pageData.page_size || requestPageSize)
      } else {
        rankingError.value = res.message || '排行榜加载失败，请稍后重试'
        rankingList.value = []
        totalItems.value = 0
        totalPagesCount.value = 0
      }

      await loadPersonalRank()
    } catch (error) {
      if (requestSeq !== rankingRequestSeq) return
      if (!silent) console.error('Failed to load ranking:', error)
      if (!silent || rankingList.value.length === 0) {
        rankingError.value = error?.response?.data?.message || '排行榜加载失败，请稍后重试'
      }
      if (rankingList.value.length === 0) {
        totalItems.value = 0
        totalPagesCount.value = 0
      }
      await loadPersonalRank()
    }
  }

  const reloadFirstPage = () => {
    if (currentPage.value === 1) {
      loadRanking(true)
      return
    }
    currentPage.value = 1
  }

  const refresh = () => loadRanking(false)

  onMounted(() => {
    loadRanking(false)
  })

  watch(currentPage, () => loadRanking(true))
  watch([pageSize, searchValue, sortField, sortOrder], reloadFirstPage)
  watch(currentUserId, () => loadPersonalRank())

  return {
    rankingList,
    currentPage,
    pageSize,
    totalItems,
    personalRank,
    jumpPageNum,
    searchValue,
    sortField,
    rankingError,
    searchPlaceholder,
    totalParticipants,
    totalScore,
    totalPages,
    paginatedList,
    rankingColumns,
    visiblePages,
    sortIconFor,
    toggleSort,
    rankRowClass,
    getSubmissionCount,
    isTestAccountRank,
    changePage,
    handleJump,
    refresh
  }
}
