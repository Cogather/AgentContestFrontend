<script setup>
import IconSymbol from './IconSymbol.vue'

defineProps({
  form: {
    type: Object,
    required: true
  },
  emergency: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'login-user',
  'login-emergency-user',
  'update:user-id',
  'update:username'
])
</script>

<template>
  <form
    v-if="emergency"
    class="register-panel emergency-login-panel"
    @submit.prevent="emit('login-emergency-user')"
  >
    <div class="register-panel-header">
      <span class="card-icon">
        <IconSymbol name="user" />
      </span>
      <h2>应急登录</h2>
    </div>

    <div class="register-fields">
      <label class="register-field">
        <span>工号</span>
        <input
          :value="form.user_id"
          type="text"
          inputmode="numeric"
          maxlength="20"
          placeholder="请输入已开通应急登录的工号"
          @input="emit('update:user-id', $event.target.value)"
        />
        <p class="register-helper">仅限内部登录异常时使用，登录后仍由后端 Cookie 校验身份</p>
      </label>
    </div>

    <p v-if="error" class="register-error">{{ error }}</p>

    <button class="btn btn-primary register-submit" type="submit" :disabled="loading">
      {{ loading ? '登录中...' : '应急登录' }}
    </button>
  </form>

  <form
    v-else
    class="register-panel"
    @submit.prevent="emit('login-user')"
  >
    <div class="register-panel-header">
      <span class="card-icon">
        <IconSymbol name="user" />
      </span>
      <h2>参赛登录</h2>
    </div>

    <div class="register-fields">
      <div class="register-field">
        <span>工号</span>
        <div class="register-readonly-value" :class="{ empty: !form.user_id }">
          {{ form.user_id || '等待第三方登录返回工号' }}
        </div>
        <p class="register-helper">工号仅供提交使用，不会出现在排行榜中</p>
      </div>

      <label class="register-field">
        <span>昵称</span>
        <input
          :value="form.username"
          type="text"
          maxlength="20"
          placeholder="请输入昵称"
          @input="emit('update:username', $event.target.value)"
        />
        <p class="register-helper">昵称设置后不可修改，请谨慎填写</p>
      </label>
    </div>

    <p v-if="error" class="register-error">{{ error }}</p>

    <button class="btn btn-primary register-submit" type="submit" :disabled="loading || !form.user_id">
      {{ loading ? '登录中...' : '登录' }}
    </button>
  </form>
</template>

<style scoped>
.register-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(71, 96, 136, 0.14);
  border-radius: 8px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 255, 0.84)),
    linear-gradient(90deg, rgba(180, 35, 47, 0.04), transparent 64%);
  box-shadow: 0 18px 42px rgba(23, 44, 76, 0.09);
}

.register-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.register-panel-header h2 {
  margin: 0;
  color: var(--text);
  font-size: 18px;
  font-weight: 750;
}

.card-icon {
  width: 28px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(27, 111, 216, 0.14);
  border-radius: 6px;
  background: rgba(27, 111, 216, 0.07);
  color: #374151;
  box-shadow: inset 0 0 12px rgba(15, 124, 255, 0.05);
}

.register-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.register-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.register-field span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.register-field input,
.register-readonly-value {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid rgba(71, 96, 136, 0.14);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text);
  font: inherit;
}

.register-field input {
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.register-field input:focus {
  border-color: rgba(180, 35, 47, 0.34);
  box-shadow: 0 0 0 3px rgba(180, 35, 47, 0.08);
}

.register-readonly-value {
  display: flex;
  align-items: center;
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 14px;
  font-weight: 700;
}

.register-readonly-value.empty {
  color: var(--muted);
  font-family: inherit;
  font-weight: 500;
}

.register-helper {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.register-error {
  min-height: 20px;
  margin: -4px 0 0;
  color: #b91c1c;
  font-size: 13px;
}

.register-submit {
  width: 100%;
  min-height: 42px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.64;
  transform: none;
  box-shadow: none;
}

.btn-primary {
  border: 1px solid rgba(180, 35, 47, 0.22);
  background: #b4232f;
  color: #fff;
  box-shadow: 0 12px 24px rgba(180, 35, 47, 0.16);
}

.btn-primary:hover:not(:disabled) {
  background: #921927;
  box-shadow: 0 14px 28px rgba(180, 35, 47, 0.2);
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .register-panel {
    padding: 20px;
  }
}
</style>
