<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content confirm-modal">
      <div class="modal-header">
        <h2>开始判题</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <p class="confirm-title">请确认以下参赛配置信息，准备开始判题</p>

        <div class="info-list">
          <div class="info-item">
            <span class="label">姓名</span>
            <span class="value">{{ data.username }}</span>
          </div>
          <div class="info-item">
            <span class="label">工号</span>
            <span class="value">{{ data.user_id }}</span>
          </div>
          <div class="info-item">
            <span class="label">Agent Name</span>
            <span class="value">{{ data.team_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">本机IP</span>
            <span class="value">{{ data.agent_ip }}</span>
          </div>
          <div class="info-item">
            <span class="label">端口号</span>
            <span class="value">{{ data.agent_port }}</span>
          </div>
        </div>

        <div class="warning-box">
          <span class="warning-icon">⚠️</span>
          <span>确认后将开始判题，请确保Agent服务已启动</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="close">取消</button>
        <button class="btn-submit" @click="submit">
          <span>开始判题</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: Boolean,
  data: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'submit'])

const close = () => {
  emit('close')
}

const submit = () => {
  emit('submit')
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
  max-width: 480px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.15);
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
  padding: 24px;
}

.confirm-title {
  color: #a0aec0;
  margin: 0 0 20px 0;
  font-size: 14px;
}

.info-list {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #718096;
  font-size: 14px;
}

.info-item .value {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.warning-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 13px;
}

.warning-icon {
  font-size: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 212, 255, 0.1);
}

.btn-cancel,
.btn-submit {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #4a5568;
  color: #a0aec0;
}

.btn-cancel:hover {
  border-color: #a0aec0;
  color: #fff;
}

.btn-submit {
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  border: none;
  color: #000;
  min-width: 100px;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
}
</style>
