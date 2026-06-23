# AgentContest 前端上下文

> 本文件用于在新对话中快速恢复前端上下文。详细设计以
> `docs/software-design-document.md` 为准；本文件只保留高信号索引和当前事实。

## 1. 项目快照

- 仓库：`/Users/wangminghai/projects/AgentContestAll/AgentContest`
- 技术栈：Vue 3 + Vite + Axios
- 开发地址：`http://localhost:5173/`
- 后端 API 基地址：`VITE_API_BASE_URL`
- 主 SDD：`docs/software-design-document.md`
- 图谱目录：`docs/diagrams/`
- 核心功能测试用例：`docs/core-functional-test-cases.md`
- 前端交互测试脑图：`docs/frontend-test-cases.md`
- 项目级约束：`AGENTS.md`

## 2. 当前架构

前端采用组件 + composable + utils 的结构：

- `src/main.js`：HTTPS 跳转、可选第三方登录守卫、应急登录路径绕过、Vue 挂载。
- `src/App.vue`：应用壳、弹框路由、当前视图状态。
- `src/api/index.js`：Axios 适配、API 基地址、写接口 key、当前用户请求头、上传超时。
- `src/composables/`：登录态、比赛配置、倒计时、上传、历史、排行榜、临时值、定时器。
- `src/components/`：页面展示和事件绑定。
- `src/utils/`：字段归一化、展示文案、得分详情解析、上传文件规则、排行榜展示、用户存储。

设计规则：页面组件应保持展示职责。请求状态、轮询、字段归一化、取消、得分解析等逻辑应放在 composable 或 utils 中。

## 3. 当前 API 契约

前端当前使用的接口：

| API 方法 | HTTP 接口 | 用途 |
| --- | --- | --- |
| `userApi.getUsers()` | `GET /api/users` | 公开用户列表 |
| `userApi.getMe()` | `GET /api/users/me` | 当前 Cookie 对应用户 |
| `userApi.getSubmissions()` | `GET /api/users/me/submissions` | 当前用户历史提交 |
| `userApi.getSubmissionQueueSummary()` | `GET /api/users/me/submissions/summary` | 排队/评测数量 |
| `userApi.addUser(data)` | `POST /api/users` | 普通创建/登录 |
| `userApi.emergencyLogin(data)` | `POST /api/users/emergency-login` | 应急登录 |
| `userApi.updateUser(data)` | `PUT /api/users/me` | 更新当前用户 |
| `userApi.cancelSubmission(id)` | `POST /api/users/me/submissions/{id}/cancel` | 取消排队提交 |
| `rankApi.getRankPage(params)` | `GET /api/rank/page` | 分页排行榜 |
| `rankApi.getUserRank()` | `GET /api/rank/me` | 当前用户排名 |
| `contestApi.getConfig()` | `GET /api/contest/config` | 比赛元数据 |
| `commonApi.uploadCode(formData)` | `POST /api/upload/me` | multipart zip 上传 |

标准响应结构：

```json
{"code":0,"message":"success","data":{}}
```

## 4. 会话和登录

- `agent_game_third_party_user_id` 保存内部登录引导返回的规范化工号。
- `agent_game_user` 只保存展示用用户资料，不是可信身份来源。
- 后端 signed cookie 才是有效会话凭证。
- 应用启动先调用 `GET /api/users/me`；如果 Cookie 无效，再调用 `POST /api/users`。
- 新用户需要填写昵称；老用户不需要记住或重新输入昵称。
- `/emergency-login` 调用 `POST /api/users/emergency-login`，可用账号由后端数据库白名单控制。

## 5. 比赛和上传

- 比赛标题、赛题、赛程文案、开始时间、结束时间和时区来自 `GET /api/contest/config`。
- `src/config/contestDefaults.js` 只作为兜底。
- 配置 `VITE_WRITE_API_KEY` 后，写请求会附带写接口 key。
- `VITE_UPLOAD_TIMEOUT_MS` 控制 multipart 上传超时，默认 5 分钟。
- 上传 UI 使用 `UploadModal` + `usePackageUpload`。
- 比赛时间窗口、上传间隔、zip 校验、`start.sh` 校验、挂载目录分发和最终状态都以后端为准。

## 6. 历史、得分详情和排行榜

- 历史 UI 使用 `HistoryPage` + `useSubmissionHistory`。
- 历史记录展示提交 ID、创建时间、分数、token 用量、状态、排队前方数量和取消操作。
- 只有 `UPLOADED` 提交可以取消。
- 得分详情来自后端 `score_detail` 和 `question_details`；生产代码不允许本地 mock。
- `score_detail` 支持小数分。
- 题目详情中的转义 `\n` 或 `/n` 应按换行展示。
- 排行榜 UI 使用 `RankingBoard` + `useRankingBoard`。
- 排行榜默认每页 20 条，桌面端左右各 10 条。
- 排行榜支持搜索、排序、跳页、个人排名、官方 Demo 标记和请求序列保护。

## 7. 视觉方向

当前视觉语言是企业级科技风：

- 白色、浅灰、浅蓝为主背景。
- 数据区域以黑灰为主，深红色做克制点缀。
- 可以使用抽象连接、数据流、节点网络等科技视觉。
- 不得使用 Huawei、华为、Logo、花瓣图形、官方素材或商标元素。
- 不使用机器人卡通或夜店霓虹风。

## 8. 代码智能体开发规则

代码智能体修改前端代码时：

- 先阅读 `AGENTS.md`、`README.md` 和 `docs/software-design-document.md`。
- 修改前读取目标组件、相关 composable、相关 utils 和 API 封装。
- 不要重新引入本地生产 mock 榜单、分数、题目或用户。
- 不要把新比赛生产数据硬编码在组件里，应使用后端配置或兜底配置。
- 前端代码改动后运行 `npm run build`。
- 交互逻辑改动后运行 `npm test -- scripts/frontend-regression.test.mjs`。
- UI 改动后检查桌面和移动端布局。
