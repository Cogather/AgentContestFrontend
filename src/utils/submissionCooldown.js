const COOLDOWN_ELIGIBLE_STATUSES = new Set([
  'uploaded',
  'evaluating',
  'completed'
])

const submissionCreatedTime = (submission) => {
  return submission?.created_at
    || submission?.createdAt
    || submission?.update_time
    || submission?.updatedAt
}

export const isCooldownEligibleSubmission = (submission) => {
  return COOLDOWN_ELIGIBLE_STATUSES.has(String(submission?.status || '').toLowerCase())
}

export const getLatestCooldownSubmissionTime = (submissions) => {
  if (!Array.isArray(submissions)) {
    return 0
  }

  return submissions
    .filter(isCooldownEligibleSubmission)
    .reduce((latest, submission) => {
      const timestamp = new Date(submissionCreatedTime(submission)).getTime()
      return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest
    }, 0)
}
