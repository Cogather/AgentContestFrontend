import { computed, ref, unref } from 'vue'
import {
  DEFAULT_CONTEST_CONFIG,
  normalizeContestConfig
} from '../config/contestDefaults.js'
import {
  contestPhaseAt,
  formatDurationText,
  timestampOf
} from '../utils/contestTime.js'

export const useContestClock = (contestConfig = DEFAULT_CONTEST_CONFIG) => {
  const currentTimeTick = ref(Date.now())
  let clockTimer = null

  const resolvedContestConfig = computed(() => normalizeContestConfig(unref(contestConfig)))
  const competitionStartTime = computed(() => timestampOf(resolvedContestConfig.value.startAt))
  const competitionEndTime = computed(() => timestampOf(resolvedContestConfig.value.endAt))

  const competitionPhase = computed(() => {
    return contestPhaseAt(currentTimeTick.value, competitionStartTime.value, competitionEndTime.value)
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
