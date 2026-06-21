import { ref } from 'vue'
import { contestApi } from '../api'
import {
  DEFAULT_CONTEST_CONFIG,
  normalizeContestConfig
} from '../config/contestDefaults.js'
import { requestErrorMessage } from '../utils/requestErrors.js'

export const useContestConfig = () => {
  const contestConfig = ref(DEFAULT_CONTEST_CONFIG)
  const contestConfigReady = ref(false)
  const contestConfigError = ref('')

  const loadContestConfig = async () => {
    contestConfigError.value = ''
    try {
      const res = await contestApi.getConfig()
      if (res.code === 0 && res.data) {
        contestConfig.value = normalizeContestConfig(res.data)
      }
    } catch (error) {
      contestConfig.value = DEFAULT_CONTEST_CONFIG
      contestConfigError.value = requestErrorMessage(error, '赛事配置加载失败')
    } finally {
      contestConfigReady.value = true
    }
  }

  return {
    contestConfig,
    contestConfigReady,
    contestConfigError,
    loadContestConfig
  }
}
