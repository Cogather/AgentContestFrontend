import { getCurrentInstance, onUnmounted } from 'vue'

export const useIntervalTimer = (callback, delayMs) => {
  let timer = null

  const stop = () => {
    if (!timer) {
      return
    }
    clearInterval(timer)
    timer = null
  }

  const start = () => {
    if (timer) {
      return
    }
    timer = setInterval(callback, delayMs)
  }

  const restart = () => {
    stop()
    start()
  }

  const isRunning = () => Boolean(timer)

  if (getCurrentInstance()) {
    onUnmounted(stop)
  }

  return {
    start,
    restart,
    stop,
    isRunning
  }
}
