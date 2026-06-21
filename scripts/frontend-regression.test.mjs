import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  canShowScoreDetail,
  mergeQuestionScoreDetails
} from '../src/utils/submissionScoreDetails.js'
import {
  canCancelSubmission,
  detailStatusText,
  failureReason,
  queueAheadCount,
  scoreDetailUnavailableText,
  statusText,
  submissionCreatedTime,
  submissionId
} from '../src/utils/submissionDisplay.js'
import { useContestClock } from '../src/composables/useContestClock.js'
import {
  EMERGENCY_LOGIN_PATH,
  isEmergencyLoginPath,
  normalizeUserId,
  normalizeUserIdFromRecord,
  THIRD_PARTY_USER_ID_STORAGE_KEY,
  USER_STORAGE_KEY
} from '../src/utils/userIdentity.js'
import { normalizeUserProfile } from '../src/utils/userProfile.js'
import {
  clearStoredCurrentUser,
  getCurrentStoredUserId,
  readStoredCurrentUser,
  readStoredThirdPartyUserId,
  saveStoredCurrentUser,
  saveStoredThirdPartyUserId
} from '../src/utils/userStorage.js'
import { firstDefined, formatNumber } from '../src/utils/valueHelpers.js'
import { requestErrorDetail, requestErrorMessage } from '../src/utils/requestErrors.js'
import {
  getSubmissionCount,
  isTestAccountRank,
  rankRowClass,
  visiblePageNumbers
} from '../src/utils/rankingDisplay.js'
import {
  activeSubmissionSummary,
  countSubmissionsByStatus
} from '../src/utils/submissionSummary.js'
import {
  formatFileSizeMb,
  INVALID_ZIP_MESSAGE,
  isZipPackage,
  UPLOAD_LIMIT_TEXT
} from '../src/utils/uploadFileRules.js'
import {
  buildLoginRedirectUrl,
  redirectHttpToHttps
} from '../src/utils/appBootstrap.js'
import {
  contestCountdownInfo,
  contestPhaseAt,
  formatDurationText,
  timestampOf
} from '../src/utils/contestTime.js'

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

test('score detail parsing lives in shared utils instead of component folders', async () => {
  const historySource = await readFile(new URL('../src/composables/useSubmissionHistory.js', import.meta.url), 'utf8')

  assert.ok(historySource.includes("from '../utils/submissionScoreDetails'"), 'history composable should import score detail helpers from utils')
})

test('score formatting preserves decimal scores without noisy trailing zeroes', async () => {
  const { formatScore } = await import('../src/utils/scoreFormat.js')

  assert.equal(formatScore(900), '900')
  assert.equal(formatScore(900.5), '900.5')
  assert.equal(formatScore('899.9999'), '899.9999')
  assert.equal(formatScore(null), '-')
})

test('shared value helpers normalize fallback and number display behavior', () => {
  assert.equal(firstDefined(null, undefined, '', 'ready'), 'ready')
  assert.equal(formatNumber(1234567), '1,234,567')
  assert.equal(formatNumber(null), '-')
  assert.equal(formatNumber('not-a-number'), '-')
  assert.equal(formatNumber('not-a-number', { invalidFallback: '原值不可用' }), '原值不可用')
})

test('shared user profile helper normalizes backend identity fields', () => {
  assert.equal(normalizeUserProfile(null), null)
  assert.deepEqual(
    normalizeUserProfile({
      userId: 'w00678227',
      username: '  明海  ',
      client_uuid: '  abc-123  ',
      test_account: true
    }),
    {
      userId: 'w00678227',
      username: '明海',
      client_uuid: '  abc-123  ',
      test_account: true,
      uuid: 'abc-123',
      user_id: '00678227'
    }
  )
})

test('shared request error helpers format backend network and timeout failures', () => {
  assert.equal(
    requestErrorDetail({ response: { data: { message: '距离上次上传不足30分钟' }, status: 429 } }),
    '距离上次上传不足30分钟'
  )
  assert.equal(requestErrorDetail({ response: { status: 500 } }), 'HTTP 500')
  assert.equal(requestErrorDetail({ code: 'ECONNABORTED' }), '请求超时')
  assert.equal(requestErrorDetail({ message: 'Network Error' }), 'Network Error')
  assert.equal(requestErrorMessage({}, '上传失败'), '上传失败')
  assert.equal(
    requestErrorMessage({ response: { data: { message: '用户身份校验失败' } } }, '登录失败', { prefixFallback: true }),
    '登录失败：用户身份校验失败'
  )
})

test('contest time helpers keep phase and duration rules reusable', () => {
  const start = timestampOf('2026-05-24T08:00:00+08:00')
  const end = timestampOf('2026-06-15T00:00:00+08:00')

  assert.equal(contestPhaseAt(start - 1, start, end), 'pending')
  assert.equal(contestPhaseAt(start, start, end), 'running')
  assert.equal(contestPhaseAt(end - 1, start, end), 'running')
  assert.equal(contestPhaseAt(end, start, end), 'ended')
  assert.equal(contestPhaseAt(start, Number.NaN, end), 'unknown')
  assert.equal(formatDurationText(90061000), '1天 01:01:01')
  assert.equal(formatDurationText(-1), '0天 00:00:00')
  assert.deepEqual(contestCountdownInfo({
    phase: 'pending',
    now: start - 1000,
    startTime: start,
    endTime: end
  }), {
    label: '距离个人赛正式开始：',
    text: '0天 00:00:01'
  })
  assert.deepEqual(contestCountdownInfo({
    phase: 'running',
    now: end - 1000,
    startTime: start,
    endTime: end
  }), {
    label: '距离个人赛提交结束：',
    text: '0天 00:00:01'
  })
  assert.deepEqual(contestCountdownInfo({
    phase: 'ended',
    now: end,
    startTime: start,
    endTime: end
  }), {
    label: '',
    text: '已结束'
  })
})

test('submission display helpers normalize ids status text and failure reasons', () => {
  const queuedSubmission = {
    submissionId: 'abc123',
    status: 'UPLOADED',
    queue_position: 4,
    createdAt: '2026-06-01T10:00:00+08:00'
  }
  const failedSubmission = {
    id: 'failed-1',
    status: 'FAILED',
    message: '第一行\\n第二行'
  }

  assert.equal(submissionId(queuedSubmission), 'abc123')
  assert.equal(submissionCreatedTime(queuedSubmission), queuedSubmission.createdAt)
  assert.equal(queueAheadCount(queuedSubmission), 3)
  assert.equal(statusText(queuedSubmission.status, queuedSubmission), '排队中... 前边还有 3 笔提交在排队')
  assert.equal(canCancelSubmission(queuedSubmission), true)
  assert.equal(canCancelSubmission({ id: 'abc123', status: 'EVALUATING' }), false)
  assert.equal(failureReason(failedSubmission), '第一行\n第二行')
  assert.equal(detailStatusText(failedSubmission), '失败：第一行\n第二行')
  assert.equal(scoreDetailUnavailableText({ status: 'UPLOADED' }), '待评测')
})

test('frontend request error formatting is shared instead of duplicated in composables', async () => {
  const sessionSource = await readFile(new URL('../src/composables/useUserSession.js', import.meta.url), 'utf8')
  const uploadSource = await readFile(new URL('../src/composables/usePackageUpload.js', import.meta.url), 'utf8')
  const historySource = await readFile(new URL('../src/composables/useSubmissionHistory.js', import.meta.url), 'utf8')
  const rankingSource = await readFile(new URL('../src/composables/useRankingBoard.js', import.meta.url), 'utf8')
  const configSource = await readFile(new URL('../src/composables/useContestConfig.js', import.meta.url), 'utf8')

  for (const source of [sessionSource, uploadSource, historySource, rankingSource, configSource]) {
    assert.ok(source.includes('requestErrorMessage'), 'request error text should use the shared helper')
  }
  assert.equal(sessionSource.includes('const requestErrorMessage ='), false, 'session composable should not duplicate request error formatting')
  assert.equal(uploadSource.includes('error?.response?.data?.message ||'), false, 'upload composable should not duplicate backend-message fallback logic')
  assert.equal(historySource.includes('error?.response?.data?.message ||'), false, 'history composable should not duplicate backend-message fallback logic')
  assert.equal(rankingSource.includes('error?.response?.data?.message ||'), false, 'ranking composable should not duplicate backend-message fallback logic')
  assert.equal(configSource.includes('error?.response?.data?.message ||'), false, 'contest config composable should not duplicate backend-message fallback logic')
})

test('ranking board does not start an interval-based auto refresh', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.equal(source.includes('setInterval('), false)
  assert.equal(source.includes('POLL_INTERVAL'), false)
})

test('ranking board defaults to twenty rows per page', async () => {
  const source = await readFile(new URL('../src/composables/useRankingBoard.js', import.meta.url), 'utf8')
  const componentSource = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('const pageSize = ref(20)'), 'ranking board should request 20 rows by default')
  assert.ok(componentSource.includes('<option :value="20">20</option>'), 'page size selector should keep 20 as an available size')
  assert.ok(componentSource.includes('useRankingBoard'), 'ranking board component should delegate state to the composable')
})

test('ranking board splits twenty rows into two ten-row columns', async () => {
  const source = await readFile(new URL('../src/composables/useRankingBoard.js', import.meta.url), 'utf8')
  const componentSource = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('RANKING_COLUMN_SIZE = 10'), 'ranking board should use ten rows per visual column')
  assert.ok(source.includes('rankingColumns'), 'ranking board should derive visual ranking columns')
  assert.ok(componentSource.includes('class="ranking-columns"'), 'ranking board should render a two-column ranking wrapper')
  assert.ok(componentSource.includes('class="ranking-column"'), 'ranking board should render each ten-row column separately')
})

test('ranking display helpers keep row badges counts and visible pages reusable', async () => {
  const source = await readFile(new URL('../src/composables/useRankingBoard.js', import.meta.url), 'utf8')

  assert.equal(getSubmissionCount({ submission_count: 7 }), 7)
  assert.equal(getSubmissionCount({ submissionCount: 8 }), 8)
  assert.equal(isTestAccountRank({ test_account: 'yes' }), true)
  assert.equal(isTestAccountRank({ testAccount: '1' }), true)
  assert.equal(isTestAccountRank({ testAccount: 'false' }), false)
  assert.deepEqual(rankRowClass({ rank: 1 }), {
    'top-three': true,
    'rank-first-row': true,
    'rank-second-row': false,
    'rank-third-row': false,
    'top-ten': false,
    'top-twenty': false,
    'top-fifty': false,
    'top-hundred': false,
    'top-two-hundred': false
  })
  assert.deepEqual(visiblePageNumbers(3, 1), [1, 2, 3])
  assert.deepEqual(visiblePageNumbers(10, 1), [1, 2, 3, 4, 5])
  assert.deepEqual(visiblePageNumbers(10, 5), [3, 4, 5, 6, 7])
  assert.deepEqual(visiblePageNumbers(10, 10), [6, 7, 8, 9, 10])
  assert.ok(source.includes("from '../utils/rankingDisplay'"), 'ranking composable should import ranking display helpers')
  assert.equal(source.includes('const isTruthyFlag ='), false, 'ranking composable should not own test account flag parsing')
  assert.equal(source.includes('const visiblePageNumbers ='), false, 'ranking composable should not own pagination window formatting')
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
  const uploadSource = await readFile(new URL('../src/composables/usePackageUpload.js', import.meta.url), 'utf8')

  assert.ok(source.includes('uploadLimitText'), 'upload dialog should render the shared upload limit text')
  assert.equal(UPLOAD_LIMIT_TEXT, '仅支持 100MB 以内 .zip 压缩包')
  assert.equal(INVALID_ZIP_MESSAGE, '程序包的格式错误，请上传zip格式的压缩包')
  assert.ok(uploadSource.includes('UPLOAD_LIMIT_TEXT'), 'upload composable should expose the shared upload limit text')
  assert.ok(uploadSource.includes('INVALID_ZIP_MESSAGE'), 'upload composable should expose the shared invalid zip text')
})

test('upload modal delegates package upload state to a composable', async () => {
  const source = await readFile(new URL('../src/components/UploadModal.vue', import.meta.url), 'utf8')
  const uploadSource = await readFile(new URL('../src/composables/usePackageUpload.js', import.meta.url), 'utf8')

  assert.ok(source.includes('usePackageUpload'), 'upload modal should delegate upload behavior')
  assert.equal(source.includes('commonApi.uploadCode'), false, 'upload modal should not own API upload calls')
  assert.ok(uploadSource.includes('commonApi.uploadCode'), 'upload composable should own API upload calls')
  assert.ok(uploadSource.includes('fileInput.value?.click()'), 'file selection should tolerate an unmounted input ref')
})

test('upload file rules keep zip validation and size formatting reusable', async () => {
  const source = await readFile(new URL('../src/components/UploadModal.vue', import.meta.url), 'utf8')
  const uploadSource = await readFile(new URL('../src/composables/usePackageUpload.js', import.meta.url), 'utf8')

  assert.equal(isZipPackage({ name: 'agent.ZIP' }), true)
  assert.equal(isZipPackage({ name: 'agent.tar.gz' }), false)
  assert.equal(isZipPackage(null), false)
  assert.equal(formatFileSizeMb(1048576), '1.00 MB')
  assert.equal(formatFileSizeMb('524288'), '0.50 MB')
  assert.equal(formatFileSizeMb('bad'), '-')
  assert.ok(uploadSource.includes("from '../utils/uploadFileRules'"), 'upload composable should import upload file rules')
  assert.ok(uploadSource.includes('selectedFileSizeText'), 'upload composable should expose formatted selected file size')
  assert.ok(source.includes('selectedFileSizeText'), 'upload modal should render the composable-provided file size text')
  assert.equal(source.includes('selectedFile.size / 1024 / 1024'), false, 'upload modal should not inline file size formatting')
  assert.equal(uploadSource.includes('const isZipFile ='), false, 'upload composable should not duplicate zip validation')
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

test('contest clock delegates date math to shared contest time helpers', async () => {
  const source = await readFile(new URL('../src/composables/useContestClock.js', import.meta.url), 'utf8')

  assert.ok(source.includes("from '../utils/contestTime.js'"), 'contest clock should reuse shared time helpers')
  assert.ok(source.includes('contestPhaseAt('), 'contest clock should use the shared phase helper')
  assert.ok(source.includes('contestCountdownInfo('), 'contest clock should use the shared countdown helper')
  assert.equal(source.includes('const formatDurationText ='), false, 'contest clock should not own duration formatting')
  assert.equal(source.includes('const timestampOf ='), false, 'contest clock should not own timestamp parsing')
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

test('app reuses one contest schedule panel for home and login pages', async () => {
  const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const scheduleSource = await readFile(new URL('../src/components/ContestSchedulePanel.vue', import.meta.url), 'utf8')

  assert.ok(appSource.includes('ContestSchedulePanel'), 'App should render schedule information through a shared component')
  assert.equal(
    appSource.match(/<ContestSchedulePanel/g)?.length,
    2,
    'login and home pages should use the same schedule component'
  )
  assert.equal(appSource.includes('hero-schedule-copy'), false, 'App should not duplicate schedule panel internals')
  assert.ok(scheduleSource.includes('scheduleText'), 'schedule component should own the schedule text rendering')
  assert.ok(scheduleSource.includes('countdown-ended'), 'schedule component should keep ended-state styling')
  assert.ok(scheduleSource.includes('hero-schedule-visual'), 'schedule component should keep the abstract visual motif')
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
  const profileSource = await readFile(new URL('../src/utils/userProfile.js', import.meta.url), 'utf8')
  const storageSource = await readFile(new URL('../src/utils/userStorage.js', import.meta.url), 'utf8')

  assert.equal(normalizeUserId('w00678227'), '00678227')
  assert.equal(normalizeUserId('1234'), '')
  assert.equal(normalizeUserIdFromRecord({ userId: 'w00678227' }), '00678227')
  assert.equal(normalizeUserIdFromRecord({ employee_id: '00678228' }), '00678228')
  assert.equal(normalizeUserIdFromRecord({ workId: 'W00678229' }), '00678229')
  assert.equal(normalizeUserIdFromRecord({ userId: '1234' }), '')
  assert.equal(isEmergencyLoginPath('/emergency-login/'), true)
  assert.equal(USER_STORAGE_KEY, 'agent_game_user')
  assert.equal(THIRD_PARTY_USER_ID_STORAGE_KEY, 'agent_game_third_party_user_id')
  assert.equal(EMERGENCY_LOGIN_PATH, '/emergency-login')
  assert.ok(apiSource.includes("from '../utils/userStorage'"), 'API client should read user identity through shared storage helpers')
  assert.ok(mainSource.includes("from './utils/userIdentity'"), 'app bootstrap should reuse identity helpers')
  assert.ok(mainSource.includes("from './utils/userStorage'"), 'app bootstrap should write third-party identity through shared storage helpers')
  assert.ok(sessionSource.includes("from '../utils/userIdentity'"), 'session composable should reuse identity helpers')
  assert.ok(sessionSource.includes("from '../utils/userProfile'"), 'session composable should reuse shared profile normalization')
  assert.ok(sessionSource.includes("from '../utils/userStorage'"), 'session composable should persist identity through shared storage helpers')
  assert.ok(profileSource.includes("from './userIdentity.js'"), 'profile normalization should reuse shared user id parsing')
  assert.ok(storageSource.includes("from './userIdentity.js'"), 'storage helpers should reuse shared user id parsing')
  assert.ok(storageSource.includes("from './userProfile.js'"), 'storage helpers should reuse shared user profile normalization')
  assert.equal(apiSource.includes('const normalizeUserId ='), false, 'API client should not duplicate user id parsing')
  assert.equal(apiSource.includes('localStorage'), false, 'API client should not duplicate localStorage access')
  assert.equal(mainSource.includes('const normalizeUserId ='), false, 'app bootstrap should not duplicate user id parsing')
  assert.equal(mainSource.includes('const extractUserId ='), false, 'app bootstrap should not duplicate user id record parsing')
  assert.ok(mainSource.includes('normalizeUserIdFromRecord(res?.data)'), 'app bootstrap should parse third-party login responses with the shared helper')
  assert.equal(sessionSource.includes('const normalizeUserId ='), false, 'session composable should not duplicate user id parsing')
  assert.equal(sessionSource.includes('const normalizeUserProfile ='), false, 'session composable should not duplicate profile normalization')
})

test('user storage helpers centralize current user identity persistence', () => {
  const previousStorage = globalThis.localStorage
  const entries = new Map()

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => entries.get(key) || null,
      setItem: (key, value) => entries.set(key, String(value)),
      removeItem: key => entries.delete(key)
    }
  })

  try {
    const storedUser = saveStoredCurrentUser({
      userId: 'w00678227',
      username: '  王明海  ',
      client_uuid: 'client-uuid'
    })

    assert.equal(storedUser.user_id, '00678227')
    assert.equal(storedUser.username, '王明海')
    assert.equal(storedUser.uuid, 'client-uuid')
    assert.deepEqual(readStoredCurrentUser(), storedUser)
    assert.equal(getCurrentStoredUserId(), '00678227')

    assert.equal(saveStoredThirdPartyUserId('w00678228'), '00678228')
    assert.equal(readStoredThirdPartyUserId(), '00678228')
    assert.equal(getCurrentStoredUserId(), '00678228')

    clearStoredCurrentUser()
    assert.equal(readStoredCurrentUser(), null)
    assert.equal(getCurrentStoredUserId(), '00678228')
  } finally {
    if (typeof previousStorage === 'undefined') {
      delete globalThis.localStorage
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: previousStorage
      })
    }
  }
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
  const source = await readFile(new URL('../src/utils/appBootstrap.js', import.meta.url), 'utf8')

  assert.ok(source.includes('new URL(loginPageUrl, origin)'), 'login redirect should not throw when login page URL is relative')
  assert.equal(
    buildLoginRedirectUrl('/auth/login', 'https://contest.example/history', 'https://contest.example').toString(),
    'https://contest.example/auth/login?redirect=https%3A%2F%2Fcontest.example%2Fhistory'
  )
  assert.equal(
    buildLoginRedirectUrl('https://login.example/core_config/', 'https://contest.example/', 'https://contest.example').toString(),
    'https://login.example/core_config/?redirect=https%3A%2F%2Fcontest.example%2F'
  )
})

test('frontend redirects non-local http traffic to https before app startup', async () => {
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
  const source = await readFile(new URL('../src/utils/appBootstrap.js', import.meta.url), 'utf8')
  const replacements = []

  assert.ok(source.includes('redirectHttpToHttps'), 'entrypoint should define an http-to-https redirect guard')
  assert.ok(source.includes("location.protocol !== 'http:'"), 'redirect guard should only act on http pages')
  assert.ok(source.includes('LOCAL_HTTP_HOSTS'), 'redirect guard should keep local development on http')
  assert.ok(source.includes("httpsUrl.protocol = 'https:'"), 'redirect guard should preserve the current URL and switch only the protocol')
  assert.ok(source.includes('replace(httpsUrl.toString())'), 'redirect guard should replace the current http URL')
  assert.equal(redirectHttpToHttps({
    location: new URL('http://contest.example/history'),
    replace: value => replacements.push(value)
  }), true)
  assert.deepEqual(replacements, ['https://contest.example/history'])
  assert.equal(redirectHttpToHttps({
    location: new URL('http://127.0.0.1:5173/history'),
    replace: value => replacements.push(value)
  }), false)
  assert.ok(
    mainSource.indexOf('redirectHttpToHttps()') < mainSource.indexOf('initializeApp()'),
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
  const profileSource = await readFile(new URL('../src/utils/userProfile.js', import.meta.url), 'utf8')

  assert.ok(
    source.includes('const userId = normalizeUserId(registerForm.value.user_id)'),
    'registration validation should normalize prefixed work ids before length checks'
  )
  assert.ok(
    source.includes('user_id: userId'),
    'registration payload should send the same normalized 8-digit work id as the request header'
  )
  assert.ok(
    profileSource.includes('user_id: normalizeUserId(user.user_id || user.userId)'),
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
  const historySource = await readFile(new URL('../src/composables/useSubmissionHistory.js', import.meta.url), 'utf8')
  const displaySource = await readFile(new URL('../src/utils/submissionDisplay.js', import.meta.url), 'utf8')

  assert.ok(source.includes('提交 ID'), 'history table should include a submission id header')
  assert.ok(source.includes('submissionId(item)'), 'history rows should read backend submission id through a field-compatible helper')
  assert.ok(source.includes(':key="submissionId(item) || index"'), 'history rows should use backend submission id as their key when available')
  assert.ok(source.includes('submissionCreatedTime(item)'), 'history rows should read backend createdAt as the submitted time')
  assert.ok(source.includes('submission-id-badge'), 'history rows should make submission id visually distinct')
  assert.ok(source.includes("{{ submissionId(item) ? '#' + submissionId(item) : '-' }}"), 'history rows should render backend submission id')
  assert.ok(historySource.includes("from '../utils/submissionDisplay'"), 'history composable should import shared submission display helpers')
  assert.ok(displaySource.includes('item?.submission_id'), 'history rows should tolerate snake_case submission id fields')
  assert.ok(displaySource.includes('item?.submissionId'), 'history rows should tolerate camelCase submission id fields')
})

test('history page shows uploaded submissions as queued with queue-ahead count', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')
  const displaySource = await readFile(new URL('../src/utils/submissionDisplay.js', import.meta.url), 'utf8')

  assert.ok(displaySource.includes("uploaded: '排队中...'"), 'history page should display uploaded status as 排队中...')
  assert.ok(displaySource.includes("`${statusTextMap.uploaded} 前边还有 ${count} 笔提交在排队`"), 'history page should show queue-ahead copy with readable spacing')
  assert.ok(displaySource.includes('queueAheadCount'), 'history page should derive the queue-ahead count for queued submissions')
  assert.ok(displaySource.includes('item?.queue_ahead'), 'history page should tolerate snake_case queue-ahead fields')
  assert.ok(displaySource.includes('item?.queueAhead'), 'history page should tolerate camelCase queue-ahead fields')
  assert.ok(displaySource.includes('前边还有 ${count} 笔提交在排队'), 'history page should render the queue-ahead count in Chinese')
  assert.ok(source.includes('statusText(item.status, item)'), 'history table should render the derived status text')
})

test('history page only allows canceling queued submissions', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')
  const historySource = await readFile(new URL('../src/composables/useSubmissionHistory.js', import.meta.url), 'utf8')
  const displaySource = await readFile(new URL('../src/utils/submissionDisplay.js', import.meta.url), 'utf8')
  const apiSource = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')

  assert.ok(
    apiSource.includes('/api/users/me/submissions/${submissionId}/cancel'),
    'frontend API should call the signed-session cancel endpoint'
  )
  assert.ok(
    displaySource.includes("String(item?.status || '').toLowerCase() === 'uploaded'"),
    'cancel button should only be available while the submission is queued'
  )
  assert.ok(source.includes('cancel-submission-btn'), 'history page should render a visible cancel action')
  assert.ok(source.includes('取消中...'), 'cancel action should show a pending state')
  assert.equal(displaySource.includes("toLowerCase() === 'evaluating'"), false, 'evaluating submissions must not be cancelable')
  assert.equal(displaySource.includes("toLowerCase() === 'failed'"), false, 'failed submissions must not be cancelable')
  assert.ok(source.includes("defineEmits(['back', 'canceled'])"), 'history page should emit an event after successful cancellation')
  assert.ok(source.includes("onCanceled: payload => emit('canceled', payload)"), 'history page should forward cancellation events from the composable')
  assert.ok(historySource.includes('onCanceled?.({ submissionId: id })'), 'cancel success should notify parent views with the canceled submission id')
  assert.ok(appSource.includes('@canceled="handleSubmissionCanceled"'), 'homepage should handle cancellation explicitly')
  assert.ok(appSource.includes('rankingBoardRef.value.refresh()'), 'homepage should refresh ranking metrics after cancellation')
  assert.equal(appSource.includes('canceledCooldownSubmissionIds'), false, 'homepage should not keep local cooldown exceptions after backend owns interval rules')
})

test('history page displays active queued and evaluating task counts', async () => {
  const source = await readFile(new URL('../src/components/HistoryPage.vue', import.meta.url), 'utf8')
  const historySource = await readFile(new URL('../src/composables/useSubmissionHistory.js', import.meta.url), 'utf8')
  const apiSource = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8')

  assert.ok(
    apiSource.includes('/api/users/me/submissions/summary'),
    'frontend API should call the signed-session submission summary endpoint'
  )
  assert.ok(source.includes('activeTaskSummary'), 'history page should derive active task summary counts')
  assert.ok(source.includes('当前排队'), 'history page should show queued task count copy')
  assert.ok(source.includes('正在评测'), 'history page should show evaluating task count copy')
  assert.ok(historySource.includes('queuedCount'), 'history page should read queued count from backend summary')
  assert.ok(historySource.includes('evaluatingCount'), 'history page should read evaluating count from backend summary')
  assert.ok(historySource.includes('await loadSubmissionQueueSummary()'), 'manual history refresh should also refresh active task counts')
})

test('history active task summary falls back to local submission statuses', async () => {
  const historySource = await readFile(new URL('../src/composables/useSubmissionHistory.js', import.meta.url), 'utf8')
  const submissions = [
    { status: 'UPLOADED' },
    { status: 'uploaded' },
    { status: 'EVALUATING' },
    { status: 'COMPLETED' }
  ]

  assert.equal(countSubmissionsByStatus(submissions, 'uploaded'), 2)
  assert.equal(countSubmissionsByStatus(submissions, 'evaluating'), 1)
  assert.deepEqual(activeSubmissionSummary({}, submissions), {
    queuedCount: 2,
    evaluatingCount: 1
  })
  assert.deepEqual(activeSubmissionSummary({ queued_count: '5', evaluatingCount: 3 }, submissions), {
    queuedCount: 5,
    evaluatingCount: 3
  })
  assert.deepEqual(activeSubmissionSummary({ queuedCount: '-1', evaluating_count: 'bad' }, submissions), {
    queuedCount: 2,
    evaluatingCount: 1
  })
  assert.ok(historySource.includes("from '../utils/submissionSummary'"), 'history composable should import active task summary helpers')
  assert.equal(historySource.includes('const numericCount ='), false, 'history composable should not own summary number parsing')
  assert.equal(historySource.includes('countLocalSubmissionsByStatus'), false, 'history composable should not own local status counting')
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
  const source = await readFile(new URL('../src/composables/useSubmissionHistory.js', import.meta.url), 'utf8')

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
  const rankingSource = await readFile(new URL('../src/composables/useRankingBoard.js', import.meta.url), 'utf8')

  for (const field of ['score', 'submission_count', 'token_usage']) {
    assert.ok(source.includes(`@click="toggleSort('${field}')"`), `${field} header should toggle sorting`)
  }
  assert.ok(rankingSource.includes('sortField: requestSortField'), 'rank page request should include sortField')
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
