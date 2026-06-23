# AgentContest 前端软件设计文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 系统 | AgentContest 前端 |
| 仓库 | `AgentContest` |
| 技术栈 | Vue 3、Vite、Axios |
| 读者 | 开发者、代码智能体 |
| 状态 | 持续维护的设计文档 |

## 2. 文档目标

本文档描述 AgentContest 前端的设计。后续开发者或代码智能体在适配新比赛时，应先阅读本文档，再修改页面、接口、上传、历史、排行榜和得分详情相关逻辑。

前端负责：

- 展示比赛信息、赛程、倒计时、上传入口、历史记录、得分详情和排行榜。
- 对接第三方登录或应急登录。
- 通过 Cookie、写接口 key 和当前用户请求头调用后端 `/me` 接口。
- 在页面上清晰展示后端校验错误，不在生产代码中伪造本地数据。

后端是身份、上传准入、比赛时间窗口、上传间隔、得分详情、排行榜数据和提交状态流转的最终权威。

## 3. 设计目标

- **比赛配置优先来自后端**：比赛名称、赛题、赛程和时间窗口优先使用 `GET /api/contest/config`。
- **低侵入扩展**：页面组件保持展示职责；接口请求、状态流转和展示解析放到 composable 或 utils。
- **生产数据真实可信**：后端缺数据时展示空状态或不可用状态，不生成假榜单、假题目、假分数。
- **部署可恢复**：API 地址、写接口 key、上传超时和登录守卫通过环境变量控制。
- **操作反馈明确**：上传进度、失败原因、队列状态、取消结果和历史刷新都要可见且稳定。

## 4. 系统上下文

```text
浏览器
  -> main.js
  -> App.vue
  -> composables
  -> api/index.js
  -> AgentContest 后端
  -> MySQL / 挂载程序包目录 / 判别器
```

外部角色：

- **参赛用户**：打开页面、登记昵称、上传 zip、查看历史和排行榜。
- **内部登录系统**：可选地提供工号，并在应用初始化前写入前端存储。
- **后端服务**：签发用户 Cookie、执行上传规则、返回比赛/排行/历史数据。

## 5. 总体架构

前端采用 Vue 分层结构：

| 层级 | 文件 | 职责 |
| --- | --- | --- |
| 入口 | `src/main.js` | HTTPS 跳转、可选第三方登录守卫、Vue 挂载 |
| 应用壳 | `src/App.vue` | 页面壳、弹框路由、当前视图状态 |
| API 适配层 | `src/api/index.js` | Axios 实例、API 基地址、写接口 key、当前用户请求头、上传超时 |
| 应用级 composable | `useUserSession.js`、`useContestConfig.js`、`useContestClock.js`、`useErrorDialog.js` | 登录态、比赛配置、倒计时、全局错误状态 |
| 功能级 composable | `usePackageUpload.js`、`useSubmissionHistory.js`、`useRankingBoard.js` | 上传、历史、取消、得分详情、排行榜状态 |
| 组件 | `RegisterPanel.vue`、`ContestSchedulePanel.vue`、`UploadModal.vue`、`HistoryPage.vue`、`RankingBoard.vue`、`ErrorModal.vue` | 页面展示和事件绑定 |
| 工具 | `src/utils/*.js` | 字段归一化、展示文案、分数格式化、上传文件规则、本地存储 |

设计规则：如果一段逻辑可以脱离 DOM 测试或复用，就应放进 `composables` 或 `utils`，不要直接写在组件模板里。

## 6. 模块设计

### 6.1 入口模块

`src/main.js` 在 Vue 挂载前执行：

- 调用 `redirectHttpToHttps()`，让非本地 HTTP 访问跳转到 HTTPS。
- 允许 `/emergency-login` 路径绕过第三方登录检查。
- 当 `VITE_ENABLE_LOGIN_GUARD=true` 时，探测 `VITE_LOGIN_STATUS_PATH`，拿到有效工号后写入 `agent_game_third_party_user_id`。
- 登录守卫失败时，跳转到 `VITE_LOGIN_PAGE_URL`，并把当前地址作为回跳目标。
- 登录守卫关闭时，直接挂载应用。

### 6.2 用户会话

`useUserSession` 负责前端会话启动：

- 从 URL query 或 `agent_game_third_party_user_id` 读取工号。
- 先调用 `GET /api/users/me` 复用已有后端 Cookie。
- 如果没有有效 Cookie，再用解析出的工号调用 `POST /api/users`。
- 后端要求昵称时，展示登记面板。
- 通过 `POST /api/users/emergency-login` 支持应急登录。

前端存储的用户资料只用于展示便利；后端 Cookie 才是真正的会话凭证。

### 6.3 比赛配置和倒计时

`useContestConfig` 调用 `GET /api/contest/config` 并归一化后端字段。`src/config/contestDefaults.js` 只作为本地启动或后端短暂不可用时的兜底。

`useContestClock` 推导三种状态：

- 未开始：显示距离比赛开始的倒计时。
- 进行中：显示距离提交结束的倒计时。
- 已结束：显示结束状态。

前端只负责提示用户，最终能否上传由后端强制判断。

### 6.4 上传

`UploadModal` 把上传状态交给 `usePackageUpload`：

- 前端只做 `.zip` 和文件存在性等轻量校验。
- `commonApi.uploadCode` 提交到 `POST /api/upload/me`。
- 上传超时使用 `VITE_UPLOAD_TIMEOUT_MS`，默认 5 分钟。
- 上传成功展示动画成功状态。
- 后端错误展示在上传框内。

不要把前端冷却判断当成最终规则。需要新鲜拦截结果时，上传点击路径应咨询后端状态或配置。

### 6.5 历史和得分详情

`HistoryPage` 把数据和动作交给 `useSubmissionHistory`：

- 加载 `GET /api/users/me/submissions`。
- 加载 `GET /api/users/me/submissions/summary` 的排队/评测统计。
- 通过 `useIntervalTimer` 自动刷新。
- 只通过 `POST /api/users/me/submissions/{submissionId}/cancel` 取消后端允许取消的排队提交。
- 展示提交 ID、提交时间、分数、token 用量、状态和操作。
- 只有 `score_detail` 和 `question_details` 都有可用后端数据时，才打开得分详情。

`submissionScoreDetails.js` 按题号合并 `score_detail` 和 `question_details`，支持小数分和转义换行。

### 6.6 排行榜

`RankingBoard` 把排行状态交给 `useRankingBoard`：

- 调用 `GET /api/rank/page`。
- 默认每页 20 条，桌面端按左右各 10 条展示。
- 支持昵称搜索、得分/token/提交次数排序、跳页和当前用户排名。
- 调用 `GET /api/rank/me` 获取个人排名。
- 使用请求序列保护，避免旧响应覆盖新的分页、排序或搜索状态。

当后端标记测试账号时，前端展示为官方 Demo 行。

## 7. API 设计

| 前端 API 方法 | HTTP 接口 | 说明 |
| --- | --- | --- |
| `userApi.getUsers()` | `GET /api/users` | 获取公开用户列表，主要用于管理或调试展示 |
| `userApi.getMe()` | `GET /api/users/me` | 获取当前 Cookie 对应用户 |
| `userApi.getSubmissions()` | `GET /api/users/me/submissions` | 获取当前用户历史提交 |
| `userApi.getSubmissionQueueSummary()` | `GET /api/users/me/submissions/summary` | 获取全局排队/评测数量 |
| `userApi.addUser(data)` | `POST /api/users` | 创建或登录普通用户 |
| `userApi.emergencyLogin(data)` | `POST /api/users/emergency-login` | 应急登录白名单入口 |
| `userApi.updateUser(data)` | `PUT /api/users/me` | 更新当前用户，昵称不可随意修改 |
| `userApi.cancelSubmission(id)` | `POST /api/users/me/submissions/{id}/cancel` | 取消排队提交 |
| `rankApi.getRankPage(params)` | `GET /api/rank/page` | 分页排行榜 |
| `rankApi.getUserRank()` | `GET /api/rank/me` | 个人排名 |
| `contestApi.getConfig()` | `GET /api/contest/config` | 比赛元数据和赛程 |
| `commonApi.uploadCode(formData)` | `POST /api/upload/me` | multipart zip 上传 |

标准 JSON 响应：

```json
{"code":0,"message":"success","data":{}}
```

## 8. 数据设计

前端本地存储 key：

| Key | 作用 |
| --- | --- |
| `agent_game_third_party_user_id` | 内部登录引导返回的规范化工号 |
| `agent_game_user` | 展示用的用户资料缓存 |

关键展示字段：

- `SubmissionResponse.id`：历史提交中的提交 ID。
- `SubmissionResponse.status`：由 `submissionDisplay.js` 归一化展示。
- `SubmissionResponse.score`：支持小数的总分。
- `SubmissionResponse.score_detail`：判别器回写的 JSON 数组字符串。
- `SubmissionResponse.question_details`：后端返回的题目元数据。
- `SubmissionResponse.token_usage`：历史和排行榜展示的 token 用量。
- `SubmissionResponse.queue_ahead`：排队提交前方还有多少笔。

普通历史 UI 不得展示服务器文件路径。

## 9. 安全和隐私

- 生产环境非本地 HTTP 访问在应用挂载前跳转 HTTPS。
- 写请求在配置后会携带 `X-Agent-Contest-Write-Key`。
- 当前用户请求头只是低成本一致性检查，不是强鉴权。
- 后端 Cookie 才是有效会话凭证。
- 前端不得暴露原始包路径或分发包路径。
- 应急登录是受后端白名单控制的故障兜底入口。

## 10. 错误处理

错误应展示在最贴近用户操作的位置：

- 上传校验或上传接口错误：展示在 `UploadModal` 内。
- 历史加载失败：展示在历史页面状态区。
- 排行榜加载失败：展示在排行榜状态区。
- 全局会话或操作错误：展示在 `ErrorModal` 或登记面板。

后端已经返回可操作错误信息时，不要替换成泛化文案。

## 11. 扩展指南

适配新比赛时：

- 优先更新后端比赛配置，前端消费配置结果。
- 只在必要时替换 `src/assets/` 下的视觉资源。
- 新展示规则放到 `src/utils/`，不要内联在模板里。
- 新的长生命周期状态放到 `src/composables/`。
- 新后端接口统一封装在 `src/api/index.js`。
- 行为变化时同步更新本文档、图谱和功能测试用例。

## 12. 验证

推荐检查：

```bash
npm run build
npm test -- scripts/frontend-regression.test.mjs
```

涉及以下页面时必须做浏览器视觉检查：

- 登录/登记页。
- 首页标题和赛程区域。
- 上传弹框。
- 历史表格和得分详情弹框。
- 排行榜布局，尤其是窄屏和桌面双列模式。
