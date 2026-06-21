import { getCurrentInstance, onUnmounted, ref } from 'vue'

export const useTransientValue = (initialValue) => {
  const value = ref(initialValue)
  let timer = null

  const stopTimer = () => {
    if (!timer) {
      return
    }
    clearTimeout(timer)
    timer = null
  }

  const clear = () => {
    stopTimer()
    value.value = initialValue
  }

  const show = (nextValue, durationMs, onExpired) => {
    stopTimer()
    value.value = nextValue
    timer = setTimeout(() => {
      timer = null
      value.value = initialValue
      onExpired?.()
    }, durationMs)
  }

  if (getCurrentInstance()) {
    onUnmounted(stopTimer)
  }

  return {
    value,
    show,
    clear
  }
}
