const SECOND_MS = 1000
const MINUTE_SECONDS = 60
const HOUR_SECONDS = 60 * MINUTE_SECONDS
const DAY_SECONDS = 24 * HOUR_SECONDS

export const formatDurationText = (remainingMs) => {
  const safeRemainingMs = Math.max(0, remainingMs)
  const totalSeconds = Math.floor(safeRemainingMs / SECOND_MS)
  const days = Math.floor(totalSeconds / DAY_SECONDS)
  const hours = Math.floor((totalSeconds % DAY_SECONDS) / HOUR_SECONDS)
  const minutes = Math.floor((totalSeconds % HOUR_SECONDS) / MINUTE_SECONDS)
  const seconds = totalSeconds % MINUTE_SECONDS
  return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const timestampOf = (value) => new Date(value).getTime()

export const contestPhaseAt = (now, startTime, endTime) => {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 'unknown'
  }
  if (now < startTime) {
    return 'pending'
  }
  if (now >= endTime) {
    return 'ended'
  }
  return 'running'
}
