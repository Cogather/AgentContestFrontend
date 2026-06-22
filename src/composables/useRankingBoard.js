import { computed, onMounted, ref, unref, watch } from 'vue'
import { rankApi } from '../api'
import {
  getRankTokenUsage,
  getSubmissionCount,
  isTestAccountRank,
  parseJumpPageInput,
  rankRowClass,
  splitIntoRankingColumns,
  visiblePageNumbers
} from '../utils/rankingDisplay'
import { normalizeRankingPageData } from '../utils/rankingPageData'
import { requestErrorMessage } from '../utils/requestErrors'

const emptyPersonalRank = () => ({
  rank: '-',
  score: 0,
  token_usage: null,
  submission_count: 0
})

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
  const rankingColumns = computed(() => splitIntoRankingColumns(paginatedList.value))
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
    const page = parseJumpPageInput(jumpPageNum.value)
    if (page !== null && page <= totalPages.value) {
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
        const pageData = normalizeRankingPageData(res.data, requestPage, requestPageSize)
        rankingError.value = ''
        rankingList.value = pageData.items
        totalItems.value = pageData.total
        totalPagesCount.value = pageData.totalPages
        totalParticipantsCount.value = pageData.totalParticipants
        maxScore.value = pageData.maxScore
        currentPage.value = pageData.page
        pageSize.value = pageData.pageSize
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
        rankingError.value = requestErrorMessage(error, '排行榜加载失败，请稍后重试')
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
    getRankTokenUsage,
    getSubmissionCount,
    isTestAccountRank,
    changePage,
    handleJump,
    refresh
  }
}
