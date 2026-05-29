import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
