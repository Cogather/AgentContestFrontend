import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  canShowScoreDetail,
  mergeQuestionScoreDetails
} from '../src/components/historyScoreDetail.js'

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

test('ranking board does not start an interval-based auto refresh', async () => {
  const source = await readFile(new URL('../src/components/RankingBoard.vue', import.meta.url), 'utf8')

  assert.equal(source.includes('setInterval('), false)
  assert.equal(source.includes('POLL_INTERVAL'), false)
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

  assert.ok(nicknameColumn, 'desktop ranking grid should define a nickname minmax column')
  assert.ok(Number(nicknameColumn[1]) <= 132, 'nickname column minimum should stay compact')
  assert.ok(Number(nicknameColumn[2]) <= 0.46, 'nickname column flex share should not dominate the table')
  assert.ok(Number(nameMaxWidth) <= 170, 'nickname text should truncate before it over-expands')
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
