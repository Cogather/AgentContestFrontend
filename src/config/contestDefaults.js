export const DEFAULT_CONTEST_CONFIG = Object.freeze({
  title: '西研软件大赛',
  subtitle: '面向真实任务的智能体挑战大赛',
  modeLabel: '个人赛',
  challengeTitle: '通用 Agent 设计挑战',
  challengeContent: `欢迎参加 Agent 大赛！

本次大赛主题：通用 Agent 设计挑战

任务目标：
设计并实现一个能够完成多样化任务的通用 Agent 系统，参赛者需要让 Agent 通过我们提供的评测集，根据任务完成情况和得分进行排名。

评分标准：
- 任务完成度
- 任务得分
- 完成时间

祝各位参赛者取得好成绩！`,
  scheduleText: '2026/5/24 8:00--2026/6/14',
  startAt: '2026-05-24T08:00:00+08:00',
  endAt: '2026-06-15T00:00:00+08:00',
  timeZone: 'Asia/Shanghai'
})

const stringOrDefault = (value, fallback) => {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

export const normalizeContestConfig = (config = {}) => {
  const source = config && typeof config === 'object' ? config : {}
  const challengeTitle = stringOrDefault(source.challenge_title || source.challengeTitle, DEFAULT_CONTEST_CONFIG.challengeTitle)
  return {
    title: stringOrDefault(source.title, DEFAULT_CONTEST_CONFIG.title),
    subtitle: stringOrDefault(source.subtitle, DEFAULT_CONTEST_CONFIG.subtitle),
    modeLabel: stringOrDefault(source.mode_label || source.modeLabel, DEFAULT_CONTEST_CONFIG.modeLabel),
    challengeTitle,
    challengeContent: stringOrDefault(
      source.challenge_content || source.challengeContent,
      DEFAULT_CONTEST_CONFIG.challengeContent.replace(DEFAULT_CONTEST_CONFIG.challengeTitle, challengeTitle)
    ),
    scheduleText: stringOrDefault(source.schedule_text || source.scheduleText, DEFAULT_CONTEST_CONFIG.scheduleText),
    startAt: stringOrDefault(source.start_at || source.startAt, DEFAULT_CONTEST_CONFIG.startAt),
    endAt: stringOrDefault(source.end_at || source.endAt, DEFAULT_CONTEST_CONFIG.endAt),
    timeZone: stringOrDefault(source.time_zone || source.timeZone, DEFAULT_CONTEST_CONFIG.timeZone)
  }
}
