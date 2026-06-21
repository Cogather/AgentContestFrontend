<script setup>
import { toRef } from 'vue'
import { useSubmissionHistory } from '../composables/useSubmissionHistory'
import { formatScore } from '../utils/scoreFormat'
import IconSymbol from './IconSymbol.vue'

const props = defineProps({
  userId: String,
  username: String
})

const emit = defineEmits(['back', 'canceled'])

const {
  submissions,
  loading,
  errorMessage,
  toastMessage,
  detailItem,
  selectedQuestion,
  activeTaskSummary,
  pageTitle,
  mergedQuestionDetails,
  selectedQuestionDetail,
  loadHistory,
  canCancelSubmission,
  canShowScoreDetail,
  cancelSubmission,
  closeDetail,
  detailStatusText,
  failureReason,
  formatNumber,
  formatTime,
  getTokenUsage,
  isCancelingSubmission,
  openDetail,
  scoreDetailUnavailableText,
  showFailureReason,
  statusText,
  submissionCreatedTime,
  submissionId
} = useSubmissionHistory({
  userId: toRef(props, 'userId'),
  username: toRef(props, 'username'),
  onCanceled: payload => emit('canceled', payload)
})
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

      <div class="active-task-summary" aria-label="当前任务状态">
        <div class="active-task-item">
          <span>当前排队</span>
          <strong>{{ formatNumber(activeTaskSummary.queuedCount) }}</strong>
        </div>
        <div class="active-task-item">
          <span>正在评测</span>
          <strong>{{ formatNumber(activeTaskSummary.evaluatingCount) }}</strong>
        </div>
      </div>

      <div v-if="loading" class="state-panel">加载中...</div>
      <div v-else-if="errorMessage" class="state-panel error-state">{{ errorMessage }}</div>
      <div v-else-if="submissions.length === 0" class="state-panel">暂无历史提交记录</div>

      <div v-else class="history-table-wrap">
        <div class="history-table">
          <div class="history-row history-header">
            <div>提交 ID</div>
            <div>提交时间</div>
            <div>总得分</div>
            <div>总 token 消耗</div>
            <div>当前状态</div>
          </div>

          <div
            v-for="(item, index) in submissions"
            :key="submissionId(item) || index"
            class="history-row"
          >
            <div class="submission-id-cell">
              <span class="submission-id-badge">{{ submissionId(item) ? '#' + submissionId(item) : '-' }}</span>
            </div>
            <div class="time-cell">{{ formatTime(submissionCreatedTime(item)) }}</div>
            <div class="score-cell">
              <span>{{ formatScore(item.score) }}</span>
              <button
                v-if="canShowScoreDetail(item)"
                class="detail-link"
                type="button"
                @click="openDetail(item)"
              >
                查看详情
              </button>
              <span v-else class="detail-unavailable">{{ scoreDetailUnavailableText(item) }}</span>
            </div>
            <div>{{ formatNumber(getTokenUsage(item)) }}</div>
            <div class="status-cell">
              <button
                v-if="normalizeStatus(item.status) === 'failed'"
                class="status-pill failed clickable"
                type="button"
                :title="failedStatusText(item)"
                @click="showFailureReason(item)"
              >
                {{ failedStatusText(item) }}
              </button>
              <span
                v-else
                class="status-pill"
                :class="normalizeStatus(item.status)"
                :title="statusText(item.status, item)"
              >
                {{ statusText(item.status, item) }}
              </span>
              <button
                v-if="canCancelSubmission(item)"
                class="cancel-submission-btn"
                type="button"
                :disabled="isCancelingSubmission(item)"
                @click="cancelSubmission(item)"
              >
                {{ isCancelingSubmission(item) ? '取消中...' : '取消' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>

    <div v-if="detailItem" class="detail-overlay" @click.self="closeDetail">
      <div class="detail-dialog">
        <div class="detail-header">
          <h2>得分详情</h2>
          <button type="button" class="detail-close" @click="closeDetail">×</button>
        </div>
        <div class="detail-body">
          <section class="detail-meta-bar">
            <div>
              <span>总得分</span>
              <strong>{{ formatScore(detailItem.score) }}</strong>
            </div>
            <div>
              <span>提交时间</span>
              <strong>{{ formatTime(submissionCreatedTime(detailItem)) }}</strong>
            </div>
            <div>
              <span>Token 消耗</span>
              <strong>{{ formatNumber(getTokenUsage(detailItem)) }}</strong>
            </div>
            <div>
              <span>当前状态</span>
              <strong>{{ detailStatusText(detailItem) }}</strong>
            </div>
          </section>

          <div class="question-detail-layout">
            <aside class="question-nav" aria-label="题目目录">
              <div class="question-nav-title">题目目录</div>
              <button
                v-for="questionItem in mergedQuestionDetails"
                :key="questionItem.question"
                class="question-nav-item"
                :class="{ active: selectedQuestion === questionItem.question }"
                type="button"
                @click="selectedQuestion = questionItem.question"
              >
                <span>题目 {{ questionItem.question }}</span>
                <strong>{{ questionItem.title }}</strong>
                <em class="question-score-line">
                  <span class="score-value">{{ formatScore(questionItem.score) }}</span>
                  <span class="score-divider">/</span>
                  <span class="score-total">{{ formatScore(questionItem.total) }}</span>
                </em>
              </button>
            </aside>

            <section v-if="selectedQuestionDetail" class="question-reader">
              <div class="question-reader-head">
                <div>
                  <span>题目 {{ selectedQuestionDetail.question }}</span>
                  <h3>{{ selectedQuestionDetail.title }}</h3>
                </div>
                <strong class="question-score-line">
                  <span class="score-value">{{ formatScore(selectedQuestionDetail.score) }}</span>
                  <span class="score-divider">/</span>
                  <span class="score-total">{{ formatScore(selectedQuestionDetail.total) }}</span>
                </strong>
              </div>
              <div class="question-detail-text">{{ selectedQuestionDetail.detail }}</div>
            </section>
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

.active-task-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 18px;
}

.active-task-item {
  min-width: 136px;
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid rgba(71, 96, 136, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  padding: 0 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.active-task-item span {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.active-task-item strong {
  color: #111827;
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
}

.active-task-item:first-child strong {
  color: #b4232f;
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
  min-width: 1080px;
}

.history-row {
  display: grid;
  grid-template-columns: 72px minmax(178px, 0.94fr) minmax(126px, 0.58fr) minmax(142px, 0.64fr) minmax(360px, 1.45fr);
  gap: 16px;
  align-items: center;
  padding: 15px 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.history-row > div {
  min-width: 0;
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

.history-header > div {
  white-space: nowrap;
}

.submission-id-cell,
.time-cell {
  color: #334155;
}

.submission-id-cell {
  min-width: 0;
}

.submission-id-badge {
  box-sizing: border-box;
  width: 100%;
  max-width: 72px;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(71, 96, 136, 0.2);
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  padding: 0 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-link {
  min-height: 30px;
  border: 1px solid rgba(180, 35, 47, 0.22);
  border-radius: 8px;
  background: rgba(180, 35, 47, 0.075);
  color: #b4232f;
  cursor: pointer;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
  transition: background 0.18s, border-color 0.18s, box-shadow 0.18s, color 0.18s, transform 0.18s;
}

.detail-link:hover {
  border-color: rgba(180, 35, 47, 0.38);
  background: rgba(180, 35, 47, 0.12);
  color: #921927;
  box-shadow: 0 8px 18px rgba(180, 35, 47, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.84);
  transform: translateY(-1px);
}

.detail-link:focus-visible {
  outline: 2px solid rgba(180, 35, 47, 0.32);
  outline-offset: 2px;
}

.detail-unavailable {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.status-cell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.status-pill.canceled {
  background: rgba(100, 116, 139, 0.1);
  color: #475569;
}

.status-pill.uploaded,
.status-pill.uploading,
.status-pill.validating,
.status-pill.evaluating {
  background: rgba(8, 145, 178, 0.1);
  color: #64748b;
}

.status-pill.clickable {
  cursor: pointer;
}

.status-pill.failed.clickable {
  max-width: 100%;
  height: auto;
  min-height: 28px;
  line-height: 1.45;
  padding: 5px 10px;
  text-align: left;
  white-space: pre-line;
}

.cancel-submission-btn {
  min-height: 28px;
  border: 1px solid rgba(180, 35, 47, 0.24);
  border-radius: 999px;
  background: #ffffff;
  color: #991b1b;
  cursor: pointer;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.18s;
}

.cancel-submission-btn:hover:not(:disabled) {
  border-color: rgba(180, 35, 47, 0.4);
  background: rgba(180, 35, 47, 0.08);
  color: #7f1d1d;
  transform: translateY(-1px);
}

.cancel-submission-btn:disabled {
  cursor: not-allowed;
  opacity: 0.56;
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
  padding: 12px;
  z-index: 1100;
}

.detail-dialog {
  width: min(1120px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.24);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  min-height: 0;
  padding: 18px 20px 20px;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}

.detail-meta-bar {
  border: 1px solid rgba(71, 96, 136, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  padding: 12px 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.detail-meta-bar > div {
  min-width: 0;
  border-left: 1px solid rgba(71, 96, 136, 0.12);
  padding-left: 12px;
}

.detail-meta-bar > div:first-child {
  border-left: 0;
  padding-left: 0;
}

.detail-meta-bar span,
.question-nav-title,
.question-nav-item span,
.question-reader-head span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.detail-meta-bar strong {
  display: block;
  color: #0f172a;
  font-size: 17px;
  margin-top: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.question-detail-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(360px, 420px) minmax(0, 1fr);
  gap: 14px;
  flex: 1;
}

.question-nav {
  min-height: 0;
  border: 1px solid rgba(71, 96, 136, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  padding: 10px;
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(82px, auto);
  align-content: start;
  gap: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 35, 47, 0.28) rgba(17, 24, 39, 0.05);
}

.question-nav-title {
  display: none;
  grid-column: 1 / -1;
  padding: 0 3px 6px;
  font-weight: 800;
  color: #111827;
}

.question-nav-item {
  width: 100%;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  border-radius: 8px;
  background: transparent;
  padding: 7px 9px 7px 10px;
  min-height: 82px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  text-align: left;
  cursor: pointer;
}

.question-nav-item strong {
  color: #111827;
  font-size: 13px;
  line-height: 1.32;
  font-weight: 800;
  white-space: normal;
  word-break: break-word;
}

.question-score-line {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-style: normal;
  white-space: nowrap;
}

.score-value {
  color: #b4232f;
  font-size: 14px;
  font-weight: 850;
}

.score-divider,
.score-total {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.question-nav-item .score-value {
  color: #b4232f;
}

.question-nav-item .score-divider,
.question-nav-item .score-total {
  color: #64748b;
}

.question-nav-item.active {
  border-color: rgba(180, 35, 47, 0.14);
  border-left-color: #b4232f;
  background: rgba(180, 35, 47, 0.055);
}

.question-reader {
  min-height: 0;
  border: 1px solid rgba(71, 96, 136, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.question-reader-head {
  border-bottom: 1px solid rgba(71, 96, 136, 0.1);
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.question-reader-head h3 {
  color: #111827;
  font-size: 24px;
  line-height: 1.25;
  margin-top: 6px;
}

.question-reader-head strong {
  color: #111827;
  font-size: 22px;
  font-weight: 850;
  white-space: nowrap;
}

.question-reader-head .score-value {
  color: #b4232f;
  font-size: 24px;
}

.question-reader-head .score-divider,
.question-reader-head .score-total {
  color: #475569;
  font-size: 17px;
}

.question-detail-text {
  color: #334155;
  font-size: 15px;
  line-height: 1.85;
  padding: 18px;
  overflow-y: auto;
  white-space: pre-line;
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 35, 47, 0.28) rgba(17, 24, 39, 0.05);
}

.detail-overlay::-webkit-scrollbar,
.question-nav::-webkit-scrollbar,
.question-detail-text::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}

.detail-overlay::-webkit-scrollbar-track,
.question-nav::-webkit-scrollbar-track,
.question-detail-text::-webkit-scrollbar-track {
  background: rgba(17, 24, 39, 0.05);
  border-radius: 999px;
}

.detail-overlay::-webkit-scrollbar-thumb,
.question-nav::-webkit-scrollbar-thumb,
.question-detail-text::-webkit-scrollbar-thumb {
  background: rgba(180, 35, 47, 0.28);
  border-radius: 999px;
}

.detail-overlay::-webkit-scrollbar-thumb:hover,
.question-nav::-webkit-scrollbar-thumb:hover,
.question-detail-text::-webkit-scrollbar-thumb:hover {
  background: rgba(180, 35, 47, 0.42);
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

.status-pill.uploaded,
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

.status-pill.uploaded,
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

.status-pill.uploaded,
.status-pill.uploading,
.status-pill.validating,
.status-pill.evaluating {
  border-color: rgba(75, 85, 99, 0.14);
  background: rgba(75, 85, 99, 0.065);
  color: #374151;
}

.status-pill.uploaded {
  display: block;
  justify-self: stretch;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: 32px;
  height: auto;
  overflow: visible;
  overflow-wrap: anywhere;
  text-align: left;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
  padding: 5px 10px;
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

  .active-task-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .active-task-item {
    min-width: 0;
    padding: 0 12px;
  }

  .active-task-item strong {
    font-size: 22px;
  }

  .detail-overlay {
    padding: 14px;
    align-items: flex-start;
    overflow-y: auto;
  }

  .detail-dialog {
    margin-top: 72px;
    width: 100%;
    max-height: none;
  }

  .detail-body {
    overflow: visible;
  }

  .detail-meta-bar {
    grid-template-columns: 1fr;
  }

  .detail-meta-bar > div {
    border-left: 0;
    border-top: 1px solid rgba(71, 96, 136, 0.12);
    padding-left: 0;
    padding-top: 10px;
  }

  .detail-meta-bar > div:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .question-detail-layout {
    grid-template-columns: 1fr;
  }

  .question-nav {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    align-content: initial;
  }

  .question-nav-title {
    display: none;
  }

  .question-nav-item {
    min-width: 148px;
    min-height: 82px;
  }

  .question-reader {
    min-height: 520px;
  }

  .question-reader-head {
    display: grid;
  }

  .question-reader-head h3 {
    font-size: 20px;
  }

  .question-detail-text {
    max-height: 58vh;
  }
}
</style>
