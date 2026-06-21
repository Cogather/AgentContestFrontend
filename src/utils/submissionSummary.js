import { normalizeStatus } from './submissionScoreDetails.js'

const numericCount = (...values) => {
  for (const value of values) {
    const numberValue = Number(value)
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(numberValue) && numberValue >= 0) {
      return Math.floor(numberValue)
    }
  }
  return null
}

export const countSubmissionsByStatus = (submissions, status) => {
  return (Array.isArray(submissions) ? submissions : [])
    .filter(item => normalizeStatus(item?.status) === status)
    .length
}

export const activeSubmissionSummary = (summary, submissions) => ({
  queuedCount: numericCount(
    summary?.queuedCount,
    summary?.queued_count,
    countSubmissionsByStatus(submissions, 'uploaded')
  ),
  evaluatingCount: numericCount(
    summary?.evaluatingCount,
    summary?.evaluating_count,
    countSubmissionsByStatus(submissions, 'evaluating')
  )
})
