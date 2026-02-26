<template>
  <div class="ranking-board">
    <!-- 顶部统计卡片 -->
    <div class="stats-section">
      <div class="stat-card total">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalParticipants }}</div>
          <div class="stat-label">参赛人数</div>
        </div>
      </div>
      <div class="stat-card score">
        <div class="stat-icon">🏆</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalScore }}</div>
          <div class="stat-label">最高得分</div>
        </div>
      </div>
    </div>

    <!-- 个人积分卡片 -->
    <div class="personal-card" v-if="personalRank">
      <div class="personal-badge">我的积分</div>
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
            <span class="label">完成任务</span>
            <span class="value">{{ personalRank.completed_tasks }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 未登录时的提示 -->
    <div class="personal-card personal-card-empty" v-else>
      <div class="empty-icon">🔐</div>
      <div class="empty-text">登录后查看我的排名</div>
    </div>

    <!-- 排行榜表格 -->
    <div class="table-container">
      <div class="table-header">
        <div class="col rank">排名</div>
        <div class="col name">姓名</div>
        <div class="col user-id">工号</div>
        <div class="col department">部门</div>
        <div class="col agent">Agent</div>
        <div class="col tasks">完成任务</div>
        <div class="col score">得分</div>
        <div class="col time">时间</div>
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
          <div class="col department">{{ item.department || '-' }}</div>
          <div class="col agent">
            <span class="agent-name">{{ item.team_name }}</span>
          </div>
          <div class="col tasks">
            <span class="tasks-count">{{ item.completed_tasks }}</span>
          </div>
          <div class="col score">
            <span class="score-value">{{ item.score }}</span>
          </div>
          <div class="col time">{{ formatTime(item.update_time) }}</div>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { rankApi } from '../api'

const props = defineProps({
  currentUserId: String
})

const rankingList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const personalRank = ref(null)

// Mock 数据生成函数
const generateMockData = (count = 100) => {
  const departments = ['研发部', '产品部', '测试部', '运维部', '设计部']
  const agents = ['DeepSeek-V3', 'GPT-4o', 'Claude-3.5', 'Gemini-Pro', 'Llama-3']
  
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    username: `参赛者${1000 + i}`,
    user_id: `USER_${2024000 + i}`,
    department: departments[Math.floor(Math.random() * departments.length)],
    team_name: agents[Math.floor(Math.random() * agents.length)],
    completed_tasks: Math.floor(Math.random() * 50) + 10,
    score: Math.floor(Math.random() * 1000) + 500,
    update_time: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
  })).sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }))
}

const totalParticipants = computed(() => rankingList.value.length)

const totalScore = computed(() => {
  if (rankingList.value.length === 0) return 0
  return Math.max(...rankingList.value.map(item => item.score || 0))
})

const totalPages = computed(() => {
  return Math.ceil(rankingList.value.length / pageSize.value)
})

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return rankingList.value.slice(start, end)
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

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '-'
  }
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const POLL_INTERVAL = 5000 // 每 5 秒刷新一次实时排名
let pollTimer = null

const loadRanking = async (silent = false) => {
  try {
    const res = await rankApi.getRankList(1000)
    if (res.code === 0 && res.data && res.data.length > 0) {
      rankingList.value = res.data
    } else {
      // 如果没有数据，加载 Mock 数据
      rankingList.value = generateMockData()
    }

    // 查找当前用户排名
    if (props.currentUserId) {
      const myRank = rankingList.value.find(item => item.user_id === props.currentUserId)
      if (myRank) {
        personalRank.value = myRank
      } else {
        // 如果排行榜中没有，尝试获取单独的用户排名
        try {
          const userRankRes = await rankApi.getUserRank(props.currentUserId)
          if (userRankRes.code === 0 && userRankRes.data) {
            personalRank.value = userRankRes.data
          }
        } catch (e) {
          personalRank.value = null
        }
      }
    }
  } catch (error) {
    if (!silent) console.error('Failed to load ranking:', error)
    // 接口失败时也加载 Mock 数据，方便演示
    rankingList.value = generateMockData()
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
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border-radius: 12px;
}

.stat-card.total .stat-icon {
  background: rgba(255, 127, 80, 0.15);
}

.stat-card.score .stat-icon {
  background: rgba(237, 137, 54, 0.15);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333333;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #888888;
  margin-top: 4px;
}

.personal-card {
  position: relative;
  padding: 24px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 127, 80, 0.3);
  border-radius: 16px;
  margin-bottom: 24px;
  overflow: hidden;
}

/* 未登录提示卡片 */
.personal-card-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(0, 0, 0, 0.1);
}

.personal-card-empty::before {
  display: none;
}

.personal-card-empty .empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.personal-card-empty .empty-text {
  color: #888888;
  font-size: 14px;
}

.personal-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #ff7f50, #ff6347);
}

.personal-badge {
  position: absolute;
  top: 12px;
  right: 16px;
  padding: 4px 12px;
  background: rgba(255, 127, 80, 0.2);
  color: #ff6347;
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
}

.personal-info {
  display: flex;
  align-items: center;
  gap: 32px;
}

.personal-rank {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rank-number {
  font-size: 42px;
  font-weight: 700;
  color: #ff6347;
  line-height: 1;
}

.rank-label {
  font-size: 13px;
  color: #888888;
  margin-top: 4px;
}

.personal-stats {
  display: flex;
  gap: 40px;
}

.personal-stat {
  display: flex;
  flex-direction: column;
}

.personal-stat .label {
  font-size: 13px;
  color: #888888;
  margin-bottom: 4px;
}

.personal-stat .value {
  font-size: 24px;
  font-weight: 600;
  color: #333333;
}

.table-container {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 80px 100px 100px 100px 1fr 100px 100px 140px;
  gap: 8px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.table-header .col {
  font-size: 12px;
  font-weight: 600;
  color: #888888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-body {
  max-height: 500px;
  overflow-y: auto;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 127, 80, 0.3) rgba(0, 0, 0, 0.05);
}

.table-body::-webkit-scrollbar {
  width: 6px;
}

.table-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.table-body::-webkit-scrollbar-thumb {
  background: rgba(255, 127, 80, 0.3);
  border-radius: 3px;
}

.table-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 127, 80, 0.5);
}

.table-row {
  display: grid;
  grid-template-columns: 80px 100px 100px 100px 1fr 100px 100px 140px;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.3s;
}

.table-row:hover {
  background: rgba(0, 212, 255, 0.05);
}

.table-row.is-me {
  background: rgba(0, 212, 255, 0.1);
  border-left: 3px solid #00d4ff;
}

.table-row.top-three {
  background: linear-gradient(90deg, rgba(237, 137, 54, 0.1), transparent);
}

.table-row .col {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #666666;
}

.table-row .col.name {
  font-weight: 500;
  color: #333333;
}

.rank-badge {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  color: #666666;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #000;
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.4);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #000;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #000;
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
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
}

.agent-name {
  padding: 4px 10px;
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  font-size: 12px;
  border-radius: 6px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tasks-count {
  font-weight: 600;
  color: #48bb78;
}

.score-value {
  font-weight: 700;
  font-size: 16px;
  color: #ed8936;
}

.loading-row,
.empty-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #718096;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 212, 255, 0.2);
  border-top-color: #00d4ff;
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
  margin-top: 20px;
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
  color: #666;
}

.page-size-select select {
  padding: 4px 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.5);
  color: #333;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.page-size-select select:hover {
  border-color: rgba(0, 212, 255, 0.3);
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #a0aec0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  background: rgba(0, 212, 255, 0.1);
  border-color: rgba(0, 212, 255, 0.3);
  color: #00d4ff;
}

.page-btn:disabled {
  opacity: 0.4;
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
  color: #a0aec0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.page-num:hover {
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
}

.page-num.active {
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  color: #000;
  font-weight: 600;
}

@media (max-width: 900px) {
  .pagination-bar {
    flex-direction: column;
    gap: 16px;
    padding-bottom: 10px;
  }

  .page-size-select {
    position: static;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .table-header,
  .table-row {
    grid-template-columns: 60px 80px 80px 1fr 80px 80px;
  }

  .table-header .col.time,
  .table-row .col.time,
  .table-header .col.department,
  .table-row .col.department {
    display: none;
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
