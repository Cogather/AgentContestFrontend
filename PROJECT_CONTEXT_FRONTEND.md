# AgentContest Frontend Context

> 从根目录 `PROJECT_CONTEXT.md` 拆分复制而来。源文件不应因本文件而改动。本文件用于在新对话中快速恢复前端上下文。

## 1. 项目概览

- 仓库路径：`/Users/wangminghai/projects/AgentContestAll/AgentContest`
- 技术栈：Vue 3 + Vite + Axios
- 当前开发地址通常为：`http://localhost:5173/`
- 后端默认地址通过 `VITE_API_BASE_URL` 配置，开发时常用 `http://localhost:8080`
- 当前产品：西研软件大赛个人赛前端，包含第三方工号识别、昵称注册、赛程倒计时、代码 zip 上传、10 分钟上传间隔、历史提交、实时排行榜。

## 2. 运行与校验

```bash
cd /Users/wangminghai/projects/AgentContestAll/AgentContest
npm run dev -- --host 0.0.0.0
npm run build
```

常用环境变量：

- `VITE_API_BASE_URL`：API 基地址，默认空字符串
- `VITE_COMPETITION_START_AT`：默认 `2026-05-24T08:00:00-07:00`
- `VITE_COMPETITION_END_AT`：默认 `2026-06-15T00:00:00-07:00`
- `VITE_COMPETITION_SCHEDULE_TEXT`：默认 `2026/5/24 8:00--2026/6/14`
- `VITE_UPLOAD_TIMEOUT_MS`：上传接口超时，默认 `300000` 毫秒
- `VITE_WRITE_API_KEY`：可选写接口 key；非空时前端会给 `POST/PUT/PATCH/DELETE` 带 `X-Agent-Contest-Write-Key`
- `VITE_LOGIN_STATUS_PATH`、`VITE_LOGIN_PAGE_URL`、`VITE_ENABLE_LOGIN_GUARD`：第三方登录守卫相关；守卫默认关闭，设置 `VITE_ENABLE_LOGIN_GUARD=true` 后才会先校验第三方登录状态。

## 3. 前端 API 层

文件：`src/api/index.js`

- Axios 实例会动态读取 `VITE_API_BASE_URL`
- 普通接口默认 10 秒超时；上传接口默认 5 分钟超时，可用 `VITE_UPLOAD_TIMEOUT_MS` 覆盖
- 若 `VITE_WRITE_API_KEY` 非空，所有写请求会自动带 `X-Agent-Contest-Write-Key`，用于配合后端 `APP_WRITE_API_KEY`
- response interceptor 直接返回 `response.data`
- 导出 `userApi`、`rankApi`、`commonApi`

接口调用：

| API 方法 | HTTP 接口 | 用途 |
|---|---|---|
| `userApi.getUsers()` | `GET /api/users` | 获取全部用户 |
| `userApi.getUser(userId)` | `GET /api/users/{userId}` | 初始化当前用户 |
| `userApi.getSubmissions(userId)` | `GET /api/users/{userId}/submissions` | 历史提交、上传冷却计算 |
| `userApi.addUser(data)` | `POST /api/users` | 登录页创建昵称 |
| `userApi.updateUser(userId, data)` | `PUT /api/users/{userId}` | 旧配置流保留 |
| `userApi.deleteUser(userId)` | `DELETE /api/users/{userId}` | 管理/测试用途 |
| `rankApi.getRankList(limit)` | `GET /api/rank` | 简单榜单 |
| `rankApi.getRankPage(params)` | `GET /api/rank/page` | 分页榜单 |
| `rankApi.getUserRank(userId)` | `GET /api/rank/{userId}` | 当前用户排名 |
| `commonApi.uploadCode(userId, formData)` | `POST /api/upload/{userId}` | 上传 zip |

后端响应结构：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

历史提交响应中的 `score_detail` 为判别器回写的 JSON 数组字符串，格式为：

```json
[{"question":1,"score":8,"total":10}]
```

题目标题和详情来自后端历史接口返回的 `question_details`；前端不再在数据库缺数据时使用本地写死题目或分数兜底。

## 4. `App.vue` 主流程

核心状态：

- `currentUser`：当前参赛用户
- `sessionReady`：初始化完成后才渲染页面
- `showUploadModal`：上传弹窗
- `showHistoryPage`：历史提交整页
- `registerForm`：未注册用户的工号和昵称
- `uploadCooldownEndsAt`、`cooldownTick`：30 分钟上传冷却计时
- `isUploadCooldownLoading`：进入主页后异步同步历史提交冷却状态，避免初始化被历史接口拖住

初始化流程：

1. 从 URL query 或 localStorage 解析第三方工号，只接受 8 位数字。
2. 调用 `GET /api/users/{userId}`。
3. 用户存在则先进入主页，再异步加载历史提交以计算上传冷却；冷却同步期间上传按钮临时不可点。
4. 用户不存在则展示登录页，要求输入昵称。
5. mock 登录按钮和 dev 默认 mock 工号已移除，不要恢复，除非用户明确要求临时调试。

登录页：

- 左侧企业科技风标题和赛程块，右侧为参赛登录表单
- 工号只读，显示“等待第三方登录返回工号”
- 昵称必填，提交后 `POST /api/users`

主页：

- Hero：标题“西研软件大赛”、副标题、个人赛标签、赛程/倒计时视觉块
- 内容区：左侧参赛题目，右侧参赛信息，两张卡保持同高同基线
- 参赛信息：当前参赛人、工号、上传代码按钮、历史上传记录按钮
- 排行榜：独立 `RankingBoard` 组件

## 5. 赛程与上传限制

默认赛程文案：`2026/5/24 8:00--2026/6/14`，实际结束时间为 `2026-06-15T00:00:00-07:00`。

倒计时显示逻辑：

- 比赛未开始：`距离个人赛正式开始：` + 开始倒计时
- 比赛进行中：`距离个人赛提交结束：` + 结束倒计时
- 比赛已结束：只显示 `已结束`

上传按钮逻辑：

- 未开始：`未到参赛时间，无法提交`，不可点
- 已结束：`个人赛已结束`，不可点
- 冷却状态加载中：`提交状态加载中`，不可点
- 30 分钟冷却中：`MM:SS 后可上传`，不可点
- 正常：`上传代码`，打开 `UploadModal`

注意：比赛开始/结束、30 分钟间隔和 zip 校验现在前后端都有约束。前端负责即时交互提示，后端负责最终强制拦截，避免绕过页面直接调用上传接口。

## 6. 组件设计

### `components/UploadModal.vue`

- 支持点击和拖拽选择 `.zip`
- 前端只按文件名后缀校验 `.zip`
- 选中文件后展示文件名和大小，点击可重新选择
- 调用 `POST /api/upload/{userId}`，成功后 emit `success`
- 父组件成功后关闭弹窗、设置本地 30 分钟冷却、刷新排行榜
- 上传中禁止关闭、重新选择和重复提交；`confirmUpload` 内部也有 `uploading` 并发闸门

### `components/HistoryPage.vue`

- 整页历史提交记录，替代旧 `HistoryModal`
- 列：提交时间、总得分、总 token 消耗、当前状态
- 支持刷新、得分详情弹窗
- 得分详情弹框不再展示“参赛题目”摘要卡片
- 弹框顶部展示总得分、提交时间、Token 消耗、状态
- 桌面弹框约 960px，主体为左侧题目目录、右侧题目详情阅读区
- 左侧按题目 1-10 展示标题和 `得分 / 总分`，点击切换右侧详情
- 桌面 1280x720 下左侧 10 道题应完整可见；目录题目项预留两行标题空间
- 右侧展示当前题目的标题、得分和约 2000 字题目详情，正文区独立滚动
- 移动端改为顶部横向题目目录 + 下方详情阅读区
- 只有 `COMPLETED`、有总分、且 `score_detail` 与 `question_details` 都包含 10 道有效数据的提交展示“得分详情”；未完成/失败/明细缺失提交展示“待评测”“无得分”或“暂无明细”
- 前端不再使用本地写死的 10 题分数、题目标题或题目详情兜底
- 失败状态点击后用 toast 显示失败原因

### `components/RankingBoard.vue`

- 每 5 秒轮询 `/api/rank/page`
- 支持昵称搜索、得分升降序、分页、跳页、每页 10/20/50/100
- 表格列：排名、昵称、得分、提交次数、Token 消耗；`submission_count` 兼容后端 snake_case
- 顶部展示参赛人数和最高得分
- 当前用户排名调用 `/api/rank/{userId}`，卡片展示我的排名、我的得分、Token 消耗、提交次数；失败时显示空排名
- 后端不可用且列表为空时显示“排行榜加载失败，请稍后重试”，不再生成随机假榜单
- 排名 1/2/3 使用不同深浅红色标注
- 420px 以下使用更紧凑的 5 列布局，避免 320px 宽度裁切

### `components/IconSymbol.vue`

- 本地 SVG icon 集合：`network`、`user`、`guide`、`history`、`upload`、`file`、`trophy`、`users`、`score`、`detail`、`arrow-left` 等
- `play` 图标已随 mock 登录按钮移除

### 遗留组件

- `UserConfigModal.vue`、`ConfirmModal.vue`、`HistoryModal.vue`
- 当前 `App.vue` 不再导入使用
- 保留在仓库中，属于旧流程遗留，不代表当前页面行为

## 7. 视觉和交互约束

当前视觉方向：

- 参考大型企业科技官网的“高端、正式、干净、蓝白光感、红色点缀”语言
- 不允许使用 Huawei/华为/Logo/花瓣图形/官方素材/商标元素
- 主背景白、浅灰、浅蓝；上方可有红色强调；数据区以黑灰为主，红色只作 CTA 和关键数字点缀
- 不使用机器人卡通、夜店霓虹风
- 控制性能：已弱化大面积 `backdrop-filter`、重阴影、动画光带；滚动卡顿做过优化
- 生产 Nginx 配置对 `/api/` 上传代理设置了 300 秒读写超时，并关闭请求缓冲，降低大包或 SFTP 慢时的网络误报概率

当前重要 UI 调整：

- Hero 右侧为赛程与倒计时，不是厚重卡片
- 登录页和历史页已同步到主页的企业科技风
- 首页上方两张卡片“参赛题目”和“参赛信息”已统一高度与顶部对齐
- 历史上传记录按钮曾被遮挡，已通过用户卡高度/布局修正
- 排行榜昵称列曾过宽，已调整表格列比例；前三名红色分级
- 320px 极窄屏排行榜已增加紧凑列布局；得分详情目录已调整为 10 题完整可见

## 8. 最近关键改动

- 整体视觉改为企业级红白黑/浅蓝光感风格，减少 AI 感和过度蓝色元素
- 赛程改为 `2026/5/24 8:00--2026/6/14`
- 增加比赛阶段倒计时：未开始显示距离开始，进行中显示距离结束，结束后显示已结束
- 增加上传可用状态：未开始、已结束、30 分钟冷却均禁用上传
- 历史记录改为独立页面
- 历史记录得分详情改为左侧题目目录 + 右侧题目详情阅读区，展示数据完全来自后端 `score_detail` 和 `question_details`
- 已修复：初始化不再等待历史提交冷却接口；上传弹框防重复提交；极窄屏排行榜裁切；得分详情目录底部裁切
- 已修复：上传接口前端超时从普通 10 秒提升为默认 5 分钟；生产 Nginx `/api/` 补充上传代理超时
- 已修复：前端生产依赖高危 audit，`axios` 锁定升级到 `1.16.1`
- mock 登录预览按钮和 dev 默认 mock 工号已移除
- 前端改动 patch 文件已在仓库中：`AgentContest-frontend-changes.patch`

## 9. 注意事项

- “平台操作指导”入口已移除；如需恢复，需要重新确认真实文档地址和视觉位置。
- 根目录 `PROJECT_CONTEXT.md` 是总文档，不属于本前端 git 仓库。
- 本文件只描述前端；后端上下文见后端仓库的 `PROJECT_CONTEXT_BACKEND.md`。
