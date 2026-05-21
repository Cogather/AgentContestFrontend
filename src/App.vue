<script setup>
import { ref, onMounted } from 'vue'
import { userApi } from './api'
import UploadModal from './components/UploadModal.vue'
import UserConfigModal from './components/UserConfigModal.vue'
import HistoryModal from './components/HistoryModal.vue'
import RankingBoard from './components/RankingBoard.vue'
import IconSymbol from './components/IconSymbol.vue'

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

const USER_STORAGE_KEY = 'agent_game_user'
const THIRD_PARTY_USER_ID_STORAGE_KEY = 'agent_game_third_party_user_id'
const THIRD_PARTY_USER_ID_QUERY_KEYS = ['user_id', 'userId', 'employee_id', 'employeeId', 'work_id', 'workId']
const DEV_MOCK_THIRD_PARTY_USER_ID = import.meta.env.VITE_MOCK_THIRD_PARTY_USER_ID || '10000001'

// 用户配置
const currentUser = ref(null)
const sessionReady = ref(false)
const showUploadModal = ref(false)
const showConfigModal = ref(false)
const showHistoryModal = ref(false)
const rankingBoardRef = ref(null)
const registerForm = ref({
  user_id: '',
  username: ''
})
const registerLoading = ref(false)
const registerError = ref('')

const saveCurrentUser = (user) => {
  currentUser.value = user
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

const normalizeUserId = (value) => {
  const normalized = String(value || '').replace(/\D/g, '').slice(0, 8)
  return normalized.length === 8 ? normalized : ''
}

const resolveThirdPartyUserId = () => {
  const params = new URLSearchParams(window.location.search)
  const queryUserId = THIRD_PARTY_USER_ID_QUERY_KEYS
    .map(key => params.get(key))
    .find(value => value)
  const normalizedQueryUserId = normalizeUserId(queryUserId)
  if (normalizedQueryUserId) {
    localStorage.setItem(THIRD_PARTY_USER_ID_STORAGE_KEY, normalizedQueryUserId)
    return normalizedQueryUserId
  }
  const storedUserId = normalizeUserId(localStorage.getItem(THIRD_PARTY_USER_ID_STORAGE_KEY))
  if (storedUserId) {
    return storedUserId
  }
  if (import.meta.env.DEV) {
    return normalizeUserId(DEV_MOCK_THIRD_PARTY_USER_ID)
  }
  return ''
}

const logoutUser = () => {
  const previousUserId = normalizeUserId(currentUser.value?.user_id)
  if (previousUserId) {
    localStorage.setItem(THIRD_PARTY_USER_ID_STORAGE_KEY, previousUserId)
  }
  currentUser.value = null
  showUploadModal.value = false
  showConfigModal.value = false
  showHistoryModal.value = false
  registerForm.value = {
    user_id: previousUserId || resolveThirdPartyUserId(),
    username: ''
  }
  registerError.value = ''
  localStorage.removeItem(USER_STORAGE_KEY)
}

// 页面加载时尝试获取当前用户信息
onMounted(async () => {
  try {
    registerForm.value.user_id = resolveThirdPartyUserId()

    // 从 localStorage 读取之前保存的用户信息
    const savedUser = localStorage.getItem(USER_STORAGE_KEY)
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
        localStorage.removeItem(USER_STORAGE_KEY)
      }
    }
  } finally {
    sessionReady.value = true
  }
})

const buildDefaultProfile = () => {
  const username = registerForm.value.username.trim()
  return {
    user_id: registerForm.value.user_id.trim(),
    username,
    area: 'yellow',
    department: '',
    team_name: `${username}-Agent`,
    agent_ip: '127.0.0.1',
    agent_port: 8000
  }
}

const buildExistingProfile = (existingUser, username) => ({
  user_id: existingUser.user_id,
  username,
  area: existingUser.area || 'yellow',
  department: existingUser.department || '',
  team_name: existingUser.team_name || `${username}-Agent`,
  agent_ip: existingUser.agent_ip || '127.0.0.1',
  agent_port: Number(existingUser.agent_port || 8000)
})

const loginUser = async () => {
  registerError.value = ''
  const userId = registerForm.value.user_id.trim()
  const username = registerForm.value.username.trim()

  if (!userId || userId.length !== 8) {
    registerError.value = '未获取到有效工号，请先完成第三方登录'
    return
  }
  if (!username) {
    registerError.value = '请输入昵称'
    return
  }

  registerLoading.value = true
  try {
    let existingUser = null
    try {
      const existingRes = await userApi.getUser(userId)
      existingUser = existingRes.code === 0 ? existingRes.data : null
    } catch (e) {
      existingUser = null
    }

    const payload = existingUser
      ? buildExistingProfile(existingUser, username)
      : buildDefaultProfile()
    const res = existingUser
      ? await userApi.updateUser(payload.user_id, payload)
      : await userApi.addUser(payload)

    if (res.code === 0 || res.code === 409) {
      saveCurrentUser(res.data || payload)
    } else {
      registerError.value = res.message || '登录失败'
    }
  } catch (error) {
    console.error('Login error:', error)
    registerError.value = '登录失败，请检查网络连接'
  } finally {
    registerLoading.value = false
  }
}

// 打开配置弹窗
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
      saveCurrentUser(res.data || data)
      alert('配置保存成功！')
    } else {
      alert(res.message || '保存失败')
    }
  } catch (error) {
    console.error('Save config error:', error)
    alert('保存失败，请检查网络连接')
  }
}

// 打开历史上传记录
const openHistory = () => {
  if (!currentUser.value) {
    alert('请先配置参赛信息')
    return
  }
  showHistoryModal.value = true
}

// 关闭历史上传记录
const closeHistory = () => {
  showHistoryModal.value = false
}

// 打开上传弹窗
const openUpload = () => {
  if (!currentUser.value) {
    alert('请先配置参赛信息')
    return
  }
  showUploadModal.value = true
}

// 关闭上传弹窗
const closeUpload = () => {
  showUploadModal.value = false
}

// 处理上传成功
const handleUploadSuccess = () => {
  closeUpload()
  if (rankingBoardRef.value) {
    rankingBoardRef.value.refresh()
  }
  alert('代码上传成功！')
}

// 查看平台操作指导
const showGuide = () => {
  // TODO: 请替换为实际的操作指导文档链接
  window.open('https://www.example.com/guide', '_blank')
}
</script>

<template>
  <div class="app">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-mark">
            <IconSymbol name="agent" :size="21" />
          </span>
          <span class="logo-text">西研软件大赛</span>
        </div>
        <div class="header-right">
          <div class="status-indicator" v-if="currentUser">
            <span class="status-dot"></span>
            <span class="status-text">{{ currentUser.username }}</span>
          </div>
          <button v-if="currentUser" class="logout-btn" @click="logoutUser">
            退出登录
          </button>
        </div>
      </div>
    </header>

    <main v-if="sessionReady && !currentUser" class="register-main">
      <section class="register-shell">
        <div class="register-brand" aria-label="西研软件大赛">
          <h1 class="register-title">西研软件大赛</h1>
          <span class="register-line"></span>
        </div>

        <form class="register-panel" @submit.prevent="loginUser">
          <div class="register-panel-header">
            <span class="card-icon">
              <IconSymbol name="user" />
            </span>
            <h2>参赛登录</h2>
          </div>

          <div class="register-fields">
            <div class="register-field">
              <span>工号</span>
              <div class="register-readonly-value" :class="{ empty: !registerForm.user_id }">
                {{ registerForm.user_id || '等待第三方登录返回工号' }}
              </div>
              <p class="register-helper">工号仅供提交使用，不会出现在排行榜中</p>
            </div>

            <label class="register-field">
              <span>昵称</span>
              <input
                v-model="registerForm.username"
                type="text"
                maxlength="20"
                placeholder="请输入昵称"
              />
            </label>
          </div>

          <p v-if="registerError" class="register-error">{{ registerError }}</p>

          <button class="btn btn-primary register-submit" type="submit" :disabled="registerLoading || !registerForm.user_id">
            {{ registerLoading ? '登录中...' : '登录' }}
          </button>
        </form>
      </section>
    </main>

    <!-- 主要内容 -->
    <main v-else-if="sessionReady" class="main">
      <!-- 背景图展示区域 -->
      <div class="hero-section">
        <div class="hero-title-shell" aria-label="西研软件大赛">
          <h1 class="hero-title" data-text="西研软件大赛">西研软件大赛</h1>
          <span class="hero-title-line"></span>
        </div>
      </div>

      <!-- 功能模块区域 -->
      <div class="container">
        <!-- 用户信息 + 参赛题目 -->
        <div class="user-section">
          <!-- 参赛题目 -->
          <div class="card challenge-card">
            <div class="card-header">
              <span class="card-icon">
                <IconSymbol name="file" />
              </span>
              <h2>参赛题目</h2>
            </div>
            <div class="card-body">
              <div class="challenge-content">
                <pre class="challenge-text">{{ challengeContent }}</pre>
              </div>
            </div>
          </div>

          <!-- 用户操作面板 -->
          <div class="card user-card">
            <div class="card-header">
              <span class="card-icon">
                <IconSymbol name="user" />
              </span>
              <h2>参赛信息</h2>
              <button class="btn-guide" @click="showGuide">
                <IconSymbol name="guide" :size="15" />
                平台操作指导
              </button>
            </div>
            <div class="card-body">
              <!-- 已配置状态 -->
              <div v-if="currentUser" class="user-info">
                <div class="user-profile">
                  <div class="user-avatar">{{ currentUser.username?.slice(0, 1) || '参' }}</div>
                  <div class="user-identity">
                    <span class="identity-label">当前参赛人</span>
                    <strong>{{ currentUser.username }}</strong>
                  </div>
                </div>

                <div class="info-grid">
                  <div class="info-item info-item-wide">
                    <span class="label">工号</span>
                    <span class="value">{{ currentUser.user_id }}</span>
                  </div>
                </div>

                <div class="action-buttons">
                  <button class="btn btn-upload" @click="openUpload">
                    <IconSymbol name="upload" :size="16" />
                    上传代码
                  </button>
                  <button class="btn btn-secondary" @click="openHistory">
                    <IconSymbol name="history" :size="16" />
                    历史上传记录
                  </button>
                </div>
              </div>

              <!-- 未配置状态 -->
              <div v-else class="no-user">
                <p>请先配置您的参赛信息</p>
                <button class="btn btn-primary btn-large" @click="openConfig">
                  立即配置
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧面板：排行榜 -->
        <div class="right-panel">
          <div class="card ranking-card">
            <div class="card-header">
              <span class="card-icon">
                <IconSymbol name="trophy" />
              </span>
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
    <UploadModal
      :visible="showUploadModal"
      :userId="currentUser?.user_id"
      @close="closeUpload"
      @success="handleUploadSuccess"
    />

    <UserConfigModal
      :visible="showConfigModal"
      :initialData="currentUser || {}"
      @close="closeConfig"
      @confirm="saveConfig"
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
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    linear-gradient(rgba(29, 78, 216, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 124, 255, 0.035) 1px, transparent 1px),
    linear-gradient(135deg, #f8fbff 0%, #f3f6fb 52%, #ffffff 100%);
  background-size: 32px 32px, 32px 32px, auto;
  color: #0f172a;
  min-height: 100vh;
  overflow-x: hidden;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(20, 33, 46, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(15, 124, 255, 0.28);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(15, 124, 255, 0.46);
}
</style>

<style scoped>
.app {
  --surface: rgba(255, 255, 255, 0.96);
  --surface-soft: rgba(247, 250, 248, 0.94);
  --border: rgba(29, 78, 216, 0.13);
  --text: #0f172a;
  --muted: #64748b;
  --accent: #0f7cff;
  --accent-blue: #1d4ed8;
  --accent-cyan: #0891b2;
  --accent-soft: rgba(15, 124, 255, 0.08);
  --shadow: 0 16px 36px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 124, 255, 0.035);
  background:
    linear-gradient(rgba(29, 78, 216, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 124, 255, 0.035) 1px, transparent 1px),
    linear-gradient(135deg, #f8fbff 0%, #f3f6fb 52%, #ffffff 100%);
  background-size: 32px 32px, 32px 32px, auto;
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
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.92), rgba(248, 251, 255, 0));
  backdrop-filter: blur(12px);
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

.logo-mark {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(15, 124, 255, 0.28);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(238, 245, 255, 0.9));
  color: var(--accent);
  box-shadow: inset 0 0 14px rgba(15, 124, 255, 0.08), 0 8px 18px rgba(15, 23, 42, 0.08);
}

.logo-text {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
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
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--accent);
  box-shadow: 0 0 10px rgba(15, 124, 255, 0.38);
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
  color: var(--text);
  font-weight: 600;
}

.logout-btn {
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid rgba(29, 78, 216, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--accent-blue);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.logout-btn:hover {
  border-color: rgba(29, 78, 216, 0.34);
  background: rgba(29, 78, 216, 0.08);
  box-shadow: 0 8px 18px rgba(29, 78, 216, 0.08);
}

/* 主要内容 */
.main {
  position: relative;
  z-index: 1;
}

.register-main {
  min-height: 100vh;
  padding: 110px 24px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image:
    linear-gradient(180deg, rgba(248, 251, 255, 0.18), rgba(248, 251, 255, 0.96) 88%),
    url('./assets/banner-ai-v2.png');
  background-size: cover;
  background-position: center;
}

.register-shell {
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.register-brand {
  text-align: center;
}

.register-title {
  margin: 0;
  font-family: Impact, 'Arial Black', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 52px;
  line-height: 1;
  letter-spacing: 0;
  color: transparent;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 26%, #60a5fa 58%, #1d4ed8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 12px 18px rgba(29, 78, 216, 0.2));
  text-shadow: 2px 2px 0 rgba(8, 145, 178, 0.3);
}

.register-line {
  display: block;
  width: 220px;
  max-width: 62%;
  height: 4px;
  margin: 16px auto 0;
  background: linear-gradient(90deg, transparent 0%, #1d4ed8 18%, #0f7cff 50%, #0891b2 82%, transparent 100%);
  clip-path: polygon(0 0, 94% 0, 100% 100%, 6% 100%);
}

.register-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--shadow);
  backdrop-filter: blur(12px);
}

.register-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.register-panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text);
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

.register-field input {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid rgba(15, 42, 77, 0.14);
  border-radius: 6px;
  background: rgba(248, 251, 255, 0.84);
  color: var(--text);
  font: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.register-field input:focus {
  border-color: rgba(15, 124, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(15, 124, 255, 0.1);
}

.register-readonly-value {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(15, 42, 77, 0.12);
  border-radius: 6px;
  background: rgba(226, 232, 240, 0.62);
  color: var(--text);
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

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.64;
  transform: none;
}

/* 背景图展示区域 */
.hero-section {
  height: 320px;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 70px 24px 24px;
  background-image: url('./assets/banner-ai-v2.png');
  background-size: cover;
  background-position: center;
  background-color: #f8fbff;
  background-blend-mode: normal;
  border-bottom: none;
  position: relative;
  overflow: hidden;
}

.hero-section::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.02), rgba(248, 251, 255, 0.18) 58%, rgba(248, 251, 255, 0.96) 92%, #f8fbff 100%),
    linear-gradient(90deg, rgba(15, 124, 255, 0.1), transparent 36%, rgba(8, 145, 178, 0.08));
  pointer-events: none;
}

.hero-title-shell {
  position: relative;
  z-index: 1;
  min-width: min(760px, 92vw);
  padding: 14px 46px 24px;
  text-align: center;
  isolation: isolate;
}

.hero-title-shell::before,
.hero-title-shell::after {
  content: "";
  position: absolute;
  left: 18px;
  right: 18px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(29, 78, 216, 0.7), rgba(15, 124, 255, 0.8), rgba(8, 145, 178, 0.72), transparent);
  clip-path: polygon(4% 0, 96% 0, 100% 100%, 0 100%);
}

.hero-title-shell::before {
  top: 0;
}

.hero-title-shell::after {
  bottom: 8px;
}

.hero-title {
  position: relative;
  margin: 0;
  font-family: Impact, 'Arial Black', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 74px;
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: 0;
  transform: skewX(-7deg);
  color: transparent;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 24%, #60a5fa 54%, #1d4ed8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-stroke: 0;
  filter: drop-shadow(0 12px 18px rgba(29, 78, 216, 0.18));
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.86),
    2px 2px 0 rgba(8, 145, 178, 0.32),
    0 0 20px rgba(15, 124, 255, 0.22);
}

.hero-title::before,
.hero-title::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-title::before {
  color: rgba(15, 124, 255, 0.22);
  -webkit-text-stroke: 1px rgba(15, 124, 255, 0.42);
  transform: translate(5px, 5px);
  z-index: -1;
}

.hero-title::after {
  color: rgba(255, 255, 255, 0.72);
  clip-path: polygon(0 12%, 100% 7%, 100% 23%, 0 30%);
  text-shadow: 0 0 8px rgba(8, 145, 178, 0.2);
  transform: translate(-3px, -2px);
}

.hero-title-line {
  display: block;
  width: 380px;
  max-width: 56%;
  height: 5px;
  margin: 18px auto 0;
  background: linear-gradient(90deg, transparent 0%, #1d4ed8 18%, #0f7cff 50%, #0891b2 82%, transparent 100%);
  box-shadow: 0 0 16px rgba(15, 124, 255, 0.26), 0 5px 0 rgba(29, 78, 216, 0.08);
  clip-path: polygon(0 0, 94% 0, 100% 100%, 6% 100%);
}

.container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 22px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
  z-index: 2;
}

/* 用户信息区域 */
.user-section {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 18px;
  align-items: stretch;
}

.user-section > .card {
  height: 360px;
}

/* 左侧面板 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片通用样式 */
.card {
  background: var(--surface);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #1d4ed8, #0f7cff, #0891b2);
  opacity: 0.84;
}

.card:hover {
  border-color: rgba(15, 124, 255, 0.28);
  box-shadow: var(--shadow);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 54px;
  min-height: 52px;
  padding: 10px 16px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 0.92));
  border-bottom: 1px solid var(--border);
}

.card-icon {
  width: 28px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid rgba(15, 124, 255, 0.16);
  box-shadow: inset 0 0 12px rgba(15, 124, 255, 0.05);
}

.card-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
}

.btn-guide {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid rgba(29, 78, 216, 0.22);
  border-radius: 6px;
  background: rgba(29, 78, 216, 0.07);
  color: var(--accent-blue);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-guide:hover {
  background: rgba(29, 78, 216, 0.12);
}

.card-body {
  padding: 16px;
}

/* 参赛题目卡片 */
.challenge-card {
  display: flex;
  flex-direction: column;
}

.challenge-card .card-body {
  padding: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.challenge-content {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.challenge-text {
  flex: 1;
  margin: 0;
  padding: 16px 20px 14px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.72;
  color: #334155;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(15, 124, 255, 0.32) rgba(15, 42, 77, 0.04);
}

.challenge-text::-webkit-scrollbar {
  width: 6px;
}

.challenge-text::-webkit-scrollbar-track {
  background: rgba(15, 42, 77, 0.04);
  border-radius: 3px;
}

.challenge-text::-webkit-scrollbar-thumb {
  background: rgba(15, 124, 255, 0.32);
  border-radius: 3px;
}

.challenge-text::-webkit-scrollbar-thumb:hover {
  background: rgba(15, 124, 255, 0.48);
}

/* 用户卡片 */
.user-card {
  display: flex;
  flex-direction: column;
}

.user-card .card-body {
  display: flex;
  flex: 1;
  padding: 16px;
  min-height: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  width: 100%;
  min-width: 0;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(15, 124, 255, 0.14);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 0.92));
}

.user-avatar {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(29, 78, 216, 0.12), rgba(8, 145, 178, 0.1));
  border: 1px solid rgba(15, 124, 255, 0.18);
  color: var(--accent-blue);
  font-size: 19px;
  font-weight: 800;
}

.user-identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.identity-label {
  color: var(--muted);
  font-size: 12px;
}

.user-identity strong {
  color: var(--text);
  font-size: 17px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.info-item {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(15, 42, 77, 0.1);
  border-radius: 8px;
  background: rgba(248, 251, 255, 0.68);
}

.info-item-wide {
  grid-column: 1 / -1;
}

.info-item .label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--muted);
}

.info-item .value {
  display: block;
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 14px;
  color: var(--text);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: auto;
  padding-top: 0;
}

.user-card .action-buttons .btn {
  width: 100%;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
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

.btn-primary {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent));
  color: #fff;
  box-shadow: 0 0 0 1px rgba(15, 124, 255, 0.14), 0 10px 24px rgba(29, 78, 216, 0.18);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(29, 78, 216, 0.24);
}

.btn-secondary {
  width: 176px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover {
  border-color: rgba(29, 78, 216, 0.28);
  color: var(--accent-blue);
  box-shadow: 0 8px 20px rgba(29, 78, 216, 0.08);
}

.btn-large {
  padding: 14px 30px;
  font-size: 16px;
}

.btn-upload {
  width: 176px;
  background: linear-gradient(135deg, #1d4ed8, #0f7cff 58%, #0891b2);
  color: #fff;
  border: 1px solid rgba(15, 124, 255, 0.22);
}

.btn-upload:hover,
.btn-upload.is-dragging {
  transform: translateY(-1px);
  box-shadow: 0 0 0 1px rgba(15, 124, 255, 0.14), 0 12px 30px rgba(29, 78, 216, 0.22);
}

.btn-upload.is-dragging {
  background: linear-gradient(135deg, #059669, #047857);
  transform: scale(1.05);
}

/* 未配置状态 */
.no-user {
  text-align: center;
  padding: 24px 0;
}

.no-user p {
  color: var(--muted);
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
  padding: 5px 10px;
  background: var(--accent-soft);
  border: 1px solid rgba(15, 124, 255, 0.22);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: var(--accent);
  box-shadow: 0 0 10px rgba(15, 124, 255, 0.42);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.ranking-card .card-body {
  padding: 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .user-section {
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

  .hero-section {
    height: 250px;
    min-height: 220px;
    padding: 66px 16px 24px;
  }

  .hero-title-shell {
    min-width: 0;
    width: 100%;
    padding: 10px 18px 20px;
  }

  .hero-title {
    font-size: 42px;
  }

  .register-main {
    padding: 96px 16px 32px;
    align-items: flex-start;
  }

  .register-title {
    font-size: 40px;
  }

  .register-panel {
    padding: 18px;
  }

  .container {
    margin: 0 auto;
    padding: 18px 14px 32px;
  }

  .card-header {
    align-items: flex-start;
    flex-wrap: wrap;
    height: auto;
    min-height: 56px;
  }

  .action-buttons {
    align-items: stretch;
  }

  .btn-secondary,
  .btn-upload {
    width: 100%;
  }
}
</style>
