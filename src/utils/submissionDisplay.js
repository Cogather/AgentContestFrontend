import {
  hasScoreValue,
  normalizeStatus
} from './submissionScoreDetails.js'
import { normalizeEscapedLineBreaks } from './textDisplay.js'
import { firstDefined } from './valueHelpers.js'

const statusTextMap = {
  uploaded: '排队中...',
  uploading: '上传中',
  validating: '校验中',
  evaluating: '评测中',
  completed: '已完成',
  canceled: '已取消',
  failed: '失败'
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
  return normalizeEscapedLineBreaks(item?.message || item?.error_message || item?.errorMessage || '暂无失败原因')
}

export const statusClassName = (item) => normalizeStatus(item?.status)

export const isFailedSubmission = (item) => statusClassName(item) === 'failed'

export const failedStatusText = (item) => `${statusText(item?.status, item)}：${failureReason(item)}`

export const detailStatusText = (item) => {
  return isFailedSubmission(item)
    ? failedStatusText(item)
    : statusText(item?.status, item)
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
