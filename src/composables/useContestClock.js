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
import { useIntervalTimer } from './useIntervalTimer.js'

export const useContestClock = (contestConfig = DEFAULT_CONTEST_CONFIG) => {
  const currentTimeTick = ref(Date.now())
  const clockTimer = useIntervalTimer(() => {
    currentTimeTick.value = Date.now()
  }, 1000)

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
    currentTimeTick.value = Date.now()
    clockTimer.restart()
  }

  const stopClock = () => {
    clockTimer.stop()
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
