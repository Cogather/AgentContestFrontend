import { computed, onMounted, onUnmounted, ref, unref, watch } from 'vue'
import { userApi } from '../api'
import {
  canShowScoreDetail,
  getTokenUsage,
  mergeQuestionScoreDetails
} from '../utils/submissionScoreDetails'
import { requestErrorMessage } from '../utils/requestErrors'
import {
  canCancelSubmission,
  detailStatusText,
  failedStatusText,
  failureReason,
  formatTime,
  isFailedSubmission,
  scoreDetailUnavailableText,
  statusClassName,
  statusText,
  submissionCreatedTime,
  submissionId
} from '../utils/submissionDisplay'
import { activeSubmissionSummary } from '../utils/submissionSummary'
import { formatNumber } from '../utils/valueHelpers'

const HISTORY_REFRESH_INTERVAL_MS = 5000

export const useSubmissionHistory = ({ userId, username, onCanceled } = {}) => {
  const submissions = ref([])
  const loading = ref(false)
  const errorMessage = ref('')
  const toastMessage = ref('')
  const detailItem = ref(null)
  const selectedQuestion = ref(1)
  const cancelingSubmissionId = ref('')
  const submissionQueueSummary = ref({
    queuedCount: null,
    evaluatingCount: null
  })
  let toastTimer = null
  let historyRefreshTimer = null
  let historyRefreshInFlight = false

  const pageTitle = computed(() => {
    return unref(username) ? `${unref(username)} 的历史提交` : '历史提交记录'
  })

  const activeTaskSummary = computed(() => {
    return activeSubmissionSummary(submissionQueueSummary.value, submissions.value)
  })

  const loadSubmissionQueueSummary = async () => {
    try {
      const res = await userApi.getSubmissionQueueSummary()
      if (res.code === 0 && res.data) {
        submissionQueueSummary.value = res.data
      }
    } catch {
      submissionQueueSummary.value = {
        queuedCount: null,
        evaluatingCount: null
      }
    }
  }

  const loadHistory = async ({ silent = false } = {}) => {
    if (!unref(userId) || historyRefreshInFlight) {
      return
    }
    historyRefreshInFlight = true
    if (!silent) {
      loading.value = true
      errorMessage.value = ''
    }
    try {
      const res = await userApi.getSubmissions()
      if (res.code === 0) {
        submissions.value = Array.isArray(res.data) ? res.data : []
        errorMessage.value = ''
        await loadSubmissionQueueSummary()
      } else if (!silent || submissions.value.length === 0) {
        errorMessage.value = res.message || '历史记录加载失败'
      }
    } catch (error) {
      console.error('Failed to load submissions:', error)
      if (!silent || submissions.value.length === 0) {
        errorMessage.value = requestErrorMessage(error, '历史记录加载失败')
      }
    } finally {
      historyRefreshInFlight = false
      if (!silent) {
        loading.value = false
      }
    }
  }

  const startHistoryAutoRefresh = () => {
    if (historyRefreshTimer || !unref(userId)) {
      return
    }
    historyRefreshTimer = setInterval(() => {
      loadHistory({ silent: true })
    }, HISTORY_REFRESH_INTERVAL_MS)
  }

  const stopHistoryAutoRefresh = () => {
    if (!historyRefreshTimer) {
      return
    }
    clearInterval(historyRefreshTimer)
    historyRefreshTimer = null
  }

  const showToast = (message) => {
    toastMessage.value = message
    if (toastTimer) {
      clearTimeout(toastTimer)
    }
    toastTimer = setTimeout(() => {
      toastMessage.value = ''
      toastTimer = null
    }, 2600)
  }

  const isCancelingSubmission = (item) => {
    return String(cancelingSubmissionId.value) === String(submissionId(item))
  }

  const cancelSubmission = async (item) => {
    const id = submissionId(item)
    if (!id || !canCancelSubmission(item) || cancelingSubmissionId.value) {
      return
    }

    cancelingSubmissionId.value = String(id)
    try {
      const res = await userApi.cancelSubmission(id)
      if (res.code === 0) {
        const canceledSubmission = res.data || {}
        submissions.value = submissions.value.map(current => {
          if (String(submissionId(current)) !== String(id)) {
            return current
          }
          return {
            ...current,
            ...canceledSubmission,
            status: canceledSubmission.status || 'CANCELED',
            message: canceledSubmission.message || '用户已取消提交'
          }
        })
        showToast('已取消提交，可重新上传')
        await loadHistory({ silent: true })
        onCanceled?.({ submissionId: id })
      } else {
        showToast(res.message || '取消提交失败')
      }
    } catch (error) {
      console.error('Failed to cancel submission:', error)
      showToast(requestErrorMessage(error, '取消提交失败'))
    } finally {
      cancelingSubmissionId.value = ''
    }
  }

  const mergedQuestionDetails = computed(() => {
    return detailItem.value ? mergeQuestionScoreDetails(detailItem.value) : []
  })

  const selectedQuestionDetail = computed(() => {
    return mergedQuestionDetails.value.find(item => item.question === selectedQuestion.value)
      || mergedQuestionDetails.value[0]
      || null
  })

  const showFailureReason = (item) => {
    showToast(failureReason(item))
  }

  const openDetail = (item) => {
    detailItem.value = item
    selectedQuestion.value = mergeQuestionScoreDetails(item)[0]?.question || 1
  }

  const closeDetail = () => {
    detailItem.value = null
  }

  watch(userId, () => {
    stopHistoryAutoRefresh()
    if (unref(userId)) {
      loadHistory()
      startHistoryAutoRefresh()
    }
  })

  onMounted(() => {
    if (unref(userId)) {
      loadHistory()
      startHistoryAutoRefresh()
    }
  })

  onUnmounted(() => {
    stopHistoryAutoRefresh()
    if (toastTimer) {
      clearTimeout(toastTimer)
    }
  })

  return {
    submissions,
    loading,
    errorMessage,
    toastMessage,
    detailItem,
    selectedQuestion,
    activeTaskSummary,
    pageTitle,
    mergedQuestionDetails,
    selectedQuestionDetail,
    loadHistory,
    canCancelSubmission,
    canShowScoreDetail,
    cancelSubmission,
    closeDetail,
    detailStatusText,
    failedStatusText,
    failureReason,
    formatNumber,
    formatTime,
    getTokenUsage,
    isFailedSubmission,
    isCancelingSubmission,
    openDetail,
    scoreDetailUnavailableText,
    showFailureReason,
    statusClassName,
    statusText,
    submissionCreatedTime,
    submissionId
  }
}
