<script setup>
import IconSymbol from './IconSymbol.vue'

defineProps({
  title: {
    type: String,
    default: ''
  },
  currentUser: {
    type: Object,
    default: null
  }
})
</script>

<template>
  <header class="header">
    <div class="header-content">
      <div class="logo">
        <span class="logo-mark">
          <IconSymbol name="network" :size="21" />
        </span>
        <span class="logo-text">{{ title }}</span>
      </div>
      <div class="header-right">
        <div class="status-indicator" v-if="currentUser">
          <span class="status-dot"></span>
          <span class="status-text">{{ currentUser.username }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.74);
  border-bottom: 1px solid rgba(71, 96, 136, 0.1);
  backdrop-filter: none;
}

.header-content {
  max-width: 1320px;
  margin: 0 auto;
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-mark {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(180, 35, 47, 0.2);
  border-radius: 8px;
  background: rgba(180, 35, 47, 0.08);
  color: #b4232f;
  box-shadow: 0 10px 22px rgba(23, 44, 76, 0.08);
}

.logo-text {
  font-size: 19px;
  font-weight: 800;
  color: #172033;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid rgba(71, 96, 136, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 24px rgba(23, 44, 76, 0.06);
  backdrop-filter: none;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #b4232f;
  box-shadow: 0 0 0 4px rgba(180, 35, 47, 0.1);
  border-radius: 50%;
}

.status-text {
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
}

@media (max-width: 640px) {
  .header-content {
    padding: 12px 16px;
  }

  .logo-text {
    font-size: 18px;
  }
}
</style>
