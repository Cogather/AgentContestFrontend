<script setup>
import { ref } from 'vue'
import { commonApi } from '../api'

const props = defineProps({
  visible: Boolean,
  userId: String
})

const emit = defineEmits(['close', 'success'])

const isDragging = ref(false)
const fileInput = ref(null)
const uploading = ref(false)
const selectedFile = ref(null)

const isZipFile = (file) => {
  return file?.name?.toLowerCase().endsWith('.zip')
}

const close = () => {
  if (uploading.value) return
  selectedFile.value = null
  emit('close')
}

const triggerSelect = () => {
  if (uploading.value) return
  fileInput.value.click()
}

const handleDrop = (event) => {
  if (uploading.value) return
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

const prepareUpload = (file, inputTarget = null) => {
  if (!isZipFile(file)) {
    alert('文件类型上传错误，请上传 .zip 格式文件')
    if (inputTarget) inputTarget.value = ''
    return
  }
  selectedFile.value = file
  if (inputTarget) inputTarget.value = ''
}

const cancelUpload = () => {
  selectedFile.value = null
}

const confirmUpload = async () => {
  if (!selectedFile.value) return
  if (!isZipFile(selectedFile.value)) {
    alert('文件类型上传错误，请上传 .zip 格式文件')
    selectedFile.value = null
    return
  }

  uploading.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  // user_id作为路径参数传递，也可保留在formData中，根据需要
  
  try {
    const res = await commonApi.uploadCode(props.userId, formData)
    if (res.code === 0) {
      alert(res.message || '上传成功！')
      selectedFile.value = null
      emit('success')
    } else {
      alert(res.message || '上传失败')
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert(error?.response?.data?.message || '上传出错，请检查网络或重试')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>上传代码</h3>
        <button class="close-btn" @click="close" :disabled="uploading">×</button>
      </div>
      
      <div class="modal-body">
        <div 
          v-if="!selectedFile"
          class="upload-area"
          :class="{ 'is-dragging': isDragging, 'is-uploading': uploading }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerSelect"
        >
          <div class="idle-state">
            <span class="upload-icon">☁️</span>
            <p class="primary-text">点击或拖拽文件到此处上传</p>
            <p class="sub-text">支持 .zip 格式压缩包</p>
          </div>
          
          <input 
            type="file" 
            ref="fileInput" 
            style="display: none" 
            accept=".zip"
            @change="handleFileSelect"
            :disabled="uploading"
          >
        </div>

        <div v-else class="confirm-area">
          <div v-if="uploading" class="uploading-state">
            <div class="spinner"></div>
            <p>正在上传...</p>
          </div>
          <div v-else class="file-info" @click="triggerSelect" title="点击重新选择">
            <span class="file-icon">📦</span>
            <p class="file-name">{{ selectedFile.name }}</p>
            <p class="file-size">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
            <p class="sub-text" style="margin-top: 8px;">(点击可重新选择文件)</p>
            <input 
              type="file" 
              ref="fileInput" 
              style="display: none" 
              accept=".zip"
              @change="handleFileSelect"
              :disabled="uploading"
            >
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close" :disabled="uploading">取消</button>
        <button class="btn btn-primary" @click="confirmUpload" :disabled="!selectedFile || uploading">
          {{ uploading ? '上传中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0 8px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.close-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.modal-body {
  padding: 32px;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: #fafafa;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-area {
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f8fafc;
}

.upload-area:hover {
  border-color: #10b981;
  background: #ecfdf5;
}

.upload-area.is-dragging {
  border-color: #10b981;
  background: #d1fae5;
  transform: scale(1.02);
}

.upload-area.is-uploading {
  cursor: not-allowed;
  border-style: solid;
  border-color: #e2e8f0;
  background: #f8fafc;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.primary-text {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.sub-text {
  font-size: 13px;
  color: #94a3b8;
}

.uploading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.confirm-area {
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.file-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  word-break: break-all;
}

.file-size {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 24px;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  width: 100%;
}

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-primary:hover {
  background: #059669;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover {
  background: #e2e8f0;
}
</style>
