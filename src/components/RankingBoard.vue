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
            <span class="label">执行时间(s)</span>
            <span class="value">{{ formatDuration(personalRank.execution_time) }}</span>
          </div>
          <div class="personal-stat">
            <span class="label">Token消耗</span>
            <span class="value">{{ formatNumber(personalRank.token_usage) }}</span>
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
        <select v-model="searchField" class="search-select">
          <option value="all">全部</option>
          <option value="username">姓名</option>
          <option value="user_id">工号</option>
        </select>
        <div class="search-input-wrapper">
          <input 
            v-model="searchValue" 
            :placeholder="searchPlaceholder" 
            class="search-input"
            @input="currentPage = 1"
          />
          <button v-if="searchValue" class="clear-btn" @click="searchValue = ''; currentPage = 1">×</button>
        </div>
      </div>
    </div>

    <!-- 排行榜表格 -->
    <div class="table-container">
      <div class="table-header">
        <div class="col rank">排名</div>
        <div class="col name">姓名</div>
        <div class="col user-id">工号</div>
        <div class="col score filterable">
          <div class="sort-header" @click="toggleSort('score')">
            得分
            <span class="sort-icon" :class="sortOrder">{{ sortOrder === 'desc' ? '↓' : '↑' }}</span>
          </div>
        </div>
        <div class="col execution-time">执行时间(s)</div>
        <div class="col token-usage">Token消耗</div>
      </div>

      <div v-if="paginatedList.length === 0" class="empty-row">
        暂无排名数据
      </div>

      <div v-else class="table-body">
        <div
          v-for="(item, index) in paginatedList"
          :key="item.user_id"
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
            'top-two-hundred': item.rank > 100 && item.rank <= 200,
            'is-me': item.user_id === currentUserId
          }"
        >
          <div class="col rank">
            <span class="rank-badge" :class="'rank-' + item.rank">{{ item.rank }}</span>
          </div>
          <div class="col name">
            <span class="name-text">{{ item.username }}</span>
            <span class="me-badge" v-if="item.user_id === currentUserId">我</span>
          </div>
          <div class="col user-id">{{ item.user_id }}</div>
          <div class="col score">
            <span class="score-value">{{ item.score }}</span>
          </div>
          <div class="col execution-time">{{ formatDuration(item.execution_time) }}</div>
          <div class="col token-usage">{{ formatNumber(item.token_usage) }}</div>
        </div>
      </div>
    </div>

    <!-- 分页控制区 -->
    <div class="pagination-bar" v-if="rankingList.length > 0">
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { rankApi } from '../api'
import IconSymbol from './IconSymbol.vue'

const props = defineProps({
  currentUserId: String
})

const rankingList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const personalRank = ref(null)
const jumpPageNum = ref('')
const searchField = ref('all')
const searchValue = ref('')
const sortOrder = ref('desc') // desc | asc

const searchPlaceholder = computed(() => {
  const map = {
    all: '搜索姓名或工号...',
    username: '请输入姓名...',
    user_id: '请输入工号...'
  }
  return map[searchField.value]
})

const toggleSort = (field) => {
  if (field === 'score') {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  }
}

// Mock 数据生成函数
const generateMockData = (count = 100) => {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    username: `参赛者${1000 + i}`,
    user_id: `USER_${2024000 + i}`,
    score: Math.floor(Math.random() * 1000) + 500,
    execution_time: Number((45 + Math.random() * 150).toFixed(2)),
    token_usage: Math.floor(Math.random() * 70000) + 20000
  })).sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }))
}

const filteredRankingList = computed(() => {
  let result = rankingList.value

  // 统一搜索
  if (searchValue.value) {
    const keyword = searchValue.value.trim().toLowerCase()
    result = result.filter(item => {
      if (searchField.value === 'all') {
        return String(item.username).toLowerCase().includes(keyword) ||
               String(item.user_id).toLowerCase().includes(keyword)
      } else {
        return String(item[searchField.value]).toLowerCase().includes(keyword)
      }
    })
  }

  // 排序
  result = [...result].sort((a, b) => {
    if (sortOrder.value === 'desc') {
      return (b.score || 0) - (a.score || 0)
    } else {
      return (a.score || 0) - (b.score || 0)
    }
  })

  return result
})

const totalParticipants = computed(() => rankingList.value.length)

const totalScore = computed(() => {
  if (rankingList.value.length === 0) return 0
  return Math.max(...rankingList.value.map(item => item.score || 0))
})

const totalPages = computed(() => {
  return Math.ceil(filteredRankingList.value.length / pageSize.value)
})

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRankingList.value.slice(start, end)
})

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

const formatDuration = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '-'
}

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString('zh-CN') : '-'
}

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

const POLL_INTERVAL = 5000 // 每 5 秒刷新一次实时排名
let pollTimer = null

const loadRanking = async (silent = false) => {
  try {
    const res = await rankApi.getRankList(1000)
    // 只要有数据就显示，不管 code 是否为 0（因为部分成功也会返回数据）
    if (res.data && res.data.length > 0) {
      rankingList.value = res.data
    } else if (res.code !== 0 && rankingList.value.length === 0) {
      // 只有在完全失败且当前没有数据时，才加载 Mock 数据
      rankingList.value = generateMockData()
    }
    // 如果返回空数组但 code 为 0，说明确实没数据，保持为空或清空（视需求而定，这里暂不清空以防闪烁）

    // 查找当前用户排名
    if (props.currentUserId) {
      const myRank = rankingList.value.find(item => item.user_id === props.currentUserId)
      if (myRank) {
        personalRank.value = myRank
      } else {
        // 如果排行榜中没有，尝试获取单独的用户排名
        try {
          const userRankRes = await rankApi.getUserRank(props.currentUserId)
          if (userRankRes && userRankRes.data) {
            personalRank.value = userRankRes.data
          }
        } catch (e) {
          // 忽略错误，保持现有状态
        }
      }
    }
    if (!personalRank.value) {
      personalRank.value = {
        rank: '-',
        score: 0,
        execution_time: null,
        token_usage: null
      }
    }
  } catch (error) {
    if (!silent) console.error('Failed to load ranking:', error)
    // 接口失败时也加载 Mock 数据，方便演示
    if (rankingList.value.length === 0) {
      rankingList.value = generateMockData()
    }
    
    if (!personalRank.value) {
      personalRank.value = {
        rank: '-',
        score: 0,
        execution_time: null,
        token_usage: null
      }
    }
  }
}

// 暴露刷新方法（强制显示 loading）
const refresh = () => loadRanking(false)

defineExpose({
  refresh
})

onMounted(() => {
  loadRanking(false)
  pollTimer = setInterval(() => loadRanking(true), POLL_INTERVAL)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
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
  color: #0f7cff;
}

.stat-card.score .stat-icon {
  background: rgba(29, 78, 216, 0.09);
  border: 1px solid rgba(29, 78, 216, 0.16);
  color: #1d4ed8;
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
  background: linear-gradient(90deg, #0f7cff, #1d4ed8, #10b981);
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
  color: #0f7cff;
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
  color: #0f7cff;
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
  grid-template-columns: 80px minmax(120px, 1.2fr) minmax(120px, 1fr) minmax(100px, 0.8fr) minmax(120px, 0.9fr) minmax(120px, 0.9fr);
  gap: 8px;
  padding: 12px 16px;
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
  color: #0f7cff;
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
  grid-template-columns: 80px minmax(120px, 1.2fr) minmax(120px, 1fr) minmax(100px, 0.8fr) minmax(120px, 0.9fr) minmax(120px, 0.9fr);
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(15, 42, 77, 0.08);
  transition: background 0.2s, box-shadow 0.2s;
}

.table-row:hover {
  background: rgba(15, 124, 255, 0.055);
}

.table-row.is-me {
  background: rgba(15, 124, 255, 0.08);
  border-left: 3px solid #0f7cff;
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
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me-badge {
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(15, 124, 255, 0.1);
  color: #0f7cff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
}

.score-value {
  color: #1d4ed8;
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
  border-top-color: #0f7cff;
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
  color: #0f7cff;
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
  color: #0f7cff;
}

.page-num.active {
  background: linear-gradient(135deg, #0f7cff, #1d4ed8);
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
    grid-template-columns: 56px minmax(76px, 1fr) minmax(86px, 1fr) minmax(72px, 0.8fr) minmax(96px, 0.9fr) minmax(96px, 0.9fr);
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
</style>
