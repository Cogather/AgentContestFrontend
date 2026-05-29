<script setup>
const props = defineProps({
  visible: Boolean,
  title: {
    type: String,
    default: '错误提示'
  },
  message: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="error-modal-overlay" @click.self="close">
    <section
      class="error-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
    >
      <div class="error-modal-header">
        <span class="error-mark" aria-hidden="true">!</span>
        <h2 id="error-modal-title">{{ title }}</h2>
        <button class="error-close" type="button" aria-label="关闭" @click="close">×</button>
      </div>
      <p class="error-message">{{ message }}</p>
      <div class="error-actions">
        <button class="error-confirm" type="button" @click="close">确定</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.error-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.42);
}

.error-modal {
  width: min(420px, 100%);
  border: 1px solid rgba(180, 35, 47, 0.2);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  overflow: hidden;
}

.error-modal-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.error-mark {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(180, 35, 47, 0.1);
  color: #b4232f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 850;
}

.error-modal h2 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.3;
}

.error-close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.error-close:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #111827;
}

.error-message {
  margin: 0;
  padding: 18px 20px;
  color: #334155;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 18px;
}

.error-confirm {
  min-width: 86px;
  height: 38px;
  border: 0;
  border-radius: 8px;
  background: #b4232f;
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
}

.error-confirm:hover {
  background: #931f29;
}
</style>
