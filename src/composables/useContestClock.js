import { computed, ref, unref } from 'vue'
import {
  DEFAULT_CONTEST_CONFIG,
  normalizeContestConfig
} from '../config/contestDefaults.js'
import {
  contestCountdownInfo,
  contestPhaseAt,
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

  const competitionCountdown = computed(() => {
    return contestCountdownInfo({
      phase: competitionPhase.value,
      now: currentTimeTick.value,
      startTime: competitionStartTime.value,
      endTime: competitionEndTime.value
    })
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
    competitionCountdownLabel: computed(() => competitionCountdown.value.label),
    competitionCountdownText: computed(() => competitionCountdown.value.text),
    isCompetitionPending: computed(() => competitionPhase.value === 'pending'),
    isCompetitionEnded: computed(() => competitionPhase.value === 'ended'),
    startClock,
    stopClock
  }
}
