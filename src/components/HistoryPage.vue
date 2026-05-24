<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { userApi } from '../api'
import IconSymbol from './IconSymbol.vue'

const props = defineProps({
  userId: String,
  username: String
})

const emit = defineEmits(['back'])

const submissions = ref([])
const loading = ref(false)
const errorMessage = ref('')
const toastMessage = ref('')
const detailItem = ref(null)
let toastTimer = null

const statusTextMap = {
  uploaded: '已提交',
  uploading: '上传中',
  validating: '校验中',
  evaluating: '评测中',
  completed: '已完成',
  failed: '失败'
}

const pageTitle = computed(() => {
  return props.username ? `${props.username} 的历史提交` : '历史提交记录'
})

watch(() => props.userId, () => {
  if (props.userId) {
    loadHistory()
  }
})

onMounted(() => {
  if (props.userId) {
    loadHistory()
  }
})

const loadHistory = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await userApi.getSubmissions(props.userId)
    if (res.code === 0) {
      submissions.value = Array.isArray(res.data) ? res.data : []
    } else {
      errorMessage.value = res.message || '历史记录加载失败'
    }
  } catch (error) {
    console.error('Failed to load submissions:', error)
    errorMessage.value = error?.response?.data?.message || '历史记录加载失败'
  } finally {
    loading.value = false
  }
}

const normalizeStatus = (status) => String(status || 'uploaded').toLowerCase()

const statusText = (status) => {
  const normalized = normalizeStatus(status)
  return statusTextMap[normalized] || status || '未知'
}

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString('zh-CN') : value
}

const showFailureReason = (item) => {
  showToast(item.message || '暂无失败原因')
}

const showToast = (message) => {
  toastMessage.value = message
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
    toastTimer = null
  }, 2600)
}

const openDetail = (item) => {
  detailItem.value = item
}

const closeDetail = () => {
  detailItem.value = null
}
</script>

<template>
  <main class="history-page">
    <section class="history-shell">
      <div class="history-toolbar">
        <button class="back-btn" type="button" @click="emit('back')">
          <IconSymbol name="arrow-left" :size="16" />
          返回
        </button>
        <div class="history-heading">
          <span>历史提交记录</span>
          <h1>{{ pageTitle }}</h1>
        </div>
        <button class="refresh-btn" type="button" @click="loadHistory" :disabled="loading">
          刷新
        </button>
      </div>

      <div v-if="loading" class="state-panel">加载中...</div>
      <div v-else-if="errorMessage" class="state-panel error-state">{{ errorMessage }}</div>
      <div v-else-if="submissions.length === 0" class="state-panel">暂无历史提交记录</div>

      <div v-else class="history-table-wrap">
        <div class="history-table">
          <div class="history-row history-header">
            <div>提交时间</div>
            <div>总得分</div>
            <div>总 token 消耗</div>
            <div>当前状态</div>
          </div>

          <div
            v-for="item in submissions"
            :key="item.id"
            class="history-row"
          >
            <div class="time-cell">{{ formatTime(item.created_at || item.update_time) }}</div>
            <div class="score-cell">
              <span>{{ formatNumber(item.score) }}</span>
              <button class="detail-link" type="button" @click="openDetail(item)">查看详情</button>
            </div>
            <div>{{ formatNumber(item.token_usage) }}</div>
            <div>
              <button
                v-if="normalizeStatus(item.status) === 'failed'"
                class="status-pill failed clickable"
                type="button"
                @click="showFailureReason(item)"
              >
                {{ statusText(item.status) }}
              </button>
              <span v-else class="status-pill" :class="normalizeStatus(item.status)">
                {{ statusText(item.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>

    <div v-if="detailItem" class="detail-overlay" @click.self="closeDetail">
      <div class="detail-dialog">
        <div class="detail-header">
          <h2>提交详情</h2>
          <button type="button" class="detail-close" @click="closeDetail">×</button>
        </div>
        <div class="detail-body">
          <div class="detail-line">
            <span>提交编号</span>
            <strong>{{ detailItem.id }}</strong>
          </div>
          <div class="detail-line">
            <span>提交时间</span>
            <strong>{{ formatTime(detailItem.created_at || detailItem.update_time) }}</strong>
          </div>
          <div class="detail-line">
            <span>总得分</span>
            <strong>{{ formatNumber(detailItem.score) }}</strong>
          </div>
          <div class="detail-line">
            <span>总 token 消耗</span>
            <strong>{{ formatNumber(detailItem.token_usage) }}</strong>
          </div>
          <div class="detail-line">
            <span>当前状态</span>
            <strong>{{ statusText(detailItem.status) }}</strong>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.history-page {
  min-height: calc(100vh - 72px);
  padding: 104px 24px 48px;
}

.history-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.history-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 20px;
  align-items: center;
  margin-bottom: 24px;
}

.history-heading span {
  display: block;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 6px;
}

.history-heading h1 {
  color: #0f172a;
  font-size: 28px;
  line-height: 1.2;
}

.back-btn,
.refresh-btn {
  border: 1px solid rgba(29, 78, 216, 0.16);
  background: #ffffff;
  color: #4b5563;
  border-radius: 8px;
  min-height: 38px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.state-panel {
  min-height: 220px;
  border: 1px solid rgba(29, 78, 216, 0.13);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.error-state {
  color: #dc2626;
}

.history-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(29, 78, 216, 0.13);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.history-table {
  min-width: 760px;
}

.history-row {
  display: grid;
  grid-template-columns: minmax(190px, 1.2fr) minmax(160px, 0.9fr) minmax(170px, 0.9fr) minmax(140px, 0.8fr);
  gap: 16px;
  align-items: center;
  padding: 15px 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.history-row:last-child {
  border-bottom: 0;
}

.history-header {
  background: #f8fbff;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.time-cell {
  color: #334155;
}

.score-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-link {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font-weight: 600;
}

.detail-link:hover {
  text-decoration: underline;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgba(37, 99, 235, 0.1);
  color: #4b5563;
  font-size: 13px;
  font-weight: 700;
}

.status-pill.completed {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

.status-pill.failed {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.status-pill.uploading,
.status-pill.validating,
.status-pill.evaluating {
  background: rgba(8, 145, 178, 0.1);
  color: #64748b;
}

.status-pill.clickable {
  cursor: pointer;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  max-width: min(520px, calc(100vw - 32px));
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.94);
  color: #ffffff;
  z-index: 1200;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
}

.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1100;
}

.detail-dialog {
  width: min(460px, 100%);
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.detail-header h2 {
  font-size: 18px;
  color: #0f172a;
}

.detail-close {
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 24px;
  cursor: pointer;
}

.detail-body {
  padding: 18px 20px 22px;
  display: grid;
  gap: 12px;
}

.detail-line {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #64748b;
}

.detail-line strong {
  color: #0f172a;
  text-align: right;
}

@media (max-width: 720px) {
  .history-page {
    padding: 88px 14px 36px;
  }

  .history-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .history-heading h1 {
    font-size: 22px;
  }

  .back-btn,
  .refresh-btn {
    justify-content: center;
  }
}

/* Enterprise event history theme */
.history-page {
  min-height: 100vh;
  padding: 112px 24px 56px;
  background:
    radial-gradient(circle at 80% 10%, rgba(27, 111, 216, 0.12), transparent 30%),
    radial-gradient(circle at 18% 18%, rgba(129, 119, 216, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f7faff 46%, #eef5ff 100%);
  color: #111827;
}

.history-shell {
  width: min(1180px, 100%);
}

.history-toolbar {
  margin-bottom: 28px;
}

.history-heading span {
  color: #b4232f;
  font-weight: 750;
}

.history-heading h1 {
  color: #111827;
  font-size: 34px;
  font-weight: 850;
  letter-spacing: 0;
}

.back-btn,
.refresh-btn {
  border-color: rgba(71, 96, 136, 0.16);
  background: rgba(255, 255, 255, 0.78);
  color: #1f2a44;
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(23, 44, 76, 0.06);
}

.refresh-btn {
  background: #b4232f;
  border-color: rgba(180, 35, 47, 0.22);
  color: #ffffff;
}

.back-btn:hover {
  border-color: rgba(27, 111, 216, 0.24);
  background: rgba(27, 111, 216, 0.06);
  color: #374151;
}

.refresh-btn:hover:not(:disabled) {
  background: #921927;
}

.state-panel,
.history-table-wrap {
  border: 1px solid rgba(71, 96, 136, 0.14);
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.94), rgba(246, 250, 255, 0.82)),
    linear-gradient(90deg, rgba(27, 111, 216, 0.04), transparent);
  box-shadow: 0 18px 42px rgba(23, 44, 76, 0.09);
  backdrop-filter: blur(14px);
}

.state-panel {
  color: #627086;
}

.error-state {
  color: #b4232f;
}

.history-table-wrap {
  position: relative;
  overflow: hidden;
}

.history-table-wrap::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #b4232f, #1b6fd8 46%, #64748b 72%, #8177d8);
}

.history-table-wrap::after {
  content: "";
  position: absolute;
  top: 16px;
  right: -8%;
  width: 42%;
  height: 96px;
  pointer-events: none;
  background:
    linear-gradient(104deg, transparent, rgba(27, 111, 216, 0.1), rgba(8, 145, 178, 0.06), transparent),
    linear-gradient(76deg, transparent 22%, rgba(180, 35, 47, 0.055), transparent 72%);
  transform: rotate(-8deg);
}

.history-table {
  position: relative;
  z-index: 1;
}

.history-row {
  border-bottom-color: rgba(71, 96, 136, 0.08);
  color: #111827;
}

.history-row:not(.history-header):nth-child(even) {
  background: rgba(247, 250, 255, 0.58);
}

.history-row:not(.history-header):hover {
  background: rgba(232, 242, 255, 0.7);
}

.history-header {
  background: rgba(255, 255, 255, 0.66);
  color: #627086;
}

.time-cell {
  color: #334155;
}

.score-cell > span {
  color: #b4232f;
  font-weight: 800;
}

.detail-link {
  color: #374151;
}

.detail-link:hover {
  color: #b4232f;
}

.status-pill {
  border-color: rgba(27, 111, 216, 0.14);
  background: rgba(27, 111, 216, 0.08);
  color: #374151;
}

.status-pill.completed {
  border-color: rgba(22, 163, 74, 0.16);
  background: rgba(22, 163, 74, 0.08);
  color: #15803d;
}

.status-pill.failed {
  border-color: rgba(180, 35, 47, 0.18);
  background: rgba(180, 35, 47, 0.08);
  color: #b4232f;
}

.status-pill.uploading,
.status-pill.validating,
.status-pill.evaluating {
  border-color: rgba(8, 145, 178, 0.16);
  background: rgba(8, 145, 178, 0.08);
  color: #64748b;
}

.toast {
  background: rgba(17, 24, 39, 0.94);
  box-shadow: 0 16px 34px rgba(23, 44, 76, 0.22);
}

.detail-overlay {
  background: rgba(17, 24, 39, 0.42);
  backdrop-filter: blur(8px);
}

.detail-dialog {
  border: 1px solid rgba(71, 96, 136, 0.14);
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 255, 0.86));
  box-shadow: 0 24px 64px rgba(23, 44, 76, 0.2);
}

.detail-header {
  border-bottom-color: rgba(71, 96, 136, 0.1);
}

.detail-header h2 {
  color: #111827;
  font-weight: 800;
}

.detail-close {
  color: #627086;
}

.detail-line {
  color: #627086;
}

.detail-line strong {
  color: #111827;
}

/* Reduce foreground blue for red-white enterprise style */
.refresh-btn {
  background: #b4232f;
}

.back-btn:hover,
.detail-link,
.detail-link:hover {
  color: #b4232f;
}

.back-btn:hover {
  border-color: rgba(180, 35, 47, 0.2);
  background: rgba(180, 35, 47, 0.055);
}

.history-table-wrap::before {
  background: linear-gradient(90deg, transparent, #111827 18%, #6b7280 72%, transparent);
}

.history-table-wrap::after {
  background: linear-gradient(104deg, transparent, rgba(148, 163, 184, 0.12), rgba(17, 24, 39, 0.045), transparent);
}

.status-pill {
  border-color: rgba(75, 85, 99, 0.14);
  background: rgba(75, 85, 99, 0.065);
  color: #374151;
}

.status-pill.uploading,
.status-pill.validating,
.status-pill.evaluating {
  border-color: rgba(75, 85, 99, 0.14);
  background: rgba(75, 85, 99, 0.065);
  color: #374151;
}

/* Data area: black first, red as accent */
.history-heading span,
.score-cell > span,
.detail-link,
.detail-link:hover {
  color: #111827;
}

.refresh-btn {
  background: #111827;
  border-color: rgba(17, 24, 39, 0.22);
}

.refresh-btn:hover:not(:disabled) {
  background: #000000;
}

.status-pill.failed {
  color: #b4232f;
}

@media (max-width: 720px) {
  .history-page {
    padding: 96px 14px 40px;
  }

  .history-heading h1 {
    font-size: 26px;
  }
}

/* Align history page with homepage layout */
.history-page {
  padding: 92px 24px 44px;
  background:
    radial-gradient(circle at 78% 16%, rgba(180, 35, 47, 0.08), transparent 24%),
    radial-gradient(circle at 22% 18%, rgba(148, 163, 184, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
}

.history-shell {
  width: min(1320px, 100%);
}

.history-toolbar {
  margin-bottom: 18px;
  gap: 16px;
}

.history-heading span {
  color: #b4232f;
  font-size: 13px;
  font-weight: 750;
}

.history-heading h1 {
  color: #111827;
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 850;
  line-height: 1.12;
}

.back-btn,
.refresh-btn {
  border-color: rgba(71, 96, 136, 0.14);
  background: rgba(255, 255, 255, 0.9);
  color: #1f2a44;
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(23, 44, 76, 0.06);
}

.refresh-btn {
  background: #111827;
  border-color: rgba(17, 24, 39, 0.22);
  color: #ffffff;
}

.refresh-btn:hover:not(:disabled) {
  background: #000000;
}

.back-btn:hover {
  border-color: rgba(180, 35, 47, 0.2);
  background: rgba(180, 35, 47, 0.055);
}

.state-panel,
.history-table-wrap {
  border-color: rgba(71, 96, 136, 0.14);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(23, 44, 76, 0.09);
  backdrop-filter: none;
}

.history-table-wrap::before {
  height: 3px;
  background: linear-gradient(90deg, #b4232f, #111827 58%, transparent);
}

.history-table-wrap::after {
  display: none;
}

.history-table-wrap {
  overflow: hidden;
}

.history-row:not(.history-header):nth-child(even) {
  background: rgba(247, 250, 255, 0.6);
}

.history-row:not(.history-header):hover {
  background: rgba(241, 245, 249, 0.92);
}

.history-header {
  background: rgba(255, 255, 255, 0.76);
  color: #627086;
}

.history-row {
  border-bottom-color: rgba(71, 96, 136, 0.08);
}

.score-cell > span {
  color: #111827;
}

.detail-link {
  color: #b4232f;
}

.detail-link:hover {
  color: #921927;
}

.status-pill {
  border-color: rgba(75, 85, 99, 0.14);
  background: rgba(75, 85, 99, 0.065);
  color: #374151;
}

.status-pill.completed {
  border-color: rgba(22, 163, 74, 0.16);
  background: rgba(22, 163, 74, 0.08);
  color: #15803d;
}

.status-pill.failed {
  border-color: rgba(180, 35, 47, 0.18);
  background: rgba(180, 35, 47, 0.08);
  color: #b4232f;
}

.status-pill.uploading,
.status-pill.validating,
.status-pill.evaluating {
  border-color: rgba(75, 85, 99, 0.14);
  background: rgba(75, 85, 99, 0.065);
  color: #374151;
}

@media (max-width: 720px) {
  .history-page {
    padding: 88px 14px 36px;
  }

  .history-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .history-heading h1 {
    font-size: 24px;
  }
}
</style>
