const firstDefined = (...values) => {
  return values.find(value => value !== null && value !== undefined && value !== '')
}

const positiveQuestionNumber = (value, fallback) => {
  const question = Number(firstDefined(value, fallback))
  return Number.isFinite(question) && question > 0 ? question : null
}

const parseScorePair = (value) => {
  if (typeof value !== 'string') {
    return {}
  }
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[/／]\s*(\d+(?:\.\d+)?)$/)
  if (!match) {
    return {}
  }
  return {
    score: Number(match[1]),
    total: Number(match[2])
  }
}

const parseJsonArray = (value) => {
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value !== 'string' || !value.trim()) {
    return []
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

export const normalizeStatus = (status) => String(status || 'uploaded').toLowerCase()

export const hasScoreValue = (item) => {
  return item?.score !== null && item?.score !== undefined && item?.score !== ''
}

export const getTokenUsage = (item) => {
  return firstDefined(
    item?.token_usage,
    item?.tokenUsage,
    item?.token_useage,
    item?.tokenUseage
  )
}

export const normalizeScoreDetail = (value) => {
  return parseJsonArray(value)
    .map((item, index) => {
      const scorePair = parseScorePair(item?.score_detail ?? item?.scoreDetail ?? item?.result)
      const question = positiveQuestionNumber(
        firstDefined(
          item?.question,
          item?.question_id,
          item?.questionId,
          item?.question_no,
          item?.questionNo,
          item?.problem_id,
          item?.problemId,
          item?.id
        ),
        index + 1
      )
      const score = Number(firstDefined(
        item?.score,
        item?.actual_score,
        item?.actualScore,
        item?.got_score,
        item?.gotScore,
        item?.obtained_score,
        item?.obtainedScore,
        item?.point,
        item?.points,
        scorePair.score
      ))
      const total = Number(firstDefined(
        item?.total,
        item?.total_score,
        item?.totalScore,
        item?.full_score,
        item?.fullScore,
        item?.max_score,
        item?.maxScore,
        item?.max,
        item?.full_marks,
        item?.fullMarks,
        item?.total_points,
        item?.totalPoints,
        scorePair.total
      ))
      return {
        id: Number(firstDefined(item?.id, question)),
        question,
        title: String(item?.title ?? item?.name ?? '').trim(),
        detail: String(item?.detail ?? item?.description ?? item?.content ?? '').trim(),
        score,
        total
      }
    })
    .filter(item => (
      item.question !== null
      && Number.isFinite(item.score)
      && Number.isFinite(item.total)
      && item.total > 0
    ))
    .sort((left, right) => left.question - right.question)
}

export const normalizeQuestionDetails = (value) => {
  return parseJsonArray(value)
    .map((item, index) => {
      const question = positiveQuestionNumber(item?.question ?? item?.id, index + 1)
      const id = Number(firstDefined(item?.id, question))
      const title = String(item?.title ?? item?.name ?? '').trim()
      const detail = String(item?.detail ?? item?.description ?? item?.content ?? '').trim()
      return {
        id: Number.isFinite(id) ? id : question,
        question,
        title,
        detail
      }
    })
    .filter(item => item.question !== null && (item.title || item.detail))
    .sort((left, right) => left.question - right.question)
}

export const scoreDetailsForItem = (item) => {
  return normalizeScoreDetail(item?.score_detail ?? item?.scoreDetail)
}

export const questionDetailsForItem = (item) => {
  return normalizeQuestionDetails(item?.question_details ?? item?.questionDetails)
}

export const mergeQuestionScoreDetails = (item) => {
  const questionDetailMap = new Map(questionDetailsForItem(item).map(detail => [detail.question, detail]))
  return scoreDetailsForItem(item).map((scoreItem) => {
    const questionDetail = questionDetailMap.get(scoreItem.question)
    return {
      id: questionDetail?.id ?? scoreItem.id ?? scoreItem.question,
      question: scoreItem.question,
      title: questionDetail?.title ?? scoreItem.title,
      detail: questionDetail?.detail ?? scoreItem.detail,
      score: scoreItem.score,
      total: scoreItem.total
    }
  })
}

export const canShowScoreDetail = (item) => {
  return normalizeStatus(item?.status) === 'completed'
    && hasScoreValue(item)
    && mergeQuestionScoreDetails(item).length > 0
}
