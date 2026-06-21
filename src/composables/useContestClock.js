import { computed, ref, unref } from 'vue'
import {
  DEFAULT_CONTEST_CONFIG,
  normalizeContestConfig
} from '../config/contestDefaults.js'

const formatDurationText = (remainingMs) => {
  const safeRemainingMs = Math.max(0, remainingMs)
  const totalSeconds = Math.floor(safeRemainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const timestampOf = (value) => new Date(value).getTime()

export const useContestClock = (contestConfig = DEFAULT_CONTEST_CONFIG) => {
  const currentTimeTick = ref(Date.now())
  let clockTimer = null

  const resolvedContestConfig = computed(() => normalizeContestConfig(unref(contestConfig)))
  const competitionStartTime = computed(() => timestampOf(resolvedContestConfig.value.startAt))
  const competitionEndTime = computed(() => timestampOf(resolvedContestConfig.value.endAt))

  const competitionPhase = computed(() => {
    const startTime = competitionStartTime.value
    const endTime = competitionEndTime.value
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return 'unknown'
    }
    if (currentTimeTick.value < startTime) {
      return 'pending'
    }
    if (currentTimeTick.value >= endTime) {
      return 'ended'
    }
    return 'running'
  })

  const competitionCountdownLabel = computed(() => {
    if (competitionPhase.value === 'pending') {
      return '距离个人赛正式开始：'
    }
    if (competitionPhase.value === 'running') {
      return '距离个人赛提交结束：'
    }
    return ''
  })

  const competitionCountdownText = computed(() => {
    const startTime = competitionStartTime.value
    const endTime = competitionEndTime.value
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return '待定'
    }
    if (competitionPhase.value === 'pending') {
      return formatDurationText(startTime - currentTimeTick.value)
    }
    if (competitionPhase.value === 'running') {
      return formatDurationText(endTime - currentTimeTick.value)
    }
    if (competitionPhase.value === 'ended') {
      return '已结束'
    }
    return '待定'
  })

  const startClock = () => {
    stopClock()
    currentTimeTick.value = Date.now()
    clockTimer = setInterval(() => {
      currentTimeTick.value = Date.now()
    }, 1000)
  }

  const stopClock = () => {
    if (clockTimer) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }

  return {
    competitionScheduleText: computed(() => resolvedContestConfig.value.scheduleText),
    competitionPhase,
    competitionCountdownLabel,
    competitionCountdownText,
    isCompetitionPending: computed(() => competitionPhase.value === 'pending'),
    isCompetitionEnded: computed(() => competitionPhase.value === 'ended'),
    startClock,
    stopClock
  }
}
