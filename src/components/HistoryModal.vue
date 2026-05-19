<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content history-modal">
      <div class="modal-header">
        <h2>历史上传记录</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-state">
          <span class="loading-spinner"></span>
          <span>加载中...</span>
        </div>

        <div v-else-if="history.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <span>暂无历史上传记录</span>
        </div>

        <div v-else class="history-list">
          <div
            v-for="(item, index) in history"
            :key="index"
            class="history-item"
          >
            <div class="history-index">{{ index + 1 }}</div>
            <div class="history-content">
              <div class="history-info">
                <span class="name">{{ item.username }}</span>
                <span class="agent">Agent: {{ item.team_name }}</span>
              </div>
              <div class="history-meta">
                <span class="time">{{ formatTime(item.update_time) }}</span>
                <span class="status" :class="item.status">{{ item.statusText }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-close" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { userApi } from '../api'

const props = defineProps({
  visible: Boolean,
  userId: String
})

const emit = defineEmits(['close'])

const history = ref([])
const loading = ref(false)

watch(() => props.visible, async (newVal) => {
  if (newVal && props.userId) {
    await loadHistory()
  }
})

const loadHistory = async () => {
  loading.value = true
  try {
    // 获取用户信息作为历史上传记录
    const res = await userApi.getUser(props.userId)
    if (res.code === 0 && res.data) {
      // 模拟历史上传记录（实际应该从后端获取）
      history.value = [{
        username: res.data.username,
        team_name: res.data.team_name,
        agent_ip: res.data.agent_ip,
        agent_port: res.data.agent_port,
        update_time: new Date().toISOString(),
        status: 'active',
        statusText: '已提交'
      }]
    } else {
      history.value = []
    }
  } catch (error) {
    console.error('Failed to load history:', error)
    history.value = []
  } finally {
    loading.value = false
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  border: 1px solid rgba(0, 212, 255, 0.2);
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.15);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  color: #00d4ff;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 28px;
  cursor: pointer;
  transition: color 0.3s;
  line-height: 1;
}

.close-btn:hover {
  color: #00d4ff;
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #718096;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 212, 255, 0.2);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}

.history-item:hover {
  border-color: rgba(0, 212, 255, 0.3);
  background: rgba(0, 212, 255, 0.05);
}

.history-index {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  border-radius: 50%;
  color: #000;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.history-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-info .name {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}

.history-info .agent {
  color: #00d4ff;
  font-size: 13px;
  padding: 2px 8px;
  background: rgba(0, 212, 255, 0.1);
  border-radius: 4px;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.history-meta .time {
  color: #718096;
  font-size: 12px;
}

.history-meta .status {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.history-meta .status.active {
  background: rgba(72, 187, 120, 0.2);
  color: #48bb78;
}

.modal-footer {
  display: flex;
  justify-content: center;
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 212, 255, 0.1);
}

.btn-close {
  padding: 10px 48px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
