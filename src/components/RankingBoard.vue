<template>
  <div class="ranking-board">
    <!-- 顶部统计卡片 -->
    <div class="stats-section">
      <div class="stat-card total">
        <div class="stat-icon">
          <IconSymbol name="users" :size="18" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalParticipants }}</div>
          <div class="stat-label">参赛人数</div>
        </div>
      </div>
      <div class="stat-card score">
        <div class="stat-icon">
          <IconSymbol name="score" :size="18" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalScore }}</div>
          <div class="stat-label">最高得分</div>
        </div>
      </div>
    </div>

    <!-- 个人积分卡片 -->
    <div class="personal-card" v-if="personalRank">
      <div class="personal-info">
        <div class="personal-rank">
          <span class="rank-number">#{{ personalRank.rank }}</span>
          <span class="rank-label">我的排名</span>
        </div>
        <div class="personal-stats">
          <div class="personal-stat">
            <span class="label">我的得分</span>
            <span class="value">{{ personalRank.score }}</span>
          </div>
          <div class="personal-stat">
            <span class="label">Token消耗</span>
            <span class="value">{{ formatNumber(personalRank.token_usage) }}</span>
          </div>
          <div class="personal-stat">
            <span class="label">提交次数</span>
            <span class="value">{{ formatNumber(getSubmissionCount(personalRank)) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 未登录时的提示 -->
    <div class="personal-card personal-card-empty" v-else>
      <div class="empty-text">登录后查看我的排名</div>
    </div>

    <!-- 统一搜索区 -->
    <div class="search-bar">
      <div class="search-group">
        <div class="search-input-wrapper">
          <input 
            v-model="searchValue" 
            :placeholder="searchPlaceholder" 
            class="search-input"
          />
          <button v-if="searchValue" class="clear-btn" @click="searchValue = ''; currentPage = 1">×</button>
        </div>
      </div>
    </div>

    <!-- 排行榜表格 -->
    <div class="table-container">
      <div class="table-header">
        <div class="col rank">排名</div>
        <div class="col name">昵称</div>
        <div class="col score filterable">
          <div class="sort-header" @click="toggleSort('score')">
            得分
            <span class="sort-icon" :class="sortOrder">{{ sortOrder === 'desc' ? '↓' : '↑' }}</span>
          </div>
        </div>
        <div class="col submission-count">提交次数</div>
        <div class="col token-usage">Token消耗</div>
      </div>

      <div v-if="paginatedList.length === 0" class="empty-row">
        {{ rankingError || '暂无排名数据' }}
      </div>

      <div v-else class="table-body">
        <div
          v-for="(item, index) in paginatedList"
          :key="`${item.rank}-${item.nickname}-${index}`"
          class="table-row"
          :class="{
            'top-three': item.rank <= 3,
            'rank-first-row': item.rank === 1,
            'rank-second-row': item.rank === 2,
            'rank-third-row': item.rank === 3,
            'top-ten': item.rank > 3 && item.rank <= 10,
            'top-twenty': item.rank > 10 && item.rank <= 20,
            'top-fifty': item.rank > 20 && item.rank <= 50,
            'top-hundred': item.rank > 50 && item.rank <= 100,
            'top-two-hundred': item.rank > 100 && item.rank <= 200
          }"
        >
          <div class="col rank">
            <span class="rank-badge" :class="'rank-' + item.rank">{{ item.rank }}</span>
          </div>
          <div class="col name">
            <span class="name-text">{{ item.nickname }}</span>
          </div>
          <div class="col score">
            <span class="score-value">{{ item.score }}</span>
          </div>
          <div class="col submission-count">{{ formatNumber(getSubmissionCount(item)) }}</div>
          <div class="col token-usage">{{ formatNumber(item.token_usage) }}</div>
        </div>
      </div>
    </div>

    <!-- 分页控制区 -->
    <div class="pagination-bar" v-if="totalItems > 0">
      <div class="page-size-select">
        <span>每页显示</span>
        <select v-model="pageSize" @change="currentPage = 1">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <span>条</span>
      </div>

      <div class="pagination" v-if="totalPages > 1">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="changePage(1)"
        >
          首页
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          上一页
        </button>
        <div class="page-numbers">
          <button
            v-for="page in visiblePages"
            :key="page"
            class="page-num"
            :class="{ active: page === currentPage }"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
        </div>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          下一页
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="changePage(totalPages)"
        >
          末页
        </button>
      </div>

      <div class="jump-page">
        <span>共 {{ totalPages }} 页</span>
        <span>前往</span>
        <input 
          type="number" 
          v-model="jumpPageNum" 
          @keyup.enter="handleJump"
          @blur="handleJump"
          min="1" 
          :max="totalPages" 
        />
        <span>页</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { rankApi } from '../api'
import IconSymbol from './IconSymbol.vue'

const props = defineProps({
  currentUserId: String
})

const rankingList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const totalPagesCount = ref(0)
const totalParticipantsCount = ref(0)
const maxScore = ref(0)
const personalRank = ref(null)
const jumpPageNum = ref('')
const searchValue = ref('')
const sortOrder = ref('desc') // desc | asc
const rankingError = ref('')

const searchPlaceholder = computed(() => '搜索昵称...')

const toggleSort = (field) => {
  if (field === 'score') {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  }
}

const totalParticipants = computed(() => totalParticipantsCount.value)

const totalScore = computed(() => maxScore.value)

const totalPages = computed(() => totalPagesCount.value)

const paginatedList = computed(() => rankingList.value)

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 5) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
    } else if (current >= total - 2) {
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      for (let i = current - 2; i <= current + 2; i++) {
        pages.push(i)
      }
    }
  }

  return pages
})

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString('zh-CN') : '-'
}

const getSubmissionCount = (item) => item?.submission_count ?? item?.submissionCount ?? 0

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const handleJump = () => {
  const page = parseInt(jumpPageNum.value)
  if (page >= 1 && page <= totalPages.value) {
    changePage(page)
    jumpPageNum.value = ''
  }
}

let rankingRequestSeq = 0
let personalRankRequestSeq = 0

const emptyPersonalRank = () => ({
  rank: '-',
  score: 0,
  token_usage: null,
  submission_count: 0
})

const loadPersonalRank = async () => {
  const requestSeq = ++personalRankRequestSeq
  if (!props.currentUserId) {
    personalRank.value = null
    return
  }

  try {
    const userRankRes = await rankApi.getUserRank(props.currentUserId)
    if (requestSeq !== personalRankRequestSeq) return
    personalRank.value = userRankRes?.data || emptyPersonalRank()
  } catch (e) {
    if (requestSeq !== personalRankRequestSeq) return
    personalRank.value = emptyPersonalRank()
  }
}

const loadRanking = async (silent = false) => {
  const requestSeq = ++rankingRequestSeq
  const requestPage = currentPage.value
  const requestPageSize = pageSize.value
  const requestKeyword = searchValue.value.trim()
  const requestSortOrder = sortOrder.value

  try {
    const res = await rankApi.getRankPage({
      page: requestPage,
      pageSize: requestPageSize,
      searchField: 'nickname',
      keyword: requestKeyword,
      sortOrder: requestSortOrder
    })

    if (requestSeq !== rankingRequestSeq) return

    if (res.code === 0 && res.data) {
      const pageData = res.data
      rankingError.value = ''
      rankingList.value = pageData.items || []
      totalItems.value = Number(pageData.total || 0)
      totalPagesCount.value = Number(pageData.total_pages || 0)
      totalParticipantsCount.value = Number(pageData.total_participants || 0)
      maxScore.value = Number(pageData.max_score || 0)
      currentPage.value = Number(pageData.page || requestPage)
      pageSize.value = Number(pageData.page_size || requestPageSize)
    } else {
      rankingError.value = res.message || '排行榜加载失败，请稍后重试'
      rankingList.value = []
      totalItems.value = 0
      totalPagesCount.value = 0
    }

    await loadPersonalRank()
  } catch (error) {
    if (requestSeq !== rankingRequestSeq) return
    if (!silent) console.error('Failed to load ranking:', error)
    if (!silent || rankingList.value.length === 0) {
      rankingError.value = error?.response?.data?.message || '排行榜加载失败，请稍后重试'
    }
    if (rankingList.value.length === 0) {
      totalItems.value = 0
      totalPagesCount.value = 0
    }
    await loadPersonalRank()
  }
}

const reloadFirstPage = () => {
  if (currentPage.value === 1) {
    loadRanking(true)
    return
  }
  currentPage.value = 1
}

// 暴露刷新方法（强制显示 loading）
const refresh = () => loadRanking(false)

defineExpose({
  refresh
})

onMounted(() => {
  loadRanking(false)
})

watch(currentPage, () => loadRanking(true))

watch([pageSize, searchValue, sortOrder], reloadFirstPage)

watch(() => props.currentUserId, () => loadPersonalRank())
</script>

<style scoped>
.ranking-board {
  width: 100%;
  color: #0f172a;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 42, 77, 0.12);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.stat-card:hover {
  border-color: rgba(15, 124, 255, 0.3);
  box-shadow: 0 12px 28px rgba(24, 67, 88, 0.08), 0 0 18px rgba(15, 124, 255, 0.08);
  transform: translateY(-1px);
}

.stat-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.stat-card.total .stat-icon {
  background: rgba(15, 124, 255, 0.1);
  border: 1px solid rgba(15, 124, 255, 0.18);
  color: #b4232f;
}

.stat-card.score .stat-icon {
  background: rgba(29, 78, 216, 0.09);
  border: 1px solid rgba(29, 78, 216, 0.16);
  color: #4b5563;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  letter-spacing: 0;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.personal-card {
  position: relative;
  padding: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.9));
  border: 1px solid rgba(15, 124, 255, 0.18);
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.personal-card-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border-style: dashed;
  background: rgba(248, 251, 255, 0.76);
}

.personal-card-empty::before {
  display: none;
}

.personal-card-empty .empty-text {
  color: #64748b;
  font-size: 14px;
}

.personal-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #b4232f, #1b6fd8, #64748b);
}

.personal-info {
  display: flex;
  align-items: center;
  gap: 28px;
}

.personal-rank {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rank-number {
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 34px;
  font-weight: 700;
  color: #b4232f;
  line-height: 1;
  letter-spacing: 0;
}

.rank-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.personal-stats {
  display: flex;
  gap: 32px;
}

.personal-stat {
  display: flex;
  flex-direction: column;
}

.personal-stat .label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 4px;
}

.personal-stat .value {
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: 0;
}

.search-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-start;
}

.search-group {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 42, 77, 0.14);
  border-radius: 8px;
  box-shadow: 0 8px 22px rgba(24, 67, 88, 0.06);
  padding: 4px;
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.search-group:hover,
.search-group:focus-within {
  border-color: rgba(15, 124, 255, 0.34);
  box-shadow: 0 10px 24px rgba(15, 124, 255, 0.08);
}

.search-select {
  padding: 8px 12px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #334155;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  border-right: 1px solid rgba(15, 42, 77, 0.12);
  height: 36px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 240px;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  height: 36px;
}

.search-input::placeholder {
  color: #94a3b8;
}

.clear-btn {
  position: absolute;
  right: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: rgba(20, 33, 46, 0.06);
  border: none;
  border-radius: 50%;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s, color 0.2s;
}

.clear-btn:hover {
  background: rgba(15, 124, 255, 0.12);
  color: #b4232f;
}

.table-container {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 42, 77, 0.14);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 14px 32px rgba(24, 67, 88, 0.06);
}

.table-header {
  display: grid;
  grid-template-columns: 50px minmax(74px, 1fr) 60px 68px 86px;
  gap: 8px;
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(239, 246, 255, 0.86));
  border-bottom: 1px solid rgba(15, 42, 77, 0.12);
}

.sort-header {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.sort-header:hover {
  color: #b4232f;
}

.sort-icon {
  font-size: 12px;
  font-weight: 700;
}

.table-header .col {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0;
}

.table-body {
  max-height: 460px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(15, 124, 255, 0.32) rgba(20, 33, 46, 0.04);
}

.table-body::-webkit-scrollbar {
  width: 6px;
}

.table-body::-webkit-scrollbar-track {
  background: rgba(20, 33, 46, 0.04);
  border-radius: 3px;
}

.table-body::-webkit-scrollbar-thumb {
  background: rgba(15, 124, 255, 0.32);
  border-radius: 3px;
}

.table-body::-webkit-scrollbar-thumb:hover {
  background: rgba(15, 124, 255, 0.48);
}

.table-row {
  display: grid;
  grid-template-columns: 50px minmax(74px, 1fr) 60px 68px 86px;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 42, 77, 0.08);
  transition: background 0.2s, box-shadow 0.2s;
}

.table-row:hover {
  background: rgba(15, 124, 255, 0.055);
}

.table-row.is-me {
  background: rgba(15, 124, 255, 0.08);
  border-left: 3px solid #b4232f;
}

.table-row.rank-first-row {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.12), rgba(255, 255, 255, 0.7) 58%, transparent);
  box-shadow: inset 3px 0 0 rgba(245, 158, 11, 0.35);
}

.table-row.rank-second-row {
  background: linear-gradient(90deg, rgba(100, 116, 139, 0.12), rgba(255, 255, 255, 0.7) 58%, transparent);
  box-shadow: inset 3px 0 0 rgba(100, 116, 139, 0.32);
}

.table-row.rank-third-row {
  background: linear-gradient(90deg, rgba(180, 83, 9, 0.12), rgba(255, 255, 255, 0.7) 58%, transparent);
  box-shadow: inset 3px 0 0 rgba(180, 83, 9, 0.3);
}

.table-row.top-ten {
  background: linear-gradient(90deg, rgba(15, 124, 255, 0.06), transparent);
}

.table-row.top-twenty {
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.06), transparent);
}

.table-row.top-fifty {
  background: linear-gradient(90deg, rgba(29, 78, 216, 0.045), transparent);
}

.table-row.top-hundred,
.table-row.top-two-hundred {
  background: linear-gradient(90deg, rgba(15, 42, 77, 0.035), transparent);
}

.table-row .col {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #334155;
}

.table-row .col.name {
  font-weight: 500;
  color: #0f172a;
}

.table-row .col.submission-count {
  color: #374151;
  font-weight: 700;
}

.rank-badge {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 33, 46, 0.06);
  border-radius: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.rank-badge.rank-1 {
  width: 38px;
  height: 34px;
  background: linear-gradient(135deg, #fef3c7, #f59e0b);
  border: 1px solid rgba(217, 119, 6, 0.42);
  color: #7c2d12;
  font-size: 18px;
  box-shadow: 0 8px 18px rgba(245, 158, 11, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.rank-badge.rank-2 {
  width: 36px;
  height: 32px;
  background: linear-gradient(135deg, #f8fafc, #cbd5e1);
  border: 1px solid rgba(100, 116, 139, 0.36);
  color: #334155;
  font-size: 17px;
  box-shadow: 0 7px 16px rgba(100, 116, 139, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.rank-badge.rank-3 {
  width: 36px;
  height: 32px;
  background: linear-gradient(135deg, #ffedd5, #b45309);
  border: 1px solid rgba(146, 64, 14, 0.34);
  color: #fff7ed;
  font-size: 17px;
  box-shadow: 0 7px 16px rgba(180, 83, 9, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.name-text {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me-badge {
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(15, 124, 255, 0.1);
  color: #b4232f;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
}

.score-value {
  color: #4b5563;
  font-size: 16px;
  font-weight: 700;
}

.loading-row,
.empty-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 34px;
  color: #64748b;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(15, 124, 255, 0.18);
  border-top-color: #b4232f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pagination-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  padding: 10px;
  position: relative;
  min-height: 40px;
}

.page-size-select {
  position: absolute;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
}

.jump-page {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
}

.jump-page input {
  width: 48px;
  padding: 4px 0;
  border: 1px solid rgba(15, 42, 77, 0.14);
  border-radius: 6px;
  text-align: center;
  outline: none;
  background: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  color: #0f172a;
}

.jump-page input:focus {
  border-color: rgba(15, 124, 255, 0.48);
  box-shadow: 0 0 0 3px rgba(15, 124, 255, 0.1);
}

.page-size-select select {
  padding: 4px 8px;
  border: 1px solid rgba(15, 42, 77, 0.14);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.page-size-select select:hover {
  border-color: rgba(15, 124, 255, 0.34);
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(15, 42, 77, 0.14);
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: rgba(15, 124, 255, 0.08);
  border-color: rgba(15, 124, 255, 0.32);
  color: #b4232f;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.page-num:hover {
  background: rgba(15, 124, 255, 0.08);
  color: #b4232f;
}

.page-num.active {
  background: linear-gradient(135deg, #b4232f, #4b5563);
  color: #fff;
  font-weight: 600;
}

@media (max-width: 900px) {
  .pagination-bar {
    flex-direction: column;
    gap: 16px;
    padding-bottom: 10px;
    height: auto;
  }

  .page-size-select,
  .jump-page {
    position: static;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .table-header,
  .table-row {
    grid-template-columns: 44px minmax(66px, 1fr) 52px 60px 74px;
    padding: 14px 12px;
    gap: 6px;
  }

  .personal-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .personal-stats {
    width: 100%;
    justify-content: space-around;
  }
}

/* Enterprise technology ranking theme */
.ranking-board {
  color: #111827;
}

.stats-section {
  gap: 16px;
  margin-bottom: 18px;
}

.stat-card {
  border-color: rgba(71, 96, 136, 0.14);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(244, 248, 255, 0.88));
  box-shadow: 0 1px 2px rgba(23, 44, 76, 0.04);
}

.stat-card:hover {
  border-color: rgba(27, 111, 216, 0.22);
  box-shadow: 0 14px 30px rgba(23, 44, 76, 0.08);
  transform: translateY(-1px);
}

.stat-card.total .stat-icon,
.stat-card.score .stat-icon {
  border-color: rgba(27, 111, 216, 0.14);
  background: rgba(27, 111, 216, 0.07);
  color: #374151;
}

.stat-card.score .stat-value,
.rank-number,
.score-value {
  color: #b4232f;
}

.stat-value,
.personal-stat .value,
.table-row .col.name {
  color: #111827;
}

.stat-label,
.rank-label,
.personal-stat .label,
.table-header .col,
.page-size-select,
.jump-page {
  color: #627086;
}

.personal-card {
  border-color: rgba(71, 96, 136, 0.14);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 248, 255, 0.9));
  box-shadow: 0 1px 2px rgba(23, 44, 76, 0.04);
}

.personal-card::before {
  background: linear-gradient(90deg, #b4232f, #1b6fd8, #64748b);
}

.personal-card-empty {
  background: rgba(247, 250, 255, 0.7);
}

.search-group,
.table-container {
  border-color: rgba(71, 96, 136, 0.14);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(23, 44, 76, 0.04);
}

.search-group:hover,
.search-group:focus-within {
  border-color: rgba(27, 111, 216, 0.26);
  box-shadow: 0 12px 24px rgba(23, 44, 76, 0.06);
}

.search-input {
  color: #111827;
}

.clear-btn {
  background: rgba(27, 111, 216, 0.08);
  color: #627086;
}

.clear-btn:hover {
  background: rgba(180, 35, 47, 0.08);
  color: #b4232f;
}

.table-header {
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(241, 247, 255, 0.92));
  border-bottom-color: rgba(71, 96, 136, 0.12);
}

.sort-header:hover {
  color: #b4232f;
}

.table-body {
  scrollbar-color: rgba(27, 111, 216, 0.3) rgba(23, 44, 76, 0.04);
}

.table-row {
  border-bottom-color: rgba(71, 96, 136, 0.08);
}

.table-row:hover {
  background: rgba(27, 111, 216, 0.045);
}

.table-row.rank-first-row {
  background: linear-gradient(90deg, rgba(180, 35, 47, 0.08), rgba(255, 255, 255, 0.78) 58%, transparent);
  box-shadow: inset 3px 0 0 rgba(180, 35, 47, 0.42);
}

.table-row.rank-second-row {
  background: linear-gradient(90deg, rgba(27, 111, 216, 0.08), rgba(255, 255, 255, 0.76) 58%, transparent);
  box-shadow: inset 3px 0 0 rgba(27, 111, 216, 0.32);
}

.table-row.rank-third-row {
  background: linear-gradient(90deg, rgba(8, 145, 178, 0.08), rgba(255, 255, 255, 0.76) 58%, transparent);
  box-shadow: inset 3px 0 0 rgba(8, 145, 178, 0.32);
}

.table-row.top-ten {
  background: linear-gradient(90deg, rgba(129, 119, 216, 0.045), transparent);
}

.table-row .col {
  color: #334155;
}

.rank-badge {
  background: rgba(27, 111, 216, 0.08);
  border: 1px solid rgba(27, 111, 216, 0.12);
  color: #627086;
  border-radius: 8px;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #b4232f, #7f1d2d);
  border-color: rgba(180, 35, 47, 0.42);
  color: #fff;
  box-shadow: 0 10px 18px rgba(180, 35, 47, 0.22);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #eaf2ff, #bcd5ff);
  border-color: rgba(27, 111, 216, 0.26);
  color: #374151;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #e8fbff, #80d8e8);
  border-color: rgba(8, 145, 178, 0.26);
  color: #075985;
}

.loading-spinner {
  border-color: rgba(180, 35, 47, 0.16);
  border-top-color: #b4232f;
}

.jump-page input,
.page-size-select select,
.page-btn,
.page-num {
  border-color: rgba(71, 96, 136, 0.16);
  background: rgba(255, 255, 255, 0.82);
  color: #526176;
}

.jump-page input:focus {
  border-color: rgba(180, 35, 47, 0.48);
  box-shadow: 0 0 0 3px rgba(180, 35, 47, 0.1);
}

.page-size-select select:hover,
.page-btn:hover:not(:disabled),
.page-num:hover {
  border-color: rgba(180, 35, 47, 0.24);
  background: rgba(180, 35, 47, 0.055);
  color: #b4232f;
}

.page-num.active {
  background: linear-gradient(135deg, #b4232f, #921927);
  border-color: rgba(180, 35, 47, 0.2);
  color: #fff;
}

/* Cohesive data cockpit polish */
.ranking-board {
  position: relative;
}

.stats-section {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.stat-card {
  min-height: 86px;
  padding: 18px;
  border-radius: 8px;
  backdrop-filter: blur(12px);
}

.stat-card.total {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 247, 255, 0.88)),
    linear-gradient(90deg, rgba(27, 111, 216, 0.08), transparent);
}

.stat-card.score {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(255, 245, 247, 0.78)),
    linear-gradient(90deg, rgba(180, 35, 47, 0.08), transparent);
}

.stat-icon {
  width: 42px;
  height: 42px;
}

.stat-card.score .stat-icon {
  border-color: rgba(180, 35, 47, 0.16);
  background: rgba(180, 35, 47, 0.075);
  color: #b4232f;
}

.stat-value {
  font-size: 28px;
  line-height: 1;
}

.personal-card {
  min-height: 112px;
  margin-bottom: 18px;
  padding: 20px;
  overflow: hidden;
}

.personal-card::after {
  content: "";
  position: absolute;
  right: -30px;
  top: 18px;
  width: 240px;
  height: 72px;
  pointer-events: none;
  background:
    linear-gradient(100deg, transparent, rgba(27, 111, 216, 0.11), rgba(129, 119, 216, 0.08), transparent),
    linear-gradient(75deg, transparent 20%, rgba(180, 35, 47, 0.07), transparent 70%);
  transform: rotate(-10deg);
}

.personal-info {
  position: relative;
  z-index: 1;
}

.rank-number {
  font-size: 38px;
}

.search-bar {
  margin-bottom: 14px;
}

.search-group {
  width: min(340px, 100%);
  padding: 5px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.search-input-wrapper {
  width: 100%;
}

.table-container {
  border-radius: 8px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.table-header,
.table-row {
  grid-template-columns: 50px minmax(74px, 1fr) 60px 68px 86px;
}

.table-header {
  min-height: 46px;
  padding: 14px 18px;
}

.table-row {
  min-height: 54px;
  padding: 13px 18px;
}

.table-body {
  max-height: 520px;
}

.rank-badge {
  width: 30px;
  height: 30px;
}

.rank-badge.rank-1,
.rank-badge.rank-2,
.rank-badge.rank-3 {
  width: 38px;
  height: 34px;
}

.name-text {
  max-width: 132px;
}

.score-value {
  font-size: 17px;
}

.pagination-bar {
  margin-top: 18px;
  padding: 14px 10px 4px;
}

.page-btn,
.page-num,
.page-size-select select,
.jump-page input {
  border-radius: 6px;
}

/* Remove legacy ranking colors and align with page panels */
.ranking-board {
  --rank-panel-bg: rgba(255, 255, 255, 0.66);
  --rank-panel-border: rgba(71, 96, 136, 0.12);
  --rank-blue: #1b6fd8;
  --rank-cyan: #64748b;
  --rank-violet: #8177d8;
  --rank-red: #b4232f;
}

.stat-card,
.personal-card,
.search-group,
.table-container {
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.9), rgba(246, 250, 255, 0.74)),
    linear-gradient(90deg, rgba(27, 111, 216, 0.04), transparent);
  border-color: var(--rank-panel-border);
  box-shadow: 0 1px 2px rgba(23, 44, 76, 0.04);
}

.stat-card.score,
.personal-card {
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.9), rgba(246, 250, 255, 0.74)),
    linear-gradient(90deg, rgba(180, 35, 47, 0.045), transparent 62%);
}

.personal-card::before {
  height: 3px;
  background: linear-gradient(90deg, var(--rank-red), var(--rank-blue), var(--rank-cyan), var(--rank-violet));
}

.table-header {
  background: rgba(255, 255, 255, 0.58);
}

.table-row,
.table-row.top-ten,
.table-row.top-twenty,
.table-row.top-fifty,
.table-row.top-hundred,
.table-row.top-two-hundred {
  background: rgba(255, 255, 255, 0.54);
  box-shadow: none;
}

.table-row:nth-child(even),
.table-row.top-ten:nth-child(even),
.table-row.top-twenty:nth-child(even),
.table-row.top-fifty:nth-child(even),
.table-row.top-hundred:nth-child(even),
.table-row.top-two-hundred:nth-child(even) {
  background: rgba(247, 250, 255, 0.58);
}

.table-row:hover,
.table-row.top-ten:hover,
.table-row.top-twenty:hover,
.table-row.top-fifty:hover,
.table-row.top-hundred:hover,
.table-row.top-two-hundred:hover {
  background: rgba(232, 242, 255, 0.74);
}

.table-row.rank-first-row {
  background: linear-gradient(90deg, rgba(180, 35, 47, 0.09), rgba(255, 255, 255, 0.64) 54%, rgba(247, 250, 255, 0.42));
  box-shadow: inset 3px 0 0 rgba(180, 35, 47, 0.45);
}

.table-row.rank-second-row {
  background: linear-gradient(90deg, rgba(27, 111, 216, 0.08), rgba(255, 255, 255, 0.62) 54%, rgba(247, 250, 255, 0.42));
  box-shadow: inset 3px 0 0 rgba(27, 111, 216, 0.34);
}

.table-row.rank-third-row {
  background: linear-gradient(90deg, rgba(8, 145, 178, 0.08), rgba(255, 255, 255, 0.62) 54%, rgba(247, 250, 255, 0.42));
  box-shadow: inset 3px 0 0 rgba(8, 145, 178, 0.34);
}

.sort-header:hover,
.clear-btn:hover,
.page-btn:hover:not(:disabled),
.page-num:hover {
  color: var(--rank-red);
}

.page-num.active {
  background: linear-gradient(135deg, var(--rank-red), #921927);
}

@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: 1fr;
  }

  .stat-card {
    min-height: 76px;
  }

  .personal-card::after {
    right: -90px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 44px minmax(66px, 1fr) 52px 60px 74px;
    padding: 13px 12px;
  }

  .name-text {
    max-width: 92px;
  }
}

/* Enterprise event final ranking baseline */
.ranking-board {
  color: #111827;
}

.stat-card.total .stat-icon,
.stat-card.score .stat-icon {
  color: #374151;
}

.stat-card.score .stat-icon,
.rank-badge.rank-1 {
  color: #ffffff;
}

.stat-card.score .stat-value,
.rank-number,
.score-value {
  color: #b4232f;
}

.personal-card-empty .empty-text,
.stat-label,
.rank-label,
.personal-stat .label,
.table-header .col,
.page-size-select,
.jump-page {
  color: #627086;
}

.table-row.is-me {
  background: rgba(180, 35, 47, 0.06);
  border-left: 3px solid #b4232f;
}

.me-badge {
  background: rgba(180, 35, 47, 0.08);
  color: #b4232f;
}

.rank-badge.rank-2 {
  color: #374151;
}

.rank-badge.rank-3 {
  color: #075985;
}

.loading-row,
.empty-row {
  color: #627086;
}

.page-num.active {
  background: #b4232f;
}

/* Reduce foreground blue for red-white enterprise style */
.ranking-board {
  --rank-blue: #4b5563;
  --rank-cyan: #64748b;
  --rank-violet: #9ca3af;
}

.stat-card.total .stat-icon,
.stat-card.score .stat-icon {
  border-color: rgba(180, 35, 47, 0.14);
  background: rgba(180, 35, 47, 0.07);
  color: #b4232f;
}

.stat-card.total {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.88)),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08), transparent);
}

.personal-card::before {
  background: linear-gradient(90deg, #b4232f, #4b5563 72%, transparent);
}

.personal-card::after {
  background:
    linear-gradient(100deg, transparent, rgba(148, 163, 184, 0.12), rgba(180, 35, 47, 0.055), transparent),
    linear-gradient(75deg, transparent 20%, rgba(180, 35, 47, 0.06), transparent 70%);
}

.table-row.rank-second-row,
.table-row.rank-third-row {
  background: linear-gradient(90deg, rgba(75, 85, 99, 0.065), rgba(255, 255, 255, 0.62) 54%, rgba(248, 250, 252, 0.42));
  box-shadow: inset 3px 0 0 rgba(75, 85, 99, 0.32);
}

.rank-badge,
.rank-badge.rank-2,
.rank-badge.rank-3 {
  background: linear-gradient(135deg, #f8fafc, #e5e7eb);
  border-color: rgba(75, 85, 99, 0.18);
  color: #374151;
  box-shadow: none;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #b4232f, #7f1d2d);
  color: #ffffff;
}

.rank-badge.rank-2,
.rank-badge.rank-3 {
  color: #374151;
}

.table-row:hover,
.table-row.top-ten:hover,
.table-row.top-twenty:hover,
.table-row.top-fifty:hover,
.table-row.top-hundred:hover,
.table-row.top-two-hundred:hover {
  background: rgba(248, 250, 252, 0.88);
}

.search-group:hover,
.search-group:focus-within {
  border-color: rgba(75, 85, 99, 0.2);
  box-shadow: 0 12px 24px rgba(23, 44, 76, 0.06);
}

/* Tone down red accents in secondary ranking elements */
.stat-card.total .stat-icon,
.stat-card.score .stat-icon {
  border-color: rgba(75, 85, 99, 0.14);
  background: rgba(75, 85, 99, 0.055);
  color: #374151;
}

.personal-card::before {
  background: linear-gradient(90deg, #111827, #6b7280 72%, transparent);
}

.personal-card::after {
  background: linear-gradient(100deg, transparent, rgba(148, 163, 184, 0.12), rgba(17, 24, 39, 0.045), transparent);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #111827, #4b5563);
}

.table-row.rank-first-row {
  background: linear-gradient(90deg, rgba(17, 24, 39, 0.07), rgba(255, 255, 255, 0.62) 54%, rgba(248, 250, 252, 0.42));
  box-shadow: inset 3px 0 0 rgba(17, 24, 39, 0.34);
}

/* Data area: black first, red as accent */
.stat-card.score .stat-value,
.rank-number {
  color: #111827;
}

.score-value {
  color: #b4232f;
}

.me-badge,
.page-num.active {
  background: #111827;
  color: #ffffff;
}

.table-row.is-me {
  background: rgba(17, 24, 39, 0.045);
  border-left-color: #111827;
}

.loading-spinner {
  border-color: rgba(17, 24, 39, 0.12);
  border-top-color: #111827;
}

/* Scroll performance and top-three emphasis */
.stat-card,
.search-group,
.table-container {
  backdrop-filter: none;
}

.stat-card,
.personal-card,
.table-container {
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px rgba(23, 44, 76, 0.04);
}

.personal-card::after {
  display: none;
}

.table-row,
.table-row.top-ten,
.table-row.top-twenty,
.table-row.top-fifty,
.table-row.top-hundred,
.table-row.top-two-hundred {
  background: #ffffff;
  box-shadow: none;
}

.table-row:nth-child(even),
.table-row.top-ten:nth-child(even),
.table-row.top-twenty:nth-child(even),
.table-row.top-fifty:nth-child(even),
.table-row.top-hundred:nth-child(even),
.table-row.top-two-hundred:nth-child(even) {
  background: #f8fafc;
}

.table-row.rank-first-row {
  background: rgba(180, 35, 47, 0.13);
  box-shadow: inset 4px 0 0 #8f1723;
}

.table-row.rank-second-row {
  background: rgba(180, 35, 47, 0.09);
  box-shadow: inset 4px 0 0 #b4232f;
}

.table-row.rank-third-row {
  background: rgba(180, 35, 47, 0.055);
  box-shadow: inset 4px 0 0 #d45b64;
}

.rank-badge.rank-1 {
  background: #8f1723;
  border-color: rgba(143, 23, 35, 0.18);
  color: #ffffff;
}

.rank-badge.rank-2 {
  background: #b4232f;
  border-color: rgba(180, 35, 47, 0.16);
  color: #ffffff;
}

.rank-badge.rank-3 {
  background: #d45b64;
  border-color: rgba(212, 91, 100, 0.16);
  color: #ffffff;
}

.table-row.rank-first-row .score-value,
.table-row.rank-second-row .score-value,
.table-row.rank-third-row .score-value {
  color: #8f1723;
}

.table-row:hover,
.table-row.top-ten:hover,
.table-row.top-twenty:hover,
.table-row.top-fifty:hover,
.table-row.top-hundred:hover,
.table-row.top-two-hundred:hover {
  background: #f1f5f9;
}

/* Final column sizing for the five ranking fields. Keep this block late in the
   file because earlier theme sections redefine the same table grid. */
.ranking-board {
  --ranking-table-columns: 72px minmax(180px, 0.68fr) minmax(104px, 0.14fr) minmax(112px, 0.14fr) minmax(136px, 0.18fr);
  --ranking-table-gap: 18px;
}

.table-header,
.table-row {
  grid-template-columns: var(--ranking-table-columns);
  gap: var(--ranking-table-gap);
}

.table-header .col.score,
.table-row .col.score,
.table-header .col.submission-count,
.table-row .col.submission-count,
.table-header .col.token-usage,
.table-row .col.token-usage {
  justify-content: flex-end;
  text-align: right;
}

.table-header .col.score .sort-header {
  width: 100%;
  justify-content: flex-end;
}

.table-header .col.name,
.table-row .col.name {
  min-width: 0;
}

.name-text {
  max-width: min(260px, 100%);
}

.personal-stats {
  display: grid;
  grid-template-columns: 96px 124px 96px;
  gap: 28px;
  align-items: start;
}

.personal-stat {
  min-width: 0;
}

@media (max-width: 900px) {
  .ranking-board {
    --ranking-table-columns: 46px minmax(78px, 1fr) 58px 72px 84px;
    --ranking-table-gap: 8px;
  }

  .personal-stats {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .name-text {
    max-width: 100%;
  }
}

@media (max-width: 420px) {
  .ranking-board {
    min-width: 0;
  }

  .table-header,
  .table-row {
    grid-template-columns: 32px minmax(54px, 1fr) 42px 50px 62px;
    gap: 4px;
    padding: 11px 6px;
    font-size: 12px;
  }

  .table-header .col,
  .table-row .col {
    min-width: 0;
  }

  .rank-badge,
  .rank-badge.rank-1,
  .rank-badge.rank-2,
  .rank-badge.rank-3 {
    width: 26px;
    height: 26px;
    font-size: 12px;
  }

  .name-text {
    max-width: 100%;
  }

  .score-value {
    font-size: 13px;
  }

  .col.submission-count,
  .col.token-usage {
    font-size: 11px;
  }
}

</style>
