<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>个人参赛配置</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>姓名 <span class="required">*</span></label>
          <input
            type="text"
            v-model="formData.username"
            placeholder="请输入姓名"
            maxlength="20"
          />
        </div>
        <div class="form-group">
          <label>工号 <span class="required">*</span></label>
          <input
            type="text"
            v-model="formData.user_id"
            placeholder="请输入8位工号"
            maxlength="8"
            @input="validateUserId"
          />
          <span class="hint" v-if="formData.user_id && formData.user_id.length !== 8">工号必须为8位</span>
        </div>
        <div class="form-group">
          <label>Agent Name <span class="required">*</span></label>
          <input
            type="text"
            v-model="formData.team_name"
            placeholder="请输入Agent名称"
            maxlength="50"
          />
        </div>
        <div class="form-group">
          <label>本机IP地址 <span class="required">*</span></label>
          <input
            type="text"
            v-model="formData.agent_ip"
            placeholder="例如: 192.168.1.100"
          />
        </div>
        <div class="form-group">
          <label>端口号 <span class="required">*</span></label>
          <input
            type="number"
            v-model="formData.agent_port"
            placeholder="例如: 8080"
            min="1"
            max="65535"
          />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="close">取消</button>
        <button class="btn-confirm" @click="confirm">保存配置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  initialData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'confirm'])

const formData = ref({
  username: '',
  user_id: '',
  team_name: '',
  agent_ip: '',
  agent_port: ''
})

watch(() => props.initialData, (newVal) => {
  if (newVal) {
    formData.value = { ...formData.value, ...newVal }
  }
}, { immediate: true })

const validateUserId = (e) => {
  // 只允许数字输入
  formData.value.user_id = e.target.value.replace(/\D/g, '')
}

const close = () => {
  emit('close')
}

const confirm = () => {
  // 表单验证
  if (!formData.value.username.trim()) {
    alert('请输入姓名')
    return
  }
  if (!formData.value.user_id || formData.value.user_id.length !== 8) {
    alert('请输入8位工号')
    return
  }
  if (!formData.value.team_name.trim()) {
    alert('请输入Agent名称')
    return
  }
  if (!formData.value.agent_ip.trim()) {
    alert('请输入本机IP地址')
    return
  }
  if (!formData.value.agent_port || formData.value.agent_port < 1 || formData.value.agent_port > 65535) {
    alert('请输入有效的端口号')
    return
  }

  emit('confirm', {
    ...formData.value,
    agent_port: parseInt(formData.value.agent_port)
  })
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

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #a0aec0;
  font-size: 14px;
}

.required {
  color: #ff6b6b;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.2);
}

.form-group input::placeholder {
  color: #4a5568;
}

.hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #ff6b6b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 212, 255, 0.1);
}

.btn-cancel,
.btn-confirm {
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

.btn-confirm {
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  border: none;
  color: #000;
}

.btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
}
</style>
