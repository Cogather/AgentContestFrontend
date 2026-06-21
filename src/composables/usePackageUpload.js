import { onUnmounted, ref } from 'vue'
import { commonApi } from '../api'
import { requestErrorMessage } from '../utils/requestErrors'

const invalidZipMessage = '程序包的格式错误，请上传zip格式的压缩包'
const uploadLimitText = '仅支持 100MB 以内 .zip 压缩包'

const isZipFile = (file) => {
  return file?.name?.toLowerCase().endsWith('.zip')
}

export const usePackageUpload = ({ onClose, onSuccess } = {}) => {
  const isDragging = ref(false)
  const fileInput = ref(null)
  const uploading = ref(false)
  const uploadSucceeded = ref(false)
  const uploadError = ref('')
  const selectedFile = ref(null)
  let successTimer = null

  const close = () => {
    if (uploading.value || uploadSucceeded.value) return
    selectedFile.value = null
    uploadSucceeded.value = false
    uploadError.value = ''
    onClose?.()
  }

  const triggerSelect = () => {
    if (uploading.value || uploadSucceeded.value) return
    fileInput.value?.click()
  }

  const prepareUpload = (file, inputTarget = null) => {
    if (!isZipFile(file)) {
      selectedFile.value = null
      uploadError.value = invalidZipMessage
      if (inputTarget) inputTarget.value = ''
      return
    }
    selectedFile.value = file
    uploadSucceeded.value = false
    uploadError.value = ''
    if (inputTarget) inputTarget.value = ''
  }

  const handleDrop = (event) => {
    if (uploading.value || uploadSucceeded.value) return
    isDragging.value = false
    const file = event.dataTransfer.files[0]
    if (file) {
      prepareUpload(file)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      prepareUpload(file, event.target)
    }
  }

  const cancelUpload = () => {
    if (uploading.value || uploadSucceeded.value) return
    selectedFile.value = null
    uploadError.value = ''
  }

  const completeUpload = () => {
    uploadSucceeded.value = true
    selectedFile.value = null
    if (successTimer) {
      clearTimeout(successTimer)
    }
    successTimer = window.setTimeout(() => {
      successTimer = null
      uploadSucceeded.value = false
      onSuccess?.()
    }, 900)
  }

  const confirmUpload = async () => {
    if (uploading.value || !selectedFile.value) return
    if (!isZipFile(selectedFile.value)) {
      selectedFile.value = null
      uploadError.value = invalidZipMessage
      return
    }

    uploading.value = true
    uploadError.value = ''
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    try {
      const res = await commonApi.uploadCode(formData)
      if (res.code === 0) {
        completeUpload()
      } else {
        uploadError.value = res.message || '上传失败'
      }
    } catch (error) {
      console.error('Upload error:', error)
      uploadError.value = requestErrorMessage(error, '上传出错，请检查网络或重试')
    } finally {
      uploading.value = false
    }
  }

  onUnmounted(() => {
    if (successTimer) {
      clearTimeout(successTimer)
    }
  })

  return {
    isDragging,
    fileInput,
    uploading,
    uploadSucceeded,
    uploadError,
    selectedFile,
    invalidZipMessage,
    uploadLimitText,
    close,
    triggerSelect,
    handleDrop,
    handleFileSelect,
    prepareUpload,
    cancelUpload,
    completeUpload,
    confirmUpload
  }
}
