import { computed, onMounted, onUnmounted, ref, unref, watch } from 'vue'
import { userApi } from '../api'
import {
  canShowScoreDetail,
  getTokenUsage,
  hasScoreValue,
  mergeQuestionScoreDetails,
  normalizeStatus
} from '../utils/submissionScoreDetails'
import { firstDefined, formatNumber } from '../utils/valueHelpers'

const HISTORY_REFRESH_INTERVAL_MS = 5000

const statusTextMap = {
  uploaded: '排队中...',
  uploading: '上传中',
  validating: '校验中',
  evaluating: '评测中',
  completed: '已完成',
  canceled: '已取消',
  failed: '失败'
}

const numericCount = (...values) => {
  const value = firstDefined(...values)
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.floor(numberValue) : null
}

export const queueAheadCount = (item) => {
  const directCount = firstDefined(
    item?.queue_ahead,
    item?.queueAhead,
    item?.queue_ahead_count,
    item?.queueAheadCount,
    item?.pending_before,
    item?.pendingBefore
  )
  const directNumber = Number(directCount)
  if (Number.isFinite(directNumber) && directNumber >= 0) {
    return Math.floor(directNumber)
  }

  const queuePosition = Number(firstDefined(
    item?.queue_position,
    item?.queuePosition,
    item?.queue_rank,
    item?.queueRank
  ))
  if (Number.isFinite(queuePosition) && queuePosition > 0) {
    return Math.floor(queuePosition - 1)
  }

  return null
}

export const statusText = (status, item = null) => {
  const normalized = normalizeStatus(status)
  if (normalized === 'uploaded') {
    const count = queueAheadCount(item)
    if (count === null) {
      return statusTextMap.uploaded
    }
    return `${statusTextMap.uploaded} 前边还有 ${count} 笔提交在排队`
  }
  return statusTextMap[normalized] || status || '未知'
}

export const failureReason = (item) => {
  return String(item?.message || item?.error_message || item?.errorMessage || '暂无失败原因')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
}

export const detailStatusText = (item) => {
  const text = statusText(item?.status, item)
  if (normalizeStatus(item?.status) !== 'failed') {
    return text
  }
  return `${text}：${failureReason(item)}`
}

export const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const submissionCreatedTime = (item) => {
  return item?.created_at
    || item?.createdAt
    || item?.update_time
    || item?.updatedAt
}

export const submissionId = (item) => {
  return item?.id
    || item?.submission_id
    || item?.submissionId
    || ''
}

export const canCancelSubmission = (item) => {
  return Boolean(submissionId(item)) && String(item?.status || '').toLowerCase() === 'uploaded'
}

export const scoreDetailUnavailableText = (item) => {
  const status = normalizeStatus(item?.status)
  if (status === 'failed') {
    return '无得分'
  }
  if (status === 'uploading' || status === 'uploaded' || status === 'evaluating') {
    return '待评测'
  }
  if (status === 'completed' && hasScoreValue(item)) {
    return '暂无明细'
  }
  return '暂无得分'
}

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

  const countLocalSubmissionsByStatus = (status) => {
    return submissions.value.filter(item => normalizeStatus(item?.status) === status).length
  }

  const activeTaskSummary = computed(() => {
    return {
      queuedCount: numericCount(
        submissionQueueSummary.value?.queuedCount,
        submissionQueueSummary.value?.queued_count,
        countLocalSubmissionsByStatus('uploaded')
      ),
      evaluatingCount: numericCount(
        submissionQueueSummary.value?.evaluatingCount,
        submissionQueueSummary.value?.evaluating_count,
        countLocalSubmissionsByStatus('evaluating')
      )
    }
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
        errorMessage.value = error?.response?.data?.message || '历史记录加载失败'
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
      showToast(error?.response?.data?.message || '取消提交失败')
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
    failureReason,
    formatNumber,
    formatTime,
    getTokenUsage,
    isCancelingSubmission,
    openDetail,
    scoreDetailUnavailableText,
    showFailureReason,
    statusText,
    submissionCreatedTime,
    submissionId
  }
}
