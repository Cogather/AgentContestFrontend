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
const invalidZipMessage = '程序包的格式错误，请上传zip格式的压缩包'

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
    alert(invalidZipMessage)
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
    alert(invalidZipMessage)
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
            <span class="upload-icon">ZIP</span>
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
            <span class="file-icon">ZIP</span>
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
  border-color: #b4232f;
  background: #ecfdf5;
}

.upload-area.is-dragging {
  border-color: #b4232f;
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
  border-top-color: #b4232f;
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
  background: #b4232f;
  color: white;
}

.btn-primary:hover {
  background: #921927;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

/* Enterprise event upload dialog theme */
.modal-overlay {
  background: rgba(17, 24, 39, 0.42);
  backdrop-filter: blur(8px);
}

.modal-content {
  max-width: 520px;
  border: 1px solid rgba(71, 96, 136, 0.14);
  border-radius: 8px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 255, 0.86));
  box-shadow: 0 24px 64px rgba(23, 44, 76, 0.22);
}

.modal-content::before {
  content: "";
  display: block;
  height: 3px;
  background: linear-gradient(90deg, #b4232f, #1b6fd8 46%, #64748b 72%, #8177d8);
}

.modal-header {
  border-bottom-color: rgba(71, 96, 136, 0.1);
  background: rgba(255, 255, 255, 0.58);
}

.modal-header h3 {
  color: #111827;
  font-weight: 800;
}

.close-btn {
  color: #627086;
}

.close-btn:hover {
  color: #111827;
}

.modal-footer {
  border-top-color: rgba(71, 96, 136, 0.1);
  background: rgba(255, 255, 255, 0.58);
}

.upload-area,
.confirm-area {
  border: 1px dashed rgba(71, 96, 136, 0.22);
  border-radius: 8px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.86), rgba(246, 250, 255, 0.74)),
    linear-gradient(90deg, rgba(27, 111, 216, 0.04), transparent);
}

.upload-area:hover,
.upload-area.is-dragging {
  border-color: rgba(180, 35, 47, 0.32);
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.92), rgba(246, 250, 255, 0.78)),
    linear-gradient(90deg, rgba(180, 35, 47, 0.055), transparent);
  transform: none;
}

.upload-icon,
.file-icon {
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(180, 35, 47, 0.18);
  border-radius: 8px;
  background: rgba(180, 35, 47, 0.08);
  color: #b4232f;
  font-size: 15px;
  font-weight: 850;
  letter-spacing: 0;
}

.primary-text,
.file-name {
  color: #111827;
  font-weight: 700;
}

.sub-text,
.file-size {
  color: #627086;
}

.spinner {
  border-color: rgba(180, 35, 47, 0.16);
  border-top-color: #b4232f;
}

.btn {
  border-radius: 6px;
  font-weight: 700;
}

.btn-primary {
  background: #b4232f;
  color: #ffffff;
}

.btn-primary:hover {
  background: #921927;
}

.btn-secondary {
  border: 1px solid rgba(71, 96, 136, 0.16);
  background: rgba(255, 255, 255, 0.78);
  color: #1f2a44;
}

.btn-secondary:hover {
  border-color: rgba(27, 111, 216, 0.24);
  background: rgba(27, 111, 216, 0.06);
}

/* Reduce foreground blue for red-white enterprise style */
.modal-content::before {
  background: linear-gradient(90deg, transparent, #b4232f 18%, #4b5563 72%, transparent);
}

.upload-area,
.confirm-area {
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.76)),
    linear-gradient(90deg, rgba(180, 35, 47, 0.035), transparent);
}

.btn-secondary:hover {
  border-color: rgba(180, 35, 47, 0.2);
  background: rgba(180, 35, 47, 0.055);
  color: #b4232f;
}
</style>
