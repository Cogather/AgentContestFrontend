# AgentContest 前端代码智能体约束

本文件是前端仓库的项目级约束。任何 Code Agent 进入本仓库后，应先阅读本文件，再阅读 README 和相关设计文档。

## 1. 项目定位

- 仓库：`/Users/wangminghai/projects/AgentContestAll/AgentContest`
- 技术栈：Vue 3 + Vite + Axios
- 运行命令：`npm run dev`
- 构建命令：`npm run build`
- 交互回归：`npm test -- scripts/frontend-regression.test.mjs`
- 主设计文档：`docs/software-design-document.md`
- 项目上下文索引：`PROJECT_CONTEXT_FRONTEND.md`

这是 Agent 大赛前端，负责比赛展示、登录接入、上传入口、历史提交、得分详情、排行榜和应急登录。后端才是身份、上传、赛程、冷却、排名、得分和状态流转的最终权威。

## 2. 修改前必须读取

改代码前按需读取：

1. `README.md`
2. `PROJECT_CONTEXT_FRONTEND.md`
3. `docs/software-design-document.md`
4. 目标组件
5. 目标 composable
6. 相关 `src/utils/` 文件
7. `src/api/index.js`
8. 相关测试文件

不要凭记忆猜接口路径、字段名、状态名或页面行为。

## 3. 架构边界

- 页面组件负责展示、布局和事件绑定。
- 请求、轮询、上传、取消、登录态、历史、排行榜状态放到 `src/composables/`。
- 字段归一化、状态文案、分数格式化、得分详情解析、上传文件规则放到 `src/utils/`。
- 接口路径、请求头、超时、写接口 key 统一放到 `src/api/index.js` 和相关 API config 工具。
- 新增能力时优先复用现有 composable/utils，不要把业务逻辑直接堆进模板。

## 4. 接口和身份约束

- 当前用户相关接口必须优先使用 `/me`：
  - `GET /api/users/me`
  - `GET /api/users/me/submissions`
  - `GET /api/users/me/submissions/summary`
  - `POST /api/upload/me`
  - `GET /api/rank/me`
- 不要重新引入旧的 `/api/users/{userId}`、`/api/upload/{userId}`、`/api/rank/{userId}` 私有数据访问模式。
- `localStorage` 只用于登录引导和展示缓存，不是可信身份来源。
- 后端 signed cookie 才是当前用户身份凭证。
- 写接口 key 如有配置，必须通过现有 API 层自动附加，不要在组件里手写请求头。

## 5. 数据和配置约束

- 比赛标题、赛题、赛程、开始/结束时间优先来自 `GET /api/contest/config`。
- `src/config/contestDefaults.js` 只能作为兜底，不要把新比赛的生产逻辑只写死在前端。
- 生产代码不得引入本地假榜单、假得分、假题目、假用户。
- 后端没有数据时展示空状态或不可用状态，不要自动造数据。
- 历史提交不得展示 `stored_file_path`、`original_file_path` 等服务器路径。
- `score_detail` 支持小数；题目详情中的 `\n` 或 `/n` 要按换行展示。

## 6. UI 和交互约束

- 当前视觉方向是企业级科技风：干净、正式、白/灰/浅蓝底、黑灰数据区、深红点缀。
- 不得使用 Huawei、华为、Logo、花瓣图形、官方素材或任何商标元素。
- 不要使用机器人卡通、夜店霓虹、大面积花哨渐变。
- UI 改动必须检查桌面和移动端，重点看表格列宽、按钮遮挡、弹框滚动、长文本换行、排行榜分页。
- 前端错误应显示在用户正在操作的位置；上传错误显示在上传框内，不要退回原生 alert。
- 排行榜分页、搜索、排序、自动刷新必须避免旧请求覆盖新状态。

## 7. 上传和历史约束

- 前端只做轻量校验，例如是否选择 zip；最终校验由后端完成。
- 上传状态、赛程窗口、上传间隔、夜间放开、测试账号绕过等以后端返回为准。
- 上传成功后刷新历史、排行榜和队列状态。
- 只有后端允许取消的 `UPLOADED` 提交可以显示取消按钮。
- `EVALUATING`、`COMPLETED`、`FAILED`、`CANCELED` 不允许取消。

## 8. 禁止事项

- 不要恢复旧的 mock 登录按钮。
- 不要恢复身份确认页或老用户确认页，除非用户明确要求。
- 不要绕过 `src/api/index.js` 直接在组件里拼接重复请求逻辑。
- 不要把生产配置、密钥、真实域名硬编码在组件里。
- 不要新增英文正文 Markdown；项目自有 `.md` 文档必须使用中文，技术标识符、接口路径和命令除外。
- 不要改动用户未要求的 patch 文件或无关脏文件。
- 不要为了修 UI 大面积重构业务逻辑。

## 9. 验证要求

- 只改文档：可不跑构建，但最终说明。
- 改前端代码：至少运行 `npm run build`。
- 改交互逻辑：运行 `npm test -- scripts/frontend-regression.test.mjs`。
- 改 UI：用浏览器检查桌面和移动端。
- 改 API 契约：同步更新 README、SDD、上下文文件和测试用例。

## 10. 遇到不确定时

如果需求和现有 SDD、README 或代码冲突，不要静默猜测。先说明冲突点，给出建议方案，再继续执行。
