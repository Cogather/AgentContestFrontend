import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  canShowScoreDetail,
  mergeQuestionScoreDetails
} from '../src/components/historyScoreDetail.js'
import { useContestClock } from '../src/composables/useContestClock.js'
import {
  EMERGENCY_LOGIN_PATH,
  isEmergencyLoginPath,
  normalizeUserId,
  THIRD_PARTY_USER_ID_STORAGE_KEY,
  USER_STORAGE_KEY
} from '../src/utils/userIdentity.js'

test('score detail uses however many scored questions the backend returns', () => {
  const submission = {
    status: 'COMPLETED',
    score: 18,
    score_detail: JSON.stringify([
      { question: 1, score: 8, total: 10 },
      { question: 2, score: 10, total: 10 }
    ]),
    question_details: [
      { id: 1, question: 1, title: '任务规划', detail: '题目 1 详情' },
      { id: 2, question: 2, title: '工具协同', detail: '题目 2 详情' },
      { id: 3, question: 3, title: '未评测题目', detail: '题目 3 详情' }
    ]
  }

  assert.equal(canShowScoreDetail(submission), true)
  assert.deepEqual(mergeQuestionScoreDetails(submission), [
    {
      id: 1,
      question: 1,
      title: '任务规划',
      detail: '题目 1 详情',
      score: 8,
      total: 10
    },
    {
      id: 2,
      question: 2,
      title: '工具协同',
      detail: '题目 2 详情',
      score: 10,
      total: 10
    }
  ])
})

test('score formatting preserves decimal scores without noisy trailing zeroes', async () => {
  const { formatScore } = await import('../src/utils/scoreFormat.js')

  assert.equal(formatScore(900), '900')
  assert.equal(formatScore(900.5), '900.5')
  assert.equal(formatScore('899.9999'), '899.9999')
  assert.equal(formatScore(null), '-')
})

test('ranking board does not start an interval-based auto refresh', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.equal(source.includes('setInterval('), false)
  assert.equal(source.includes('POLL_INTERVAL'), false)
})

test('ranking board defaults to twenty rows per page', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('const pageSize = ref(20)'), 'ranking board should request 20 rows by default')
  assert.ok(source.includes('<option :value="20">20</option>'), 'page size selector should keep 20 as an available size')
})

test('ranking board splits twenty rows into two ten-row columns', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('RANKING_COLUMN_SIZE = 10'), 'ranking board should use ten rows per visual column')
  assert.ok(source.includes('rankingColumns'), 'ranking board should derive visual ranking columns')
  assert.ok(source.includes('class="ranking-columns"'), 'ranking board should render a two-column ranking wrapper')
  assert.ok(source.includes('class="ranking-column"'), 'ranking board should render each ten-row column separately')
})

test('frontend does not use native alert for error messages', async () => {
  const srcRoot = new URL('../src/', import.meta.url)
  const collectSourceFiles = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true })
    const nestedFiles = await Promise.all(entries.map((entry) => {
      const entryUrl = new URL(entry.name, directory)
      if (entry.isDirectory()) {
        return collectSourceFiles(new URL(`${entry.name}/`, directory))
      }
      if (entry.isFile() && /\.(vue|js|mjs|ts)$/.test(entry.name)) {
        return [entryUrl]
      }
      return []
    }))
    return nestedFiles.flat()
  }
  const files = await collectSourceFiles(srcRoot)
  const sources = await Promise.all(
    files.map(async file => [file.pathname, await readFile(file, 'utf8')])
  )
  const alertUsages = sources
    .filter(([, source]) => /\balert\s*\(/.test(source))
    .map(([file]) => file)

  assert.deepEqual(alertUsages, [])
})

test('upload dialog displays the zip package size limit', async () => {
  const source = await readFile(new URL('../src/components/UploadModal.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('100MB'), 'upload dialog should show the 100MB package limit')
  assert.ok(source.includes('.zip'), 'upload dialog should show that only zip packages are supported')
})

test('app delegates session contest clock and error dialog state to composables', async () => {
  const source = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('useUserSession'), 'App should consume user session through a composable')
  assert.ok(source.includes('useContestClock'), 'App should consume contest clock through a composable')
  assert.ok(source.includes('useContestConfig'), 'App should consume contest metadata through a composable')
  assert.ok(source.includes('useErrorDialog'), 'App should consume error dialog state through a composable')
  assert.equal(source.includes('const COMPETITION_START_AT'), false, 'App should not own contest date parsing')
  assert.equal(source.includes('bootstrapRegisteredUserSession'), false, 'App should not own session bootstrap details')
  assert.equal(source.includes('normalizeUserProfile'), false, 'App should not own user profile normalization')
  assert.equal(source.includes('欢迎参加 Agent 大赛'), false, 'App should not hardcode challenge copy')
})

test('contest clock exposes stable schedule and ended state from one module', () => {
  const contestClock = useContestClock()

  assert.equal(contestClock.competitionScheduleText.value, '2026/5/24 8:00--2026/6/14')
  assert.equal(contestClock.competitionPhase.value, 'ended')
  assert.equal(contestClock.competitionCountdownText.value, '已结束')
  contestClock.stopClock()
})

test('contest config defaults use Beijing time to match backend enforcement', async () => {
  const source = await readFile(new URL('../src/config/contestDefaults.js', import.meta.url), 'utf8')

  assert.ok(source.includes("startAt: '2026-05-24T08:00:00+08:00'"))
  assert.ok(source.includes("endAt: '2026-06-15T00:00:00+08:00'"))
  assert.equal(source.includes('2026-05-24T08:00:00-07:00'), false)
  assert.equal(source.includes('2026-06-15T00:00:00-07:00'), false)
})

test('frontend loads contest config from backend with local defaults as fallback', async () => {
  const apiSource = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')
  const configSource = await readFile(new URL('../src/composables/useContestConfig.js', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

  assert.ok(apiSource.includes('/api/contest/config'), 'API client should expose backend contest config')
  assert.ok(configSource.includes('DEFAULT_CONTEST_CONFIG'), 'contest config composable should have reusable local defaults')
  assert.ok(configSource.includes('normalizeContestConfig'), 'contest config composable should normalize backend and fallback data')
  assert.ok(appSource.includes('contestTitle'), 'App should render title from contest config')
  assert.ok(appSource.includes('contestSubtitle'), 'App should render subtitle from contest config')
  assert.ok(appSource.includes('contestModeLabel'), 'App should render mode label from contest config')
  assert.ok(appSource.includes('contestChallengeContent'), 'App should render challenge content from contest config')
})

test('home upload entry stays clickable and relies on click-time validation', async () => {
  const source = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

  assert.equal(source.includes(':disabled="!canUploadNow"'), false, 'main upload button should not be grayed by page state')
  assert.equal(/\.btn-upload:disabled\s*\{/.test(source), false, 'main upload button should not have a disabled gray theme')
  assert.equal(source.includes('uploadButtonText'), false, 'main upload button should keep a stable label')
  assert.equal(source.includes('uploadTipText'), false, 'main upload entry should not show cooldown helper copy')
  assert.equal(source.includes('后可上传'), false, 'main upload button should not show a countdown')
  assert.equal(source.includes('每次上传间隔需满30分钟'), false, 'main upload entry should not show cooldown helper copy')
  assert.ok(/const openUpload = \(\) => \{/.test(source), 'upload click should use a simple local entry guard')
  assert.ok(source.includes("showErrorDialog('未到参赛时间，无法提交')"), 'pending competition should be blocked when upload is clicked')
  assert.ok(source.includes("showErrorDialog('个人赛已结束')"), 'ended competition should be blocked when upload is clicked')
  assert.equal(source.includes('refreshUploadCooldown'), false, 'frontend should not duplicate backend upload interval rules')
  assert.equal(source.includes('isUploadCoolingDown'), false, 'frontend should not keep a local upload cooldown gate')
  assert.equal(source.includes('距离上次上传不足'), false, 'upload interval error text should come from the backend upload response')
})

test('api requests include cookies for backend user identity checks', async () => {
  const source = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')

  assert.ok(source.includes('withCredentials: true'), 'axios API client should send backend identity cookies')
})

test('api requests send current work id header for login session bootstrap', async () => {
  const source = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')

  assert.ok(source.includes('X-Agent-Contest-User-Id'), 'API client should send current work id header')
  assert.ok(source.includes('getMe'), 'API client should expose current session lookup')
})

test('frontend identity helpers are shared by app bootstrap session and API layers', async () => {
  const apiSource = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
  const sessionSource = await readFile(new URL('../src/composables/useUserSession.js', import.meta.url), 'utf8')

  assert.equal(normalizeUserId('w00678227'), '00678227')
  assert.equal(normalizeUserId('1234'), '')
  assert.equal(isEmergencyLoginPath('/emergency-login/'), true)
  assert.equal(USER_STORAGE_KEY, 'agent_game_user')
  assert.equal(THIRD_PARTY_USER_ID_STORAGE_KEY, 'agent_game_third_party_user_id')
  assert.equal(EMERGENCY_LOGIN_PATH, '/emergency-login')
  assert.ok(apiSource.includes("from '../utils/userIdentity'"), 'API client should reuse identity helpers')
  assert.ok(mainSource.includes("from './utils/userIdentity'"), 'app bootstrap should reuse identity helpers')
  assert.ok(sessionSource.includes("from '../utils/userIdentity'"), 'session composable should reuse identity helpers')
  assert.equal(apiSource.includes('const normalizeUserId ='), false, 'API client should not duplicate user id parsing')
  assert.equal(mainSource.includes('const normalizeUserId ='), false, 'app bootstrap should not duplicate user id parsing')
  assert.equal(sessionSource.includes('const normalizeUserId ='), false, 'session composable should not duplicate user id parsing')
})

test('expected unauthenticated session checks do not log noisy API errors', async () => {
  const source = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')
  const sessionSource = await readFile(new URL('../src/composables/useUserSession.js', import.meta.url), 'utf8')

  assert.ok(source.includes('isExpectedSessionProbeError'), 'API client should classify expected session probe errors')
  assert.ok(source.includes("config?.url === '/api/users/me'"), 'API client should only suppress expected me endpoint probes')
  assert.ok(sessionSource.includes('[401, 403, 404].includes(error?.response?.status)'), 'startup should not console-error expected missing sessions')
})

test('optional contest config fallback does not log noisy API errors', async () => {
  const source = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')
  const configSource = await readFile(new URL('../src/composables/useContestConfig.js', import.meta.url), 'utf8')

  assert.ok(source.includes('isOptionalContestConfigError'), 'API client should classify optional contest config failures')
  assert.ok(source.includes("config?.url === '/api/contest/config'"), 'API client should only suppress contest config fallback failures')
  assert.ok(configSource.includes('contestConfig.value = DEFAULT_CONTEST_CONFIG'), 'contest config failures should fall back to bundled defaults')
})

test('login redirect supports relative and absolute login URLs', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')

  assert.ok(source.includes('new URL(LOGIN_PAGE_URL, window.location.origin)'), 'login redirect should not throw when login page URL is relative')
})

test('frontend redirects non-local http traffic to https before app startup', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')

  assert.ok(source.includes('redirectHttpToHttps'), 'entrypoint should define an http-to-https redirect guard')
  assert.ok(source.includes("window.location.protocol !== 'http:'"), 'redirect guard should only act on http pages')
  assert.ok(source.includes('LOCAL_HTTP_HOSTS'), 'redirect guard should keep local development on http')
  assert.ok(source.includes("httpsUrl.protocol = 'https:'"), 'redirect guard should preserve the current URL and switch only the protocol')
  assert.ok(source.includes('window.location.replace(httpsUrl.toString())'), 'redirect guard should replace the current http URL')
  assert.ok(
    source.indexOf('redirectHttpToHttps()') < source.indexOf('initializeApp()'),
    'http-to-https redirect should run before app initialization'
  )
})

test('post-login user scoped frontend calls use signed session me endpoints', async () => {
  const source = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const sessionSource = await readFile(new URL('../src/composables/useUserSession.js', import.meta.url), 'utf8')
  const apiSource = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')

  assert.ok(sessionSource.includes('getMe'), 'startup should load registered profile through me endpoint')
  assert.ok(apiSource.includes('/api/users/me/submissions'), 'history should use me submissions endpoint')
  assert.ok(apiSource.includes('/api/upload/me'), 'upload should use me upload endpoint')
  assert.ok(apiSource.includes('/api/rank/me'), 'personal rank should use me rank endpoint')
  assert.equal(source.includes('currentUser?.uuid'), false, 'main page should not pass uuid to child components')
})

test('registered users bootstrap silently without identity confirmation UI', async () => {
  const source = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const sessionSource = await readFile(new URL('../src/composables/useUserSession.js', import.meta.url), 'utf8')

  assert.ok(sessionSource.includes('bootstrapRegisteredUserSession'), 'startup should silently bootstrap backend session for registered users')
  assert.ok(sessionSource.includes("username: ''"), 'registered-user bootstrap should not require a nickname')
  assert.equal(sessionSource.includes('applyRegisteredUserProfile'), false, 'bootstrap should not call removed profile helpers')
  assert.ok(sessionSource.includes('newUserRequired'), 'startup should distinguish the backend nickname-required state')
  assert.equal(source.includes('auth-state'), false, 'frontend should not render a separate identity confirmation page')
  assert.equal(source.includes('身份确认'), false, 'frontend should not show identity confirmation copy')
  assert.equal(source.includes('重新确认'), false, 'frontend should not show a manual reconfirm button')
  assert.equal(source.includes('老用户'), false, 'login UI should not show old-user wording')
  assert.equal(source.includes('可留空'), false, 'login UI should not tell users to leave nickname blank')
  assert.equal(source.includes('直接进入'), false, 'login flow should not expose direct-enter copy')
  assert.ok(source.includes('<h2>参赛登录</h2>'), 'login panel title should remain 参赛登录')
  assert.ok(source.includes("registerLoading ? '登录中...' : '登录'"), 'login button copy should remain 登录')
  assert.equal(source.includes('完成登记'), false, 'login UI should not show registration completion copy')
  assert.ok(source.includes('昵称设置后不可修改，请谨慎填写'), 'new-user nickname copy should stay simple')
})

test('emergency login route bypasses third-party login and calls backend allow-list endpoint', async () => {
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const apiSource = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')

  assert.ok(mainSource.includes("from './utils/userIdentity'"), 'entrypoint should share emergency login path helpers')
  assert.ok(mainSource.includes('isEmergencyLoginPath(window.location.pathname)'), 'entrypoint should detect the emergency login path')
  assert.ok(mainSource.includes('if (isEmergencyLoginPath(window.location.pathname))'), 'emergency login path should bypass third-party guard')
  assert.ok(apiSource.includes('/api/users/emergency-login'), 'API client should expose the backend emergency login endpoint')
  assert.ok(appSource.includes('isEmergencyLoginPage'), 'App should render a dedicated emergency login mode')
  assert.ok(appSource.includes('loginEmergencyUser'), 'emergency login form should call a dedicated submit handler')
  assert.ok(appSource.includes('应急登录'), 'emergency login UI should be visibly distinct from normal login')
})

test('registration payload normalizes prefixed work ids before posting to backend', async () => {
  const source = await readFile(new URL('../src/composables/useUserSession.js', import.meta.url), 'utf8')

  assert.ok(
    source.includes('const userId = normalizeUserId(registerForm.value.user_id)'),
    'registration validation should normalize prefixed work ids before length checks'
  )
  assert.ok(
    source.includes('user_id: userId'),
    'registration payload should send the same normalized 8-digit work id as the request header'
  )
  assert.ok(
    source.includes('const userId = normalizeUserId(user.user_id || user.userId)'),
    'stored user profile should keep the frontend user id in the same normalized format'
  )
})

test('login page stacks title and schedule before tablet width gets cramped', async () => {
  const source = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

  assert.ok(
    source.includes('@media (max-width: 1180px)'),
    'login page should stack title and schedule before those columns collapse at 1024px'
  )
})

test('history score detail trigger has a visible button affordance', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')
  const detailLinkBlocks = [...source.matchAll(/\.detail-link\s*\{([^}]*)\}/g)].map(match => match[1])
  const hasButtonAffordance = detailLinkBlocks.some(block => (
    /border:\s*1px\s+solid/.test(block)
    && /border-radius:/.test(block)
    && /background:\s*(?!transparent)/.test(block)
    && /min-height:/.test(block)
  ))

  assert.equal(hasButtonAffordance, true)
  assert.ok(source.includes('查看详情'), 'history score detail trigger should say 查看详情')
})

test('history page displays submission id for every record', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('提交 ID'), 'history table should include a submission id header')
  assert.ok(source.includes('submissionId(item)'), 'history rows should read backend submission id through a field-compatible helper')
  assert.ok(source.includes(':key="submissionId(item) || index"'), 'history rows should use backend submission id as their key when available')
  assert.ok(source.includes('submissionCreatedTime(item)'), 'history rows should read backend createdAt as the submitted time')
  assert.ok(source.includes('submission-id-badge'), 'history rows should make submission id visually distinct')
  assert.ok(source.includes("{{ submissionId(item) ? '#' + submissionId(item) : '-' }}"), 'history rows should render backend submission id')
  assert.ok(source.includes('item?.submission_id'), 'history rows should tolerate snake_case submission id fields')
  assert.ok(source.includes('item?.submissionId'), 'history rows should tolerate camelCase submission id fields')
})

test('history page shows uploaded submissions as queued with queue-ahead count', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')
  const modalSource = await readFile(new URL('../src/components/HistoryModal.vue', import.meta.url), 'utf8')

  assert.ok(source.includes("uploaded: '排队中...'"), 'history page should display uploaded status as 排队中...')
  assert.ok(modalSource.includes("uploaded: '排队中...'"), 'legacy history modal should display uploaded status as 排队中...')
  assert.ok(source.includes("`${statusTextMap.uploaded} 前边还有 ${count} 笔提交在排队`"), 'history page should show queue-ahead copy with readable spacing')
  assert.ok(source.includes('queueAheadCount'), 'history page should derive the queue-ahead count for queued submissions')
  assert.ok(source.includes('item?.queue_ahead'), 'history page should tolerate snake_case queue-ahead fields')
  assert.ok(source.includes('item?.queueAhead'), 'history page should tolerate camelCase queue-ahead fields')
  assert.ok(source.includes('前边还有 ${count} 笔提交在排队'), 'history page should render the queue-ahead count in Chinese')
})

test('history page only allows canceling queued submissions', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')
  const apiSource = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

  assert.ok(
    apiSource.includes('/api/users/me/submissions/${submissionId}/cancel'),
    'frontend API should call the signed-session cancel endpoint'
  )
  assert.ok(
    source.includes("String(item?.status || '').toLowerCase() === 'uploaded'"),
    'cancel button should only be available while the submission is queued'
  )
  assert.ok(source.includes('cancel-submission-btn'), 'history page should render a visible cancel action')
  assert.ok(source.includes('取消中...'), 'cancel action should show a pending state')
  assert.equal(source.includes("toLowerCase() === 'evaluating'"), false, 'evaluating submissions must not be cancelable')
  assert.equal(source.includes("toLowerCase() === 'failed'"), false, 'failed submissions must not be cancelable')
  assert.ok(source.includes("defineEmits(['back', 'canceled'])"), 'history page should emit an event after successful cancellation')
  assert.ok(source.includes("emit('canceled', { submissionId: id })"), 'cancel success should notify parent views with the canceled submission id')
  assert.ok(appSource.includes('@canceled="handleSubmissionCanceled"'), 'homepage should handle cancellation explicitly')
  assert.ok(appSource.includes('rankingBoardRef.value.refresh()'), 'homepage should refresh ranking metrics after cancellation')
  assert.equal(appSource.includes('canceledCooldownSubmissionIds'), false, 'homepage should not keep local cooldown exceptions after backend owns interval rules')
})

test('history page displays active queued and evaluating task counts', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')
  const apiSource = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')

  assert.ok(
    apiSource.includes('/api/users/me/submissions/summary'),
    'frontend API should call the signed-session submission summary endpoint'
  )
  assert.ok(source.includes('activeTaskSummary'), 'history page should derive active task summary counts')
  assert.ok(source.includes('当前排队'), 'history page should show queued task count copy')
  assert.ok(source.includes('正在评测'), 'history page should show evaluating task count copy')
  assert.ok(source.includes('queuedCount'), 'history page should read queued count from backend summary')
  assert.ok(source.includes('evaluatingCount'), 'history page should read evaluating count from backend summary')
  assert.ok(source.includes('await loadSubmissionQueueSummary()'), 'manual history refresh should also refresh active task counts')
})

test('history submission id column stays compact and truncates long ids', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')

  assert.ok(
    /grid-template-columns:\s*72px\s+minmax\(178px,\s*0\.94fr\)\s+minmax\(126px,\s*0\.58fr\)\s+minmax\(142px,\s*0\.64fr\)\s+minmax\(360px,\s*1\.45fr\)/.test(source),
    'history table should keep the submission id column compact and reserve enough width for status'
  )
  assert.ok(
    /\.submission-id-cell\s*\{[^}]*min-width:\s*0;/s.test(source),
    'submission id cell should be allowed to shrink inside the grid'
  )
  assert.ok(
    /\.submission-id-badge\s*\{[^}]*width:\s*100%;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;/s.test(source),
    'long submission ids should truncate instead of expanding the table column'
  )
  assert.ok(
    /\.status-pill\.uploaded\s*\{[^}]*overflow:\s*visible;[^}]*text-overflow:\s*clip;[^}]*white-space:\s*normal;/s.test(source),
    'queued status text should wrap instead of being truncated'
  )
  assert.ok(
    /\.status-pill\.uploaded\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*overflow-wrap:\s*anywhere;[^}]*word-break:\s*break-word;/s.test(source),
    'queued status should stay inside the status column and wrap long queue copy'
  )
})

test('history page auto refreshes every five seconds and clears the timer', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('HISTORY_REFRESH_INTERVAL_MS = 5000'), 'history refresh interval should be five seconds')
  assert.ok(source.includes('setInterval('), 'history page should start an interval refresh')
  assert.ok(source.includes('clearInterval('), 'history page should clear its interval')
  assert.ok(source.includes('onUnmounted'), 'history page should clean up on unmount')
})

test('ranking nickname column stays compact on desktop', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')
  const desktopColumns = source.match(/--ranking-table-columns:\s*([^;]+);/)?.[1] || ''
  const nicknameColumn = desktopColumns.match(/minmax\((\d+)px,\s*([0-9.]+)fr\)/)
  const nameMaxWidth = source.match(/\.name-text\s*\{\s*max-width:\s*min\((\d+)px,\s*100%\);/s)?.[1]
  const splitColumnGrid = source.match(/\.ranking-column \.table-header,\s*\.ranking-column \.table-row\s*\{[^}]*grid-template-columns:\s*([^;]+);/s)?.[1] || ''
  const splitNameMaxWidth = source.match(/\.ranking-column \.name-text\s*\{\s*max-width:\s*(\d+)px;/s)?.[1]

  assert.ok(nicknameColumn, 'desktop ranking grid should define a nickname minmax column')
  assert.ok(Number(nicknameColumn[1]) <= 132, 'nickname column minimum should stay compact')
  assert.ok(Number(nicknameColumn[2]) <= 0.46, 'nickname column flex share should not dominate the table')
  assert.ok(Number(nameMaxWidth) <= 170, 'nickname text should truncate before it over-expands')
  assert.ok(/minmax\(72px,\s*128px\)/.test(splitColumnGrid), 'split ranking nickname column should be capped around half its previous width')
  assert.ok(Number(splitNameMaxWidth) <= 112, 'split ranking nickname text should truncate inside the narrower column')
})

test('ranking summary and personal metrics have emphasized right-side structure', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('class="stat-signal"'), 'summary cards should fill the right side with a visual signal')
  assert.ok(source.includes('personal-stat-score'), 'my score should have a dedicated emphasized metric class')
  assert.ok(/\.stat-card::after\s*\{/.test(source), 'summary cards should have a right-side accent rail')
  assert.ok(/\.personal-info\s*\{[^}]*grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)/s.test(source), 'personal info should give metrics the main horizontal area')
  assert.ok(/\.personal-stat-score\s+\.value\s*\{[^}]*font-size:\s*(2[4-9]|3\d)px/s.test(source), 'my score value should be visually emphasized')
})

test('ranking score token usage and submission count headers are sortable', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  for (const field of ['score', 'submission_count', 'token_usage']) {
    assert.ok(source.includes(`@click="toggleSort('${field}')"`), `${field} header should toggle sorting`)
  }
  assert.ok(source.includes('sortField: requestSortField'), 'rank page request should include sortField')
})

test('ranking numeric sort headers align with their values', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')
  const numericHeaderSelectors = [
    '.table-header .col.score .sort-header',
    '.table-header .col.submission-count .sort-header',
    '.table-header .col.token-usage .sort-header'
  ]

  for (const selector of numericHeaderSelectors) {
    assert.ok(source.includes(selector), `${selector} should share the numeric header alignment rule`)
  }
  assert.ok(
    /\.table-header\s+\.col\s*\{[^}]*display:\s*flex;/s.test(source),
    'table header cells should use flex so numeric alignment rules apply'
  )
  assert.ok(
    /\.table-header \.col\.score \.sort-header,[^{}]*\.table-header \.col\.submission-count \.sort-header,[^{}]*\.table-header \.col\.token-usage \.sort-header\s*\{[^}]*justify-content:\s*flex-end;/s.test(source),
    'all numeric sort headers should align to the same edge as numeric values'
  )
})

test('ranking board marks test accounts as official demo rows', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('isTestAccountRank'), 'ranking board should detect test account rank rows')
  assert.ok(source.includes('官方Demo'), 'ranking board should render the official demo badge text')
  assert.ok(/\.official-demo-badge\s*\{/.test(source), 'official demo badge should have a dedicated style')
})
