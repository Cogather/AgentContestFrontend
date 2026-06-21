import { ref } from 'vue'

export const useErrorDialog = () => {
  const errorDialog = ref({
    visible: false,
    message: ''
  })

  const showErrorDialog = (message) => {
    errorDialog.value = {
      visible: true,
      message
    }
  }

  const closeErrorDialog = () => {
    errorDialog.value = {
      visible: false,
      message: ''
    }
  }

  return {
    errorDialog,
    showErrorDialog,
    closeErrorDialog
  }
}
