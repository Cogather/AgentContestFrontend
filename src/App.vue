<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { userApi } from './api'
import UploadModal from './components/UploadModal.vue'
import HistoryPage from './components/HistoryPage.vue'
import RankingBoard from './components/RankingBoard.vue'
import IconSymbol from './components/IconSymbol.vue'
import ErrorModal from './components/ErrorModal.vue'
import { getLatestCooldownSubmissionTime } from './utils/submissionCooldown'

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
const EMERGENCY_LOGIN_PATH = '/emergency-login'

// 用户配置
const currentUser = ref(null)
const sessionReady = ref(false)
const showUploadModal = ref(false)
const showHistoryPage = ref(false)
const rankingBoardRef = ref(null)
const errorDialog = ref({
  visible: false,
  message: ''
})
const registerForm = ref({
  user_id: '',
  username: ''
})
const registerLoading = ref(false)
const registerError = ref('')
const isEmergencyLoginPage = ref(window.location.pathname.replace(/\/+$/, '') === EMERGENCY_LOGIN_PATH)
const UPLOAD_INTERVAL_MS = 30 * 60 * 1000
const COMPETITION_START_AT = import.meta.env.VITE_COMPETITION_START_AT || '2026-05-24T08:00:00-07:00'
const COMPETITION_END_AT = import.meta.env.VITE_COMPETITION_END_AT || '2026-06-15T00:00:00-07:00'
const COMPETITION_SCHEDULE_TEXT = import.meta.env.VITE_COMPETITION_SCHEDULE_TEXT || '2026/5/24 8:00--2026/6/14'
const competitionStartDate = new Date(COMPETITION_START_AT)
const competitionEndDate = new Date(COMPETITION_END_AT)
const uploadCooldownEndsAt = ref(0)
const cooldownTick = ref(Date.now())
const isUploadCooldownLoading = ref(false)
const canceledCooldownSubmissionIds = ref(new Set())
let cooldownTimer = null

const uploadCooldownRemainingMs = computed(() => {
  return Math.max(0, uploadCooldownEndsAt.value - cooldownTick.value)
})

const uploadCooldownText = computed(() => {
  const totalSeconds = Math.ceil(uploadCooldownRemainingMs.value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const isUploadCoolingDown = computed(() => uploadCooldownRemainingMs.value > 0)

const isCurrentUserTestAccount = computed(() => {
  return Boolean(currentUser.value?.test_account || currentUser.value?.testAccount)
})

const formatDurationText = (remainingMs) => {
  const safeRemainingMs = Math.max(0, remainingMs)
  const totalSeconds = Math.floor(safeRemainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const competitionPhase = computed(() => {
  const startTime = competitionStartDate.getTime()
  const endTime = competitionEndDate.getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 'unknown'
  }
  if (cooldownTick.value < startTime) {
    return 'pending'
  }
  if (cooldownTick.value >= endTime) {
    return 'ended'
  }
  return 'running'
})

const competitionCountdownLabel = computed(() => {
  if (competitionPhase.value === 'pending') {
    return '距离个人赛正式开始：'
  }
  if (competitionPhase.value === 'running') {
    return '距离个人赛提交结束：'
  }
  return ''
})

const competitionCountdownText = computed(() => {
  const startTime = competitionStartDate.getTime()
  const endTime = competitionEndDate.getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return '待定'
  }
  if (competitionPhase.value === 'pending') {
    return formatDurationText(startTime - cooldownTick.value)
  }
  if (competitionPhase.value === 'running') {
    return formatDurationText(endTime - cooldownTick.value)
  }
  if (competitionPhase.value === 'ended') {
    return '已结束'
  }
  return '待定'
})

const isCompetitionPending = computed(() => {
  return competitionPhase.value === 'pending'
})

const isCompetitionEnded = computed(() => {
  return competitionPhase.value === 'ended'
})

const canUploadNow = computed(() => {
  if (!currentUser.value) {
    return false
  }
  if (isCurrentUserTestAccount.value) {
    return true
  }
  return !isCompetitionPending.value && !isCompetitionEnded.value && !isUploadCooldownLoading.value && !isUploadCoolingDown.value
})

const uploadButtonText = computed(() => {
  if (isCurrentUserTestAccount.value) {
    return '上传代码'
  }
  if (isCompetitionPending.value) {
    return '未到参赛时间，无法提交'
  }
  if (isCompetitionEnded.value) {
    return '个人赛已结束'
  }
  if (isUploadCooldownLoading.value) {
    return '提交状态加载中'
  }
  if (isUploadCoolingDown.value) {
    return `${uploadCooldownText.value} 后可上传`
  }
  return '上传代码'
})

const uploadTipText = computed(() => {
  if (isCurrentUserTestAccount.value) {
    return ''
  }
  if (isCompetitionPending.value) {
    return '大赛开始后开放代码提交'
  }
  if (isCompetitionEnded.value) {
    return '提交通道已关闭'
  }
  if (isUploadCooldownLoading.value) {
    return '正在同步提交状态'
  }
  if (isUploadCoolingDown.value) {
    return '每次上传间隔需满30分钟'
  }
  return ''
})

const normalizeUserProfile = (user) => {
  if (!user) {
    return null
  }
  const uuid = String(user.uuid || user.client_uuid || user.clientUuid || '').trim()
  const userId = normalizeUserId(user.user_id || user.userId)
  const username = String(user.username || '').trim()
  return {
    ...user,
    uuid: uuid,
    user_id: userId,
    username
  }
}

const saveCurrentUser = (user) => {
  const normalizedUser = normalizeUserProfile(user) || user
  currentUser.value = normalizedUser
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
  return normalizedUser
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
  return ''
}

const loadExistingUser = async (userId) => {
  if (!userId) {
    return false
  }
  try {
    const res = await userApi.getMe()
    if (res.code === 0 && res.data) {
      const existingUser = normalizeUserProfile(res.data)
      if (existingUser?.user_id && existingUser.user_id !== userId) {
        return false
      }
      saveCurrentUser(existingUser || res.data)
      return true
    }
  } catch (error) {
    if (![401, 403, 404].includes(error?.response?.status)) {
      console.error('Failed to load current user:', error)
    }
  }
  return false
}

const bootstrapRegisteredUserSession = async (userId) => {
  if (!userId) {
    return {
      success: false,
      newUserRequired: true,
      message: ''
    }
  }
  try {
    const res = await userApi.addUser({
      user_id: userId,
      username: ''
    })
    if (res.code === 0 && res.data) {
      saveCurrentUser(res.data)
      return {
        success: true,
        newUserRequired: false,
        message: ''
      }
    }
    return {
      success: false,
      newUserRequired: false,
      message: res.message || '参赛信息加载失败'
    }
  } catch (error) {
    const status = error?.response?.status
    const responseMessage = error?.response?.data?.message || ''
    if (status === 400 && responseMessage.includes('请输入昵称')) {
      return {
        success: false,
        newUserRequired: true,
        message: ''
      }
    }
    if (status !== 400 || !responseMessage.includes('请输入昵称')) {
      console.error('Failed to bootstrap registered user session:', error)
    }
    return {
      success: false,
      newUserRequired: false,
      message: getRequestErrorMessage(error, '参赛信息加载失败')
    }
  }
}

const submissionId = (submission) => {
  const id = submission?.id ?? submission?.submission_id ?? submission?.submissionId
  return id === null || id === undefined ? '' : String(id)
}

const rememberCanceledCooldownSubmission = (id) => {
  const normalizedId = id === null || id === undefined ? '' : String(id)
  if (!normalizedId) {
    return
  }
  const nextIds = new Set(canceledCooldownSubmissionIds.value)
  nextIds.add(normalizedId)
  canceledCooldownSubmissionIds.value = nextIds
}

const isCanceledCooldownSubmission = (submission) => {
  const id = submissionId(submission)
  return Boolean(id) && canceledCooldownSubmissionIds.value.has(id)
}

const refreshUploadCooldown = async () => {
  if (!currentUser.value || isCurrentUserTestAccount.value) {
    uploadCooldownEndsAt.value = 0
    isUploadCooldownLoading.value = false
    return
  }
  isUploadCooldownLoading.value = true
  try {
    const res = await userApi.getSubmissions()
    const submissions = res.code === 0 && Array.isArray(res.data) ? res.data : []
    const latestSubmittedAt = getLatestCooldownSubmissionTime(
      submissions.filter(submission => !isCanceledCooldownSubmission(submission))
    )
    uploadCooldownEndsAt.value = latestSubmittedAt ? latestSubmittedAt + UPLOAD_INTERVAL_MS : 0
    cooldownTick.value = Date.now()
  } catch (error) {
    console.error('Failed to load upload cooldown:', error)
    uploadCooldownEndsAt.value = 0
  } finally {
    isUploadCooldownLoading.value = false
  }
}

const handleSubmissionCanceled = async (event = {}) => {
  const canceledSubmissionId = typeof event === 'object' ? event?.submissionId : event
  rememberCanceledCooldownSubmission(canceledSubmissionId)
  uploadCooldownEndsAt.value = 0
  cooldownTick.value = Date.now()
  await refreshUploadCooldown()
  if (rankingBoardRef.value) {
    rankingBoardRef.value.refresh()
  }
}

onMounted(async () => {
  cooldownTimer = setInterval(() => {
    cooldownTick.value = Date.now()
  }, 1000)
  if (isEmergencyLoginPage.value) {
    sessionReady.value = true
    return
  }
  try {
    const resolvedUserId = resolveThirdPartyUserId()
    registerForm.value.user_id = resolvedUserId
    registerError.value = resolvedUserId ? '' : '未获取到有效工号，请从大赛入口进入'

    const hasSession = await loadExistingUser(resolvedUserId)
    const bootstrapResult = hasSession
      ? { success: true, newUserRequired: false, message: '' }
      : await bootstrapRegisteredUserSession(resolvedUserId)
    if (bootstrapResult.success) {
      refreshUploadCooldown()
    }
    if (!bootstrapResult.success) {
      currentUser.value = null
      localStorage.removeItem(USER_STORAGE_KEY)
      registerError.value = bootstrapResult.newUserRequired ? '' : bootstrapResult.message || registerError.value
    }
  } finally {
    sessionReady.value = true
  }
})

onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})

const buildDefaultProfile = () => {
  const username = registerForm.value.username.trim()
  return {
    user_id: normalizeUserId(registerForm.value.user_id),
    username
  }
}

const getRequestErrorMessage = (error, fallback) => {
  const responseMessage = error?.response?.data?.message
  if (responseMessage) {
    return `${fallback}：${responseMessage}`
  }
  if (error?.response?.status) {
    return `${fallback}：HTTP ${error.response.status}`
  }
  if (error?.code === 'ECONNABORTED') {
    return `${fallback}：请求超时`
  }
  if (error?.message) {
    return `${fallback}：${error.message}`
  }
  return fallback
}

const showErrorDialog = (message) => {
  errorDialog.value = {
    visible: true,
    message
  }
}

const closeErrorDialog = () => {
  errorDialog.value = {
    visible: false,
    message: ''
  }
}

const loginUser = async () => {
  registerError.value = ''
  const userId = normalizeUserId(registerForm.value.user_id)

  if (!userId || userId.length !== 8) {
    registerError.value = '未获取到有效工号，请先完成第三方登录'
    return
  }
  if (!registerForm.value.username.trim()) {
    registerError.value = '请输入昵称'
    return
  }

  registerLoading.value = true
  try {
    const payload = buildDefaultProfile()
    const res = await userApi.addUser(payload)

    if (res.code === 0 || res.code === 409) {
      saveCurrentUser(res.data || payload)
      await refreshUploadCooldown()
    } else {
      registerError.value = res.message || '登录失败'
    }
  } catch (error) {
    console.error('Login error:', error)
    registerError.value = getRequestErrorMessage(error, '登录失败，请检查网络连接')
  } finally {
    registerLoading.value = false
  }
}

const loginEmergencyUser = async () => {
  registerError.value = ''
  const userId = normalizeUserId(registerForm.value.user_id)

  if (!userId || userId.length !== 8) {
    registerError.value = '请输入有效的 8 位工号'
    return
  }

  registerLoading.value = true
  try {
    const res = await userApi.emergencyLogin({
      user_id: userId,
      username: ''
    })

    if (res.code === 0 && res.data) {
      saveCurrentUser(res.data)
      localStorage.setItem(THIRD_PARTY_USER_ID_STORAGE_KEY, userId)
      isEmergencyLoginPage.value = false
      window.history.replaceState({}, '', '/')
      await refreshUploadCooldown()
    } else {
      registerError.value = res.message || '应急登录失败'
    }
  } catch (error) {
    console.error('Emergency login error:', error)
    registerError.value = getRequestErrorMessage(error, '应急登录失败')
  } finally {
    registerLoading.value = false
  }
}

// 打开历史上传记录
const openHistory = () => {
  if (!currentUser.value) {
    showErrorDialog('请先配置参赛信息')
    return
  }
  showHistoryPage.value = true
}

// 关闭历史上传记录
const closeHistory = () => {
  showHistoryPage.value = false
}

// 打开上传弹窗
const openUpload = () => {
  if (!currentUser.value) {
    showErrorDialog('请先配置参赛信息')
    return
  }
  if (isCurrentUserTestAccount.value) {
    showUploadModal.value = true
    return
  }
  if (isCompetitionPending.value) {
    showErrorDialog('未到参赛时间，无法提交')
    return
  }
  if (isCompetitionEnded.value) {
    showErrorDialog('个人赛已结束')
    return
  }
  if (isUploadCoolingDown.value) {
    showErrorDialog(`距离上次上传不足30分钟，请在 ${uploadCooldownText.value} 后再次上传`)
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
  uploadCooldownEndsAt.value = Date.now() + UPLOAD_INTERVAL_MS
  cooldownTick.value = Date.now()
  if (rankingBoardRef.value) {
    rankingBoardRef.value.refresh()
  }
}

</script>

<template>
  <div class="app">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-mark">
            <IconSymbol name="network" :size="21" />
          </span>
          <span class="logo-text">西研软件大赛</span>
        </div>
        <div class="header-right">
          <div class="status-indicator" v-if="currentUser">
            <span class="status-dot"></span>
            <span class="status-text">{{ currentUser.username }}</span>
          </div>
        </div>
      </div>
    </header>

    <main v-if="sessionReady && !currentUser" class="register-main">
      <section class="register-shell">
        <div class="register-brand" aria-label="西研软件大赛">
          <div class="register-brand-layout">
            <div class="register-brand-copy">
              <h1 class="register-title">西研软件大赛</h1>
              <span class="register-line"></span>
              <p class="register-copy">面向真实任务的智能体挑战大赛</p>
            </div>

            <div class="hero-schedule-panel register-schedule-panel" aria-label="赛事赛程">
              <div class="hero-schedule-copy">
                <div class="schedule-line">
                  <span>赛程：</span>
                  <strong>{{ COMPETITION_SCHEDULE_TEXT }}</strong>
                </div>
                <div class="schedule-line schedule-countdown">
                  <span v-if="competitionCountdownLabel">{{ competitionCountdownLabel }}</span>
                  <strong :class="{ 'countdown-ended': competitionPhase === 'ended' }">
                    {{ competitionCountdownText }}
                  </strong>
                </div>
              </div>
              <div class="hero-schedule-visual" aria-hidden="true">
                <span class="schedule-track schedule-track-a"></span>
                <span class="schedule-track schedule-track-b"></span>
                <span class="schedule-pin"></span>
              </div>
            </div>
          </div>
        </div>

        <form v-if="isEmergencyLoginPage" class="register-panel emergency-login-panel" @submit.prevent="loginEmergencyUser">
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
                v-model="registerForm.user_id"
                type="text"
                inputmode="numeric"
                maxlength="20"
                placeholder="请输入已开通应急登录的工号"
              />
              <p class="register-helper">仅限内部登录异常时使用，登录后仍由后端 Cookie 校验身份</p>
            </label>
          </div>

          <p v-if="registerError" class="register-error">{{ registerError }}</p>

          <button class="btn btn-primary register-submit" type="submit" :disabled="registerLoading">
            {{ registerLoading ? '登录中...' : '应急登录' }}
          </button>
        </form>

        <form v-else class="register-panel" @submit.prevent="loginUser">
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
              <p class="register-helper">昵称设置后不可修改，请谨慎填写</p>
            </label>
          </div>

          <p v-if="registerError" class="register-error">{{ registerError }}</p>

          <button class="btn btn-primary register-submit" type="submit" :disabled="registerLoading || !registerForm.user_id">
            {{ registerLoading ? '登录中...' : '登录' }}
          </button>
        </form>
      </section>
    </main>

    <HistoryPage
      v-else-if="sessionReady && showHistoryPage"
      :userId="currentUser?.user_id"
      :username="currentUser?.username"
      @back="closeHistory"
      @canceled="handleSubmissionCanceled"
    />

    <!-- 主要内容 -->
    <main v-else-if="sessionReady" class="main">
      <!-- 背景图展示区域 -->
      <div class="hero-section">
        <div class="hero-visual" aria-hidden="true">
          <span class="flow-line flow-line-a"></span>
          <span class="flow-line flow-line-b"></span>
          <span class="node node-a"></span>
          <span class="node node-b"></span>
          <span class="node node-c"></span>
          <span class="node node-d"></span>
        </div>
        <div class="hero-title-shell" aria-label="西研软件大赛">
          <div class="hero-copy-block">
            <div class="hero-title-row">
              <h1 class="hero-title" data-text="西研软件大赛">西研软件大赛</h1>
            </div>
            <div class="hero-subline">
              <p class="hero-subtitle">面向真实任务的智能体挑战大赛</p>
              <span class="hero-kicker">个人赛</span>
            </div>
          </div>

          <div class="hero-schedule-panel" aria-label="赛事赛程">
            <div class="hero-schedule-copy">
              <div class="schedule-line">
                <span>赛程：</span>
                <strong>{{ COMPETITION_SCHEDULE_TEXT }}</strong>
              </div>
              <div class="schedule-line schedule-countdown">
                <span v-if="competitionCountdownLabel">{{ competitionCountdownLabel }}</span>
                <strong :class="{ 'countdown-ended': competitionPhase === 'ended' }">
                  {{ competitionCountdownText }}
                </strong>
              </div>
            </div>
            <div class="hero-schedule-visual" aria-hidden="true">
              <span class="schedule-track schedule-track-a"></span>
              <span class="schedule-track schedule-track-b"></span>
              <span class="schedule-pin"></span>
            </div>
          </div>
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
                  <button class="btn btn-upload" @click="openUpload" :disabled="!canUploadNow">
                    <IconSymbol name="upload" :size="16" />
                    {{ uploadButtonText }}
                  </button>
                  <p v-if="uploadTipText" class="upload-cooldown-tip">
                    {{ uploadTipText }}
                  </p>
                  <button class="btn btn-secondary" @click="openHistory">
                    <IconSymbol name="history" :size="16" />
                    历史上传记录
                  </button>
                </div>
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
      @close="closeUpload"
      @success="handleUploadSuccess"
    />

    <ErrorModal
      :visible="errorDialog.visible"
      :message="errorDialog.message"
      @close="closeErrorDialog"
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
    linear-gradient(120deg, rgba(27, 111, 216, 0.08), transparent 34%),
    linear-gradient(245deg, rgba(129, 119, 216, 0.08), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f7faff 42%, #eef5ff 100%);
  color: #111827;
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
  --border: rgba(71, 96, 136, 0.14);
  --text: #111827;
  --muted: #627086;
  --accent: #1b6fd8;
  --accent-blue: #374151;
  --accent-cyan: #64748b;
  --accent-soft: rgba(27, 111, 216, 0.08);
  --shadow: 0 18px 42px rgba(23, 44, 76, 0.09), 0 0 0 1px rgba(71, 96, 136, 0.035);
  background:
    linear-gradient(120deg, rgba(27, 111, 216, 0.08), transparent 34%),
    linear-gradient(245deg, rgba(129, 119, 216, 0.08), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f7faff 42%, #eef5ff 100%);
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
  background:
    linear-gradient(120deg, rgba(27, 111, 216, 0.1), transparent 38%),
    linear-gradient(250deg, rgba(129, 119, 216, 0.08), transparent 36%),
    linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
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
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 52px;
  line-height: 1;
  letter-spacing: 0;
  color: transparent;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 26%, #60a5fa 58%, #4b5563 100%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: none;
  text-shadow: 2px 2px 0 rgba(8, 145, 178, 0.3);
}

.register-line {
  display: block;
  width: 220px;
  max-width: 62%;
  height: 4px;
  margin: 16px auto 0;
  background: linear-gradient(90deg, transparent 0%, #4b5563 18%, #b4232f 50%, #64748b 82%, transparent 100%);
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
  background-image: none;
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
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 74px;
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: 0;
  transform: none;
  color: transparent;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 24%, #60a5fa 54%, #4b5563 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-stroke: 0;
  filter: none;
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
  background: linear-gradient(90deg, transparent 0%, #4b5563 18%, #b4232f 50%, #64748b 82%, transparent 100%);
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
  background: linear-gradient(90deg, #4b5563, #b4232f, #64748b);
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

	.btn:disabled {
	  cursor: not-allowed;
	  transform: none;
	  box-shadow: none;
	  opacity: 0.68;
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
	  background: linear-gradient(135deg, #4b5563, #b4232f 58%, #64748b);
	  color: #fff;
	  border: 1px solid rgba(15, 124, 255, 0.22);
	}

	.btn-upload:disabled {
	  background: linear-gradient(135deg, #94a3b8, #64748b);
	  border-color: rgba(100, 116, 139, 0.28);
	}

	.btn-upload:hover,
	.btn-upload.is-dragging {
	  transform: translateY(-1px);
	  box-shadow: 0 0 0 1px rgba(15, 124, 255, 0.14), 0 12px 30px rgba(29, 78, 216, 0.22);
	}

	.btn-upload:disabled:hover {
	  transform: none;
	  box-shadow: none;
	}

	.upload-cooldown-tip {
	  margin: -2px 0 2px;
	  color: var(--muted);
	  font-size: 12px;
	  text-align: center;
	}

.btn-upload.is-dragging {
  background: linear-gradient(135deg, #b4232f, #921927);
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

/* Enterprise technology visual theme */
.app {
  --surface: rgba(255, 255, 255, 0.88);
  --surface-soft: rgba(247, 250, 255, 0.82);
  --border: rgba(71, 96, 136, 0.16);
  --text: #111827;
  --muted: #627086;
  --accent: #1b6fd8;
  --accent-blue: #374151;
  --accent-cyan: #64748b;
  --accent-violet: #8177d8;
  --accent-red: #b4232f;
  --accent-red-dark: #921927;
  --accent-red-soft: rgba(180, 35, 47, 0.08);
  --accent-soft: rgba(31, 79, 184, 0.08);
  --shadow: 0 18px 42px rgba(23, 44, 76, 0.1);
  background:
    linear-gradient(120deg, rgba(27, 111, 216, 0.08), transparent 34%),
    linear-gradient(245deg, rgba(129, 119, 216, 0.08), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f7faff 42%, #eef5ff 100%);
  color: var(--text);
}

.header {
  position: absolute;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.58));
  border-bottom: 1px solid rgba(71, 96, 136, 0.1);
}

.header-content {
  max-width: 1320px;
  padding: 18px 24px;
}

.logo-mark {
  border-color: rgba(180, 35, 47, 0.2);
  background:
    linear-gradient(135deg, rgba(180, 35, 47, 0.12), rgba(27, 111, 216, 0.08)),
    rgba(255, 255, 255, 0.9);
  color: var(--accent-red);
  box-shadow: 0 10px 22px rgba(23, 44, 76, 0.08);
}

.logo-text {
  font-size: 19px;
  font-weight: 800;
  color: #172033;
}

.status-indicator {
  border-color: rgba(71, 96, 136, 0.16);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 24px rgba(23, 44, 76, 0.06);
}

.status-dot {
  background: var(--accent-red);
  box-shadow: 0 0 0 4px rgba(180, 35, 47, 0.1);
  animation: none;
}

.register-main {
  background:
    linear-gradient(120deg, rgba(27, 111, 216, 0.12), transparent 38%),
    linear-gradient(250deg, rgba(129, 119, 216, 0.1), transparent 36%),
    linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
}

.register-title {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #121826;
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  filter: none;
  text-shadow: none;
  font-size: 50px;
  font-weight: 850;
}

.register-line {
  width: 180px;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent-red), #1b6fd8, transparent);
  clip-path: none;
}

.register-panel {
  border-color: rgba(71, 96, 136, 0.16);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: var(--shadow);
}

.hero-section {
  height: 390px;
  min-height: 340px;
  justify-content: flex-start;
  padding: 92px 24px 44px;
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 255, 0.95) 44%, rgba(232, 242, 255, 0.72) 100%);
  border-bottom: 1px solid rgba(71, 96, 136, 0.12);
}

.hero-section::after {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(247, 250, 255, 0.88) 88%, #f7faff 100%),
    linear-gradient(90deg, transparent 0%, rgba(27, 111, 216, 0.08) 48%, rgba(180, 35, 47, 0.06) 100%);
}

.hero-visual {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.flow-line {
  position: absolute;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(27, 111, 216, 0.28), rgba(8, 145, 178, 0.34), rgba(180, 35, 47, 0.18), transparent);
  transform-origin: center;
}

.flow-line-a {
  width: 62%;
  right: 2%;
  top: 38%;
  transform: rotate(-12deg);
}

.flow-line-b {
  width: 52%;
  right: 7%;
  top: 62%;
  transform: rotate(8deg);
}

.flow-line::after {
  content: "";
  position: absolute;
  inset: -2px 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.92), transparent);
  animation: dataFlow 5.2s ease-in-out infinite;
}

@keyframes dataFlow {
  0% {
    transform: translateX(-55%);
    opacity: 0;
  }
  24%, 74% {
    opacity: 1;
  }
  100% {
    transform: translateX(55%);
    opacity: 0;
  }
}

.node {
  position: absolute;
  width: 9px;
  height: 9px;
  border: 1px solid rgba(27, 111, 216, 0.38);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 5px rgba(27, 111, 216, 0.055);
}

.node-a {
  right: 31%;
  top: 29%;
}

.node-b {
  right: 15%;
  top: 43%;
  border-color: rgba(180, 35, 47, 0.36);
  box-shadow: 0 0 0 5px rgba(180, 35, 47, 0.055);
}

.node-c {
  right: 38%;
  top: 68%;
  border-color: rgba(8, 145, 178, 0.38);
}

.node-d {
  right: 8%;
  top: 70%;
  border-color: rgba(129, 119, 216, 0.38);
  box-shadow: 0 0 0 5px rgba(129, 119, 216, 0.055);
}

.hero-title-shell {
  width: min(680px, 100%);
  min-width: 0;
  padding: 0;
  text-align: left;
}

.hero-title-shell::before,
.hero-title-shell::after,
.hero-title::before,
.hero-title::after {
  display: none;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border: 1px solid rgba(180, 35, 47, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--accent-red);
  font-size: 13px;
  font-weight: 750;
}

.hero-title {
  margin: 18px 0 12px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: clamp(44px, 6.5vw, 76px);
  line-height: 1.06;
  letter-spacing: 0;
  color: #111827;
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  transform: none;
  filter: none;
  text-shadow: none;
}

.hero-subtitle {
  margin: 0;
  max-width: 520px;
  color: #53627a;
  font-size: 18px;
  line-height: 1.7;
  font-weight: 500;
}

.hero-title-line {
  display: none;
}

.container {
  max-width: 1320px;
  padding-top: 28px;
}

.card {
  border-color: rgba(71, 96, 136, 0.14);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 1px 2px rgba(23, 44, 76, 0.04);
}

.card::before {
  background: linear-gradient(90deg, var(--accent-red), #1b6fd8, #64748b, #8177d8);
  opacity: 0.72;
}

.card:hover {
  border-color: rgba(27, 111, 216, 0.22);
  box-shadow: var(--shadow);
}

.card-header {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(249, 251, 255, 0.88));
  border-bottom-color: rgba(71, 96, 136, 0.12);
}

.card-icon {
  background: rgba(27, 111, 216, 0.07);
  border-color: rgba(27, 111, 216, 0.14);
  color: var(--accent-blue);
}

.card-header h2 {
  font-weight: 750;
}

.user-profile {
  border-color: rgba(71, 96, 136, 0.14);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(243, 248, 255, 0.9));
}

.user-avatar {
  background: rgba(180, 35, 47, 0.08);
  border-color: rgba(180, 35, 47, 0.16);
  color: var(--accent-red);
}

.info-item {
  border-color: rgba(71, 96, 136, 0.12);
  background: rgba(247, 250, 255, 0.72);
}

.btn-primary,
.btn-upload {
  background: linear-gradient(135deg, var(--accent-red), var(--accent-red-dark));
  border: 1px solid rgba(180, 35, 47, 0.2);
  color: #fff;
  box-shadow: 0 12px 24px rgba(180, 35, 47, 0.18);
}

.btn-primary:hover,
.btn-upload:hover,
.btn-upload.is-dragging {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(180, 35, 47, 0.24);
}

.btn-upload:disabled {
  background: linear-gradient(135deg, #9aa7b8, #748096);
  border-color: rgba(116, 128, 150, 0.28);
  box-shadow: none;
}

.btn-secondary {
  border-color: rgba(71, 96, 136, 0.16);
  background: rgba(255, 255, 255, 0.78);
  color: #1f2a44;
}

.btn-secondary:hover {
  border-color: rgba(27, 111, 216, 0.28);
  color: #374151;
  box-shadow: 0 10px 20px rgba(23, 44, 76, 0.08);
}

.upload-cooldown-tip {
  color: var(--accent-red);
}

.live-badge {
  background: rgba(180, 35, 47, 0.06);
  border-color: rgba(180, 35, 47, 0.16);
  color: var(--accent-red);
}

.live-dot {
  background: var(--accent-red);
  box-shadow: 0 0 0 4px rgba(180, 35, 47, 0.1);
}

.ranking-card {
  overflow: hidden;
  border-color: rgba(71, 96, 136, 0.12);
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.94), rgba(246, 250, 255, 0.88) 54%, rgba(232, 242, 255, 0.78)),
    radial-gradient(circle at 86% 0%, rgba(27, 111, 216, 0.12), transparent 34%);
  box-shadow: 0 20px 48px rgba(23, 44, 76, 0.1);
}

.ranking-card::before {
  height: 3px;
  background: linear-gradient(90deg, var(--accent-red), #1b6fd8 42%, #64748b 68%, #8177d8);
}

.ranking-card::after {
  content: "";
  position: absolute;
  top: 18px;
  right: -8%;
  width: 48%;
  height: 120px;
  pointer-events: none;
  background:
    linear-gradient(105deg, transparent 8%, rgba(27, 111, 216, 0.14), rgba(8, 145, 178, 0.08), transparent 74%),
    linear-gradient(75deg, transparent 22%, rgba(180, 35, 47, 0.08), transparent 70%);
  transform: rotate(-8deg);
  opacity: 0.78;
}

.ranking-card .card-header {
  height: 66px;
  padding: 14px 22px;
  background: rgba(255, 255, 255, 0.68);
  border-bottom-color: rgba(71, 96, 136, 0.1);
}

.ranking-card .card-icon {
  width: 34px;
  height: 32px;
  background: rgba(180, 35, 47, 0.08);
  border-color: rgba(180, 35, 47, 0.14);
  color: var(--accent-red);
}

.ranking-card .card-header h2 {
  font-size: 18px;
}

.ranking-card .card-body {
  position: relative;
  z-index: 1;
  padding: 20px;
}

/* Final visual unification pass */
button::before {
  display: none;
}

.header,
.hero-section,
.card,
.register-panel,
.status-indicator {
  backdrop-filter: blur(14px);
}

.app {
  --panel-bg: linear-gradient(128deg, rgba(255, 255, 255, 0.94), rgba(246, 250, 255, 0.86) 56%, rgba(234, 243, 255, 0.76));
  --panel-border: rgba(71, 96, 136, 0.14);
  --panel-shadow: 0 18px 42px rgba(23, 44, 76, 0.09);
}

.container {
  gap: 22px;
}

.card {
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  box-shadow: 0 1px 2px rgba(23, 44, 76, 0.04);
}

.challenge-card,
.user-card,
.ranking-card {
  box-shadow: var(--panel-shadow);
}

.challenge-card::after,
.user-card::after {
  content: "";
  position: absolute;
  top: 16px;
  right: -12%;
  width: 42%;
  height: 96px;
  pointer-events: none;
  background:
    linear-gradient(104deg, transparent, rgba(27, 111, 216, 0.1), rgba(8, 145, 178, 0.06), transparent),
    linear-gradient(76deg, transparent 22%, rgba(180, 35, 47, 0.055), transparent 72%);
  transform: rotate(-8deg);
  opacity: 0.72;
}

.card-header {
  height: 60px;
  min-height: 60px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.68);
}

.challenge-card .card-body,
.user-card .card-body {
  position: relative;
  z-index: 1;
}

.challenge-text {
  padding: 18px 22px 16px;
  color: #2f3b4f;
}

.user-section {
  gap: 22px;
}

.user-section > .card {
  height: 350px;
}

.user-profile,
.info-item {
  background: rgba(255, 255, 255, 0.62);
  border-color: rgba(71, 96, 136, 0.12);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.68);
}

.ranking-card {
  background: var(--panel-bg);
}

.ranking-card::after {
  width: 42%;
  opacity: 0.7;
}

@media (max-width: 900px) {
  .hero-section {
    height: auto;
    min-height: 360px;
  }

  .flow-line-a,
  .flow-line-b {
    width: 82%;
    right: -24%;
  }
}

@media (max-width: 640px) {
  .hero-section {
    min-height: 330px;
    padding: 86px 16px 32px;
  }

  .hero-title {
    font-size: 40px;
  }

  .hero-subtitle {
    font-size: 15px;
  }

.ranking-card .card-body {
    padding: 14px;
  }
}

/* Enterprise event final baseline */
body {
  background:
    radial-gradient(circle at 82% 8%, rgba(27, 111, 216, 0.12), transparent 28%),
    radial-gradient(circle at 18% 18%, rgba(129, 119, 216, 0.08), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #f7faff 46%, #eef5ff 100%);
  color: #111827;
}

::-webkit-scrollbar-thumb {
  background: rgba(71, 96, 136, 0.32);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(71, 96, 136, 0.48);
}

.app {
  background:
    radial-gradient(circle at 82% 8%, rgba(27, 111, 216, 0.12), transparent 28%),
    radial-gradient(circle at 18% 18%, rgba(129, 119, 216, 0.08), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #f7faff 46%, #eef5ff 100%);
}

.header {
  background: rgba(255, 255, 255, 0.74);
  border-bottom: 1px solid rgba(71, 96, 136, 0.1);
}

.register-main {
  padding-top: 118px;
  background:
    radial-gradient(circle at 76% 20%, rgba(27, 111, 216, 0.12), transparent 30%),
    radial-gradient(circle at 22% 28%, rgba(129, 119, 216, 0.08), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
}

.register-shell {
  width: min(520px, 100%);
}

.register-title {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 52px;
  font-weight: 850;
  line-height: 1.12;
  color: #111827;
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  filter: none;
  text-shadow: none;
}

.register-line {
  width: 172px;
  height: 3px;
  margin-top: 18px;
  background: linear-gradient(90deg, transparent, #b4232f 20%, #1b6fd8 72%, transparent);
  clip-path: none;
  box-shadow: none;
}

.register-panel {
  padding: 24px;
  border: 1px solid rgba(71, 96, 136, 0.14);
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.94), rgba(246, 250, 255, 0.82)),
    linear-gradient(90deg, rgba(180, 35, 47, 0.04), transparent 64%);
  box-shadow: 0 18px 42px rgba(23, 44, 76, 0.09);
}

.register-field input,
.register-readonly-value {
  border-color: rgba(71, 96, 136, 0.14);
  background: rgba(255, 255, 255, 0.72);
}

.register-field input:focus {
  border-color: rgba(180, 35, 47, 0.42);
  box-shadow: 0 0 0 3px rgba(180, 35, 47, 0.09);
}

.hero-section {
  height: 380px;
  min-height: 340px;
  background:
    radial-gradient(circle at 78% 34%, rgba(27, 111, 216, 0.16), transparent 28%),
    linear-gradient(105deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 255, 0.95) 48%, rgba(232, 242, 255, 0.74) 100%);
}

.hero-title {
  font-size: clamp(46px, 6vw, 72px);
  font-weight: 850;
  color: #111827;
  background: none;
  transform: none;
  filter: none;
  text-shadow: none;
}

.hero-title-shell {
  padding: 0;
  text-align: left;
}

.hero-title-shell::before,
.hero-title-shell::after,
.hero-title::before,
.hero-title::after,
.hero-title-line {
  display: none;
}

.flow-line {
  opacity: 0.78;
}

.node {
  width: 8px;
  height: 8px;
}

.card::before {
  height: 3px;
  background: linear-gradient(90deg, #b4232f, #1b6fd8 46%, #64748b 72%, #8177d8);
}

.card-icon {
  border-color: rgba(27, 111, 216, 0.14);
  background: rgba(27, 111, 216, 0.07);
  color: #374151;
}

.btn-primary,
.btn-upload {
  background: #b4232f;
  border: 1px solid rgba(180, 35, 47, 0.22);
  box-shadow: 0 12px 24px rgba(180, 35, 47, 0.16);
}

.btn-primary:hover,
.btn-upload:hover,
.btn-upload.is-dragging {
  background: #921927;
  box-shadow: 0 14px 28px rgba(180, 35, 47, 0.2);
}

.btn-secondary {
  border-color: rgba(71, 96, 136, 0.16);
  background: rgba(255, 255, 255, 0.7);
  color: #1f2a44;
}

.btn-secondary:hover {
  border-color: rgba(27, 111, 216, 0.24);
  background: rgba(27, 111, 216, 0.06);
  color: #374151;
}

/* Red-white enterprise refinement: keep blue only as faint ambience */
.app {
  --accent: #b4232f;
  --accent-blue: #374151;
  --accent-cyan: #64748b;
  --accent-violet: #9ca3af;
  --accent-soft: rgba(180, 35, 47, 0.07);
}

.logo-mark,
.card-icon,
.ranking-card .card-icon {
  border-color: rgba(180, 35, 47, 0.16);
  background: rgba(180, 35, 47, 0.07);
  color: #b4232f;
}

.status-dot,
.live-dot {
  background: #b4232f;
}

.flow-line {
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.24), rgba(180, 35, 47, 0.2), transparent);
}

.node {
  border-color: rgba(148, 163, 184, 0.36);
  box-shadow: 0 0 0 5px rgba(148, 163, 184, 0.055);
}

.node-b {
  border-color: rgba(180, 35, 47, 0.38);
  box-shadow: 0 0 0 5px rgba(180, 35, 47, 0.055);
}

.node-c,
.node-d {
  border-color: rgba(148, 163, 184, 0.36);
  box-shadow: 0 0 0 5px rgba(148, 163, 184, 0.055);
}

.card::before,
.ranking-card::before,
.register-line {
  background: linear-gradient(90deg, transparent, #b4232f 18%, #4b5563 72%, transparent);
}

.challenge-card::after,
.user-card::after,
.ranking-card::after {
  background:
    linear-gradient(104deg, transparent, rgba(148, 163, 184, 0.12), rgba(180, 35, 47, 0.06), transparent),
    linear-gradient(76deg, transparent 24%, rgba(180, 35, 47, 0.055), transparent 72%);
}

.btn-secondary:hover {
  border-color: rgba(180, 35, 47, 0.2);
  background: rgba(180, 35, 47, 0.055);
  color: #b4232f;
}

.hero-section {
  padding-left: 0;
  padding-right: 0;
  background:
    radial-gradient(circle at 78% 34%, rgba(148, 163, 184, 0.1), transparent 28%),
    linear-gradient(105deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 48%, rgba(241, 245, 249, 0.76) 100%);
}

.hero-title-shell {
  width: min(1320px, 100%);
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 64px;
}

.hero-copy-block {
  flex: 1 1 auto;
  min-width: 0;
}

.hero-title-row {
  display: block;
  max-width: 100%;
}

.hero-title-row .hero-title {
  margin: 0;
}

.hero-subline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: min(100%, 1040px);
  margin-top: 28px;
}

.hero-subtitle {
  margin: 0;
  padding-right: 0;
}

.hero-subline .hero-kicker {
  flex: 0 0 auto;
}

.hero-info-panel {
  width: min(390px, 34vw);
  min-height: 188px;
  flex: 0 0 auto;
  position: relative;
  padding: 22px;
  border: 1px solid rgba(71, 96, 136, 0.14);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.64)),
    linear-gradient(110deg, rgba(180, 35, 47, 0.065), transparent 54%);
  box-shadow: 0 18px 42px rgba(23, 44, 76, 0.08);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

.hero-info-panel::before {
  content: "";
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 3px;
  background: linear-gradient(90deg, #b4232f, #111827 68%, transparent);
}

.hero-info-panel::after {
  content: "";
  position: absolute;
  right: -46px;
  bottom: 18px;
  width: 220px;
  height: 72px;
  pointer-events: none;
  background: linear-gradient(104deg, transparent, rgba(148, 163, 184, 0.12), rgba(180, 35, 47, 0.055), transparent);
  transform: rotate(-10deg);
}

.hero-info-header {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
  margin-bottom: 18px;
}

.info-eyebrow {
  color: #b4232f;
  font-size: 12px;
  font-weight: 800;
}

.hero-info-header strong {
  color: #111827;
  font-size: 22px;
  line-height: 1.25;
}

.hero-info-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.hero-info-item {
  min-height: 62px;
  padding: 11px 12px;
  border: 1px solid rgba(71, 96, 136, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.56);
}

.hero-info-wide {
  grid-column: 1 / -1;
}

.hero-info-item span {
  display: block;
  margin-bottom: 6px;
  color: #627086;
  font-size: 12px;
  font-weight: 650;
}

.hero-info-item strong {
  display: block;
  color: #111827;
  font-size: 16px;
  line-height: 1.35;
}

/* Reduce decorative red; keep it for primary action and key status only */
.logo-mark,
.card-icon,
.ranking-card .card-icon,
.hero-kicker {
  border-color: rgba(75, 85, 99, 0.16);
  background: rgba(75, 85, 99, 0.055);
  color: #111827;
}

.card::before,
.ranking-card::before,
.register-line {
  background: linear-gradient(90deg, transparent, #111827 18%, #6b7280 72%, transparent);
}

.challenge-card::after,
.user-card::after,
.ranking-card::after,
.flow-line {
  background: linear-gradient(104deg, transparent, rgba(148, 163, 184, 0.12), rgba(17, 24, 39, 0.055), transparent);
}

.node-b {
  border-color: rgba(75, 85, 99, 0.36);
  box-shadow: 0 0 0 5px rgba(75, 85, 99, 0.055);
}

.btn-secondary:hover {
  border-color: rgba(75, 85, 99, 0.2);
  background: rgba(75, 85, 99, 0.055);
  color: #111827;
}

/* Red emphasis in hero, black-led data panels */
.header .logo-mark {
  border-color: rgba(180, 35, 47, 0.2);
  background: rgba(180, 35, 47, 0.08);
  color: #b4232f;
}

.status-dot {
  background: #b4232f;
  box-shadow: 0 0 0 4px rgba(180, 35, 47, 0.1);
}

.hero-section {
  background:
    radial-gradient(circle at 79% 32%, rgba(180, 35, 47, 0.08), transparent 24%),
    radial-gradient(circle at 72% 20%, rgba(148, 163, 184, 0.1), transparent 28%),
    linear-gradient(105deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 48%, rgba(241, 245, 249, 0.76) 100%);
}

.hero-title {
  color: #0b1220;
}

.hero-subline .hero-kicker {
  border-color: rgba(180, 35, 47, 0.18);
  background: rgba(180, 35, 47, 0.07);
  color: #b4232f;
}

.hero-section .flow-line {
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.22), rgba(180, 35, 47, 0.34), transparent);
}

.hero-section .node-b {
  border-color: rgba(180, 35, 47, 0.42);
  box-shadow: 0 0 0 5px rgba(180, 35, 47, 0.06);
}

.challenge-card::before,
.user-card::before,
.ranking-card::before {
  background: linear-gradient(90deg, transparent, #111827 16%, #6b7280 74%, transparent);
}

.challenge-card .card-icon,
.user-card .card-icon,
.ranking-card .card-icon {
  border-color: rgba(75, 85, 99, 0.16);
  background: rgba(75, 85, 99, 0.055);
  color: #111827;
}

.challenge-card::after,
.user-card::after,
.ranking-card::after {
  background: linear-gradient(104deg, transparent, rgba(148, 163, 184, 0.12), rgba(17, 24, 39, 0.04), transparent);
}

.live-badge {
  border-color: rgba(75, 85, 99, 0.16);
  background: rgba(75, 85, 99, 0.055);
  color: #111827;
}

.live-dot {
  background: #b4232f;
}

@media (max-width: 640px) {
  .hero-title-shell {
    padding: 0 16px;
    display: block;
  }

  .hero-subline {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .hero-info-panel {
    width: 100%;
    margin-top: 24px;
  }
}

@media (max-width: 980px) {
  .hero-title-shell {
    align-items: flex-start;
    flex-direction: column;
    gap: 28px;
  }

  .hero-info-panel {
    width: min(520px, 100%);
  }
}

/* Enterprise homepage composition: stronger right information block */
.hero-section {
  height: 410px;
  min-height: 380px;
  padding-top: 96px;
  padding-bottom: 42px;
}

.hero-title-shell {
  align-items: stretch;
  gap: 52px;
}

.hero-copy-block {
  display: flex;
  min-height: 246px;
  flex-direction: column;
  justify-content: center;
}

.hero-title {
  max-width: 760px;
  font-size: clamp(52px, 6.2vw, 78px);
  line-height: 1.04;
}

.hero-subline {
  width: min(100%, 760px);
  justify-content: flex-start;
  gap: 22px;
  margin-top: 26px;
}

.hero-subtitle {
  color: #4b5563;
  font-size: 18px;
  font-weight: 650;
}

.hero-info-panel {
  width: min(450px, 37vw);
  min-height: 246px;
  padding: 24px 24px 22px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  grid-template-rows: auto 1fr;
  gap: 18px 20px;
  align-self: stretch;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.72)),
    linear-gradient(110deg, rgba(180, 35, 47, 0.08), transparent 58%);
}

.hero-info-panel::before {
  left: 24px;
  right: 24px;
  background: linear-gradient(90deg, #b4232f, #111827 58%, rgba(17, 24, 39, 0));
}

.hero-info-panel::after {
  right: -24px;
  bottom: 32px;
  width: 250px;
  height: 92px;
  opacity: 0.72;
}

.hero-info-header {
  grid-column: 1 / 2;
  margin-bottom: 0;
  align-self: start;
}

.hero-info-header strong {
  font-size: 24px;
}

.hero-info-visual {
  grid-column: 2 / 3;
  grid-row: 1 / 3;
  position: relative;
  min-height: 100%;
  border-left: 1px solid rgba(71, 96, 136, 0.12);
  overflow: hidden;
}

.signal-track,
.signal-node,
.signal-core {
  position: absolute;
  display: block;
}

.signal-track {
  left: 12px;
  right: -18px;
  height: 1px;
  background: linear-gradient(90deg, rgba(17, 24, 39, 0.22), rgba(180, 35, 47, 0.42), transparent);
  transform-origin: left center;
}

.signal-track-a {
  top: 30%;
  transform: rotate(-20deg);
}

.signal-track-b {
  top: 52%;
  transform: rotate(8deg);
}

.signal-track-c {
  top: 72%;
  transform: rotate(-8deg);
}

.signal-core {
  top: 45%;
  left: 34px;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(180, 35, 47, 0.28);
  border-radius: 8px;
  background: rgba(180, 35, 47, 0.08);
  box-shadow: 0 0 0 8px rgba(180, 35, 47, 0.035);
}

.signal-core::before {
  content: "";
  position: absolute;
  inset: 13px;
  border-radius: 4px;
  background: #b4232f;
}

.signal-node {
  width: 8px;
  height: 8px;
  border: 1px solid rgba(17, 24, 39, 0.28);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}

.signal-node-a {
  top: 25%;
  left: 78px;
}

.signal-node-b {
  top: 62%;
  left: 92px;
  border-color: rgba(180, 35, 47, 0.42);
}

.signal-node-c {
  top: 80%;
  left: 42px;
}

.hero-info-grid {
  grid-column: 1 / 2;
  align-self: end;
}

.hero-info-item {
  background: rgba(255, 255, 255, 0.62);
}

.hero-info-item strong {
  font-size: 15px;
  letter-spacing: 0;
  white-space: nowrap;
}

.hero-info-wide strong,
.hero-info-item .countdown-value {
  color: #b4232f;
  font-size: 22px;
  font-weight: 850;
}

.hero-schedule-panel {
  width: min(500px, 41vw);
  min-height: 176px;
  align-self: center;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px;
  gap: 20px;
  padding: 20px 0 18px 28px;
}

.hero-schedule-panel::before {
  content: "";
  position: absolute;
  top: 0;
  left: 28px;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #b4232f, #111827 58%, rgba(17, 24, 39, 0));
}

.hero-schedule-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
}

.schedule-line {
  display: grid;
  gap: 7px;
}

.schedule-line span {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.schedule-line strong {
  color: #111827;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 850;
  white-space: nowrap;
}

.schedule-countdown strong {
  color: #b4232f;
  font-size: 30px;
  line-height: 1.12;
}

.schedule-countdown strong.countdown-ended {
  color: #111827;
}

.hero-schedule-visual {
  position: relative;
  min-height: 160px;
  border-left: 1px solid rgba(71, 96, 136, 0.12);
  overflow: hidden;
}

.schedule-track {
  position: absolute;
  left: 20px;
  right: -16px;
  height: 1px;
  background: linear-gradient(90deg, rgba(17, 24, 39, 0.2), rgba(180, 35, 47, 0.42), transparent);
  transform-origin: left center;
}

.schedule-track-a {
  top: 36%;
  transform: rotate(-18deg);
}

.schedule-track-b {
  top: 66%;
  transform: rotate(9deg);
}

.schedule-pin {
  position: absolute;
  top: 48%;
  left: 42px;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(180, 35, 47, 0.28);
  border-radius: 8px;
  background: rgba(180, 35, 47, 0.07);
  box-shadow: 0 0 0 8px rgba(180, 35, 47, 0.032);
}

.schedule-pin::before {
  content: "";
  position: absolute;
  inset: 12px;
  border-radius: 4px;
  background: #b4232f;
}

@media (max-width: 980px) {
  .hero-section {
    height: auto;
    min-height: 520px;
  }

  .hero-copy-block {
    min-height: 0;
  }

  .hero-info-panel {
    width: min(620px, 100%);
    min-height: 230px;
  }

  .hero-schedule-panel {
    width: min(620px, 100%);
  }
}

@media (max-width: 1120px) and (min-width: 981px) {
  .hero-info-panel {
    width: min(430px, 40vw);
    grid-template-columns: minmax(0, 1fr) 104px;
  }

  .hero-info-item strong {
    font-size: 14px;
  }

  .hero-info-wide strong,
  .hero-info-item .countdown-value {
    font-size: 20px;
  }

  .hero-schedule-panel {
    width: min(470px, 42vw);
    grid-template-columns: minmax(0, 1fr) 64px;
  }

  .schedule-line strong {
    font-size: 16px;
  }

  .schedule-countdown strong {
    font-size: 26px;
  }
}

@media (max-width: 640px) {
  .hero-section {
    min-height: 560px;
    padding-top: 88px;
  }

  .hero-title {
    font-size: 42px;
  }

  .hero-subline {
    margin-top: 18px;
  }

  .hero-info-panel {
    grid-template-columns: 1fr;
    min-height: 0;
    padding: 22px;
  }

  .hero-info-visual {
    display: none;
  }

  .hero-info-item strong {
    white-space: normal;
  }

  .hero-schedule-panel {
    width: 100%;
    min-height: 0;
    grid-template-columns: 1fr;
    margin-top: 24px;
    padding: 18px 0 0;
  }

  .hero-schedule-panel::before {
    left: 0;
  }

  .hero-schedule-visual {
    display: none;
  }

  .schedule-line strong {
    font-size: 16px;
    white-space: normal;
  }

  .schedule-countdown strong {
    font-size: 26px;
  }
}

/* Scroll performance pass: avoid large repaint-heavy glass layers */
.header,
.hero-section,
.card,
.register-panel,
.status-indicator {
  backdrop-filter: none;
}

.app,
body {
  background: linear-gradient(180deg, #ffffff 0%, #f7faff 44%, #eef5ff 100%);
}

.hero-section {
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 55%, rgba(241, 245, 249, 0.82) 100%);
}

.card {
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px rgba(23, 44, 76, 0.04);
}

.challenge-card,
.user-card,
.ranking-card {
  box-shadow: 0 8px 22px rgba(23, 44, 76, 0.06);
}

.challenge-card::after,
.user-card::after,
.ranking-card::after {
  display: none;
}

.hero-section .flow-line::after {
  animation: none;
}

/* Keep the two top cards level with each other */
.user-section {
  align-items: start;
}

.user-section > .card {
  height: 350px;
  min-height: 350px;
}

.user-card .card-body {
  padding-bottom: 20px;
}

.action-buttons {
  gap: 6px;
  margin-top: 0;
}

.register-copy {
  margin: 18px 0 0;
  max-width: 560px;
  color: #4b5563;
  font-size: 18px;
  line-height: 1.7;
  font-weight: 550;
}

.register-schedule-panel {
  width: 100%;
  margin-top: 0;
}

/* Login page: match the homepage's left-heavy enterprise composition */
.register-main {
  padding: 92px 24px 40px;
  align-items: flex-start;
  background:
    radial-gradient(circle at 78% 20%, rgba(180, 35, 47, 0.08), transparent 24%),
    radial-gradient(circle at 24% 18%, rgba(148, 163, 184, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
}

.register-shell {
  width: min(1320px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 460px);
  gap: 56px;
  align-items: start;
}

.register-brand {
  text-align: left;
  padding-top: 12px;
}

.register-brand-layout {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 500px);
  gap: 40px 48px;
  align-items: center;
}

.register-brand-copy {
  min-width: 0;
}

.register-title {
  color: #111827;
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  text-shadow: none;
  font-size: clamp(46px, 5.8vw, 78px);
  font-weight: 850;
  line-height: 1.04;
}

.register-line {
  width: 184px;
  height: 3px;
  margin: 18px 0 0;
  background: linear-gradient(90deg, transparent, #b4232f 20%, #111827 72%, transparent);
  clip-path: none;
  box-shadow: none;
}

.register-panel {
  padding: 24px;
  border: 1px solid rgba(71, 96, 136, 0.14);
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 255, 0.84)),
    linear-gradient(90deg, rgba(180, 35, 47, 0.04), transparent 64%);
  box-shadow: 0 18px 42px rgba(23, 44, 76, 0.09);
}

.register-panel-header h2 {
  font-size: 18px;
  font-weight: 750;
}

.register-field input,
.register-readonly-value {
  border-color: rgba(71, 96, 136, 0.14);
  background: rgba(255, 255, 255, 0.72);
}

.register-field input:focus {
  border-color: rgba(180, 35, 47, 0.34);
  box-shadow: 0 0 0 3px rgba(180, 35, 47, 0.08);
}

@media (max-width: 1180px) {
  .register-brand-layout {
    grid-template-columns: 1fr;
    gap: 24px;
    width: min(620px, 100%);
  }

  .register-schedule-panel {
    width: min(620px, 100%);
  }
}

@media (max-width: 980px) {
  .register-shell {
    grid-template-columns: 1fr;
    gap: 24px;
    width: min(520px, 100%);
  }

  .register-brand {
    padding-top: 0;
  }

  .register-copy {
    font-size: 16px;
  }
}

@media (max-width: 640px) {
  .register-main {
    padding-top: 88px;
  }

  .register-title {
    font-size: 42px;
  }

  .register-panel {
    padding: 20px;
  }

  .register-copy {
    font-size: 15px;
  }
}
</style>
