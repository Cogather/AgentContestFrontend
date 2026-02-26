<script setup>
import { ref, onMounted } from 'vue'
import { userApi } from './api'
import UserConfigModal from './components/UserConfigModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import HistoryModal from './components/HistoryModal.vue'
import RankingBoard from './components/RankingBoard.vue'

// 参赛题目
const challengeContent = ref(`欢迎参加 Agent 大赛！

本次大赛主题：通用 Agent 设计挑战

任务目标：
设计并实现一个能够完成多样化任务的通用 Agent 系统，参赛者需要让 Agent 通过我们提供的评测集，根据任务完成情况和得分进行排名。

评分标准：
- 任务完成度
- 任务得分
- 完成时间

祝各位参赛者取得好成绩！`)

// 用户配置
const currentUser = ref(null)
const showConfigModal = ref(false)
// header logo 图片加载失败时显示 emoji
const headerLogoError = ref(false)
const showConfirmModal = ref(false)
const showHistoryModal = ref(false)
const rankingBoardRef = ref(null)

// 页面加载时尝试获取当前用户信息
onMounted(async () => {
  // 从 localStorage 读取之前保存的用户信息
  const savedUser = localStorage.getItem('agent_game_user')
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser)
      currentUser.value = userData
      // 尝试从后端验证用户是否存在
      try {
        const res = await userApi.getUser(userData.user_id)
        if (res.code === 0 && res.data) {
          currentUser.value = res.data
        }
      } catch (e) {
        // 用户可能不存在，保持本地数据
      }
    } catch (e) {
      console.error('Failed to parse saved user:', e)
    }
  }
})

// 打开配置弹窗（仅修改配置）
const openConfig = () => {
  showConfigModal.value = true
}

// 关闭配置弹窗
const closeConfig = () => {
  showConfigModal.value = false
}

// 保存配置（直接保存到后端）
const saveConfig = async (data) => {
  closeConfig()

  try {
    // 先尝试更新用户，如果不存在则创建
    let res
    try {
      res = await userApi.updateUser(data.user_id, data)
    } catch (e) {
      // 用户不存在，尝试创建
      res = await userApi.addUser(data)
    }

    if (res.code === 0 || res.code === 409) {
      // 保存到本地存储
      currentUser.value = data
      localStorage.setItem('agent_game_user', JSON.stringify(data))
      alert('配置保存成功！')
    } else {
      alert(res.message || '保存失败')
    }
  } catch (error) {
    console.error('Save config error:', error)
    alert('保存失败，请检查网络连接')
  }
}

// 开始判题（根据是否有配置决定行为）
const handleJudge = () => {
  if (!currentUser.value) {
    // 没有配置，提示用户配置
    alert('请先配置参赛信息')
    openConfig()
  } else {
    // 已配置，弹出确认框
    openJudgeConfirm()
  }
}

// 打开判题确认弹窗
const openJudgeConfirm = () => {
  showConfirmModal.value = true
}

// 关闭判题确认弹窗
const closeConfirm = () => {
  showConfirmModal.value = false
}

// 确认开始判题
const handleSubmit = async () => {
  if (!currentUser.value) return

  // 刷新排行榜
  if (rankingBoardRef.value) {
    rankingBoardRef.value.refresh()
  }

  closeConfirm()
  alert('判题已启动！')
}

// 打开历史记录
const openHistory = () => {
  if (!currentUser.value) {
    alert('请先配置参赛信息')
    return
  }
  showHistoryModal.value = true
}

// 关闭历史记录
const closeHistory = () => {
  showHistoryModal.value = false
}
</script>

<template>
  <div class="app">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <img
            v-show="!headerLogoError"
            class="logo-img"
            src="./assets/logo.png"
            alt="Agent Game"
            @error="headerLogoError = true"
          />
          <span v-show="headerLogoError" class="logo-icon">🤖</span>
          <span class="logo-text">Agent Game</span>
          <span class="logo-badge">v1.0</span>
        </div>
        <div class="header-right">
          <div class="status-indicator" v-if="currentUser">
            <span class="status-dot"></span>
            <span class="status-text">{{ currentUser.username }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容 -->
    <main class="main">
      <!-- 背景图展示区域 -->
      <div class="hero-section">
      </div>

      <!-- 功能模块区域 -->
      <div class="container">
        <!-- 用户信息 + 参赛题目 -->
        <div class="user-section">
          <!-- 用户操作面板 -->
          <div class="card user-card">
            <div class="card-header">
              <span class="card-icon">👤</span>
              <h2>参赛信息</h2>
            </div>
            <div class="card-body">
              <!-- 已配置状态 -->
              <div v-if="currentUser" class="user-info">
                <div class="info-row">
                  <span class="label">姓名</span>
                  <span class="value">{{ currentUser.username }}</span>
                </div>
                <div class="info-row">
                  <span class="label">工号</span>
                  <span class="value">{{ currentUser.user_id }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Agent</span>
                  <span class="value agent">{{ currentUser.team_name }}</span>
                </div>
                <div class="info-row">
                  <span class="label">地址</span>
                  <span class="value">{{ currentUser.agent_ip }}:{{ currentUser.agent_port }}</span>
                </div>
                <div class="action-buttons">
                  <button class="btn btn-primary" @click="openConfig">
                    <span class="btn-icon">✏️</span>
                    修改配置
                  </button>
                  <button class="btn btn-secondary" @click="openHistory">
                    <span class="btn-icon">📜</span>
                    历史记录
                  </button>
                </div>
              </div>

              <!-- 未配置状态 -->
              <div v-else class="no-user">
                <div class="no-user-icon">👋</div>
                <p>请先配置您的参赛信息</p>
                <button class="btn btn-primary btn-large" @click="openConfig">
                  <span class="btn-icon">⚡</span>
                  立即配置
                </button>
              </div>
            </div>
          </div>

          <!-- 参赛题目 -->
          <div class="card challenge-card">
            <div class="card-header">
              <span class="card-icon">📋</span>
              <h2>参赛题目</h2>
            </div>
            <div class="card-body">
              <pre class="challenge-text">{{ challengeContent }}</pre>
            </div>
          </div>
        </div>

        <!-- 开始判题按钮 -->
        <div class="judge-section">
          <button class="btn btn-judge btn-large" @click="handleJudge">
            <span class="btn-icon">🚀</span>
            开始判题
          </button>
        </div>

        <!-- 右侧面板：排行榜 -->
        <div class="right-panel">
          <div class="card ranking-card">
            <div class="card-header">
              <span class="card-icon">🏆</span>
              <h2>实时排名</h2>
              <span class="live-badge">
                <span class="live-dot"></span>
                LIVE
              </span>
            </div>
            <div class="card-body">
              <RankingBoard
                ref="rankingBoardRef"
                :currentUserId="currentUser?.user_id"
              />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 弹窗组件 -->
    <UserConfigModal
      :visible="showConfigModal"
      :initialData="currentUser || {}"
      @close="closeConfig"
      @confirm="saveConfig"
    />

    <ConfirmModal
      :visible="showConfirmModal"
      :data="currentUser || {}"
      @close="closeConfirm"
      @submit="handleSubmit"
    />

    <HistoryModal
      :visible="showHistoryModal"
      :userId="currentUser?.user_id"
      @close="closeHistory"
    />
  </div>
</template>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace;
  background: #f5f5f5;
  color: #333333;
  min-height: 100vh;
  overflow-x: hidden;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 127, 80, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 127, 80, 0.5);
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  position: relative;
}

/* 顶部导航 */
.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: transparent;
  backdrop-filter: blur(0);
  border-bottom: none;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-img {
  height: 40px;
  width: auto;
  display: block;
  object-fit: contain;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff7f50, #ff6347);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-badge {
  padding: 2px 8px;
  background: rgba(255, 127, 80, 0.15);
  border: 1px solid rgba(255, 127, 80, 0.3);
  border-radius: 8px;
  font-size: 11px;
  color: #ff6347;
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
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 20px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #48bb78;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 13px;
  color: #666666;
}

/* 主要内容 */
.main {
  position: relative;
  z-index: 1;
}

/* 背景图展示区域 */
.hero-section {
  height: 70vh;
  min-height: 500px;
  background-image: url('./assets/bg.png');
  background-size: cover;
  background-position: center top;
}

/* 开始判题按钮区域 */
.judge-section {
  display: flex;
  justify-content: center;
}

.judge-section .btn-judge {
  max-width: 400px;
  padding: 20px 60px;
  font-size: 20px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 用户信息区域 */
.user-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 左侧面板 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片通用样式 */
.card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
}

.card:hover {
  border-color: rgba(255, 127, 80, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.card-icon {
  font-size: 20px;
}

.card-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  flex: 1;
}

.card-body {
  padding: 20px;
}

/* 参赛题目卡片 */
.challenge-card .card-body {
  padding: 0;
}

.challenge-text {
  padding: 20px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  color: #666666;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 280px;
  overflow-y: auto;
}

/* 用户卡片 */
.user-card .card-body {
  padding: 24px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row .label {
  font-size: 13px;
  color: #888888;
}

.info-row .value {
  font-size: 14px;
  color: #333333;
  font-weight: 500;
}

.info-row .value.agent {
  padding: 4px 12px;
  background: rgba(255, 127, 80, 0.15);
  color: #ff6347;
  border-radius: 8px;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

/* 顶部判题按钮样式 */
.btn-judge-top {
  width: 100%;
  padding: 20px 24px;
  font-size: 18px;
  margin-bottom: 20px;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-icon {
  font-size: 16px;
}

.btn-primary {
  flex: 1;
  background: linear-gradient(135deg, #ff7f50, #ff6347);
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 127, 80, 0.3);
}

.btn-secondary {
  flex: 1;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #666666;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.95);
  color: #333333;
}

.btn-large {
  padding: 16px 32px;
  font-size: 16px;
}

.btn-judge {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.btn-judge::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn-judge:hover::before {
  left: 100%;
}

.btn-judge:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(29, 78, 216, 0.4);
}

/* 未配置状态 */
.no-user {
  text-align: center;
  padding: 20px 0;
}

.no-user-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.no-user p {
  color: #888888;
  margin-bottom: 20px;
}

/* 右侧面板 */
.right-panel {
  min-width: 0;
}

/* 排行榜卡片 */
.ranking-card .card-header {
  position: relative;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(72, 187, 120, 0.15);
  border: 1px solid rgba(72, 187, 120, 0.3);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #48bb78;
  letter-spacing: 1px;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #48bb78;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.ranking-card .card-body {
  padding: 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .container {
    grid-template-columns: 1fr;
  }

  .left-panel {
    max-width: 100%;
  }
}

@media (max-width: 640px) {
  .header-content {
    padding: 12px 16px;
  }

  .logo-text {
    font-size: 18px;
  }

  .main {
    padding: 20px 16px;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
