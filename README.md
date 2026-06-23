# Agent Game - Agent大赛前端

这是 Agent 大赛的前端项目，基于 Vue 3 + Vite 构建。

## 功能特性

- 比赛信息、赛程和倒计时展示
- 第三方登录接入、昵称登记和应急登录
- 代码 zip 上传、上传状态反馈和后端规则拦截
- 历史提交记录、排队/评测统计、取消排队提交
- 得分详情弹框，展示题目标题、题目详情和每题得分
- 实时排行榜，支持分页、搜索、排序、个人排名和官方 Demo 标记

## 技术栈

- Vue 3 (Composition API)
- Vite
- Axios

## 项目结构

```
agent-game/
├── src/
│   ├── api/              # Axios API 适配层
│   ├── assets/           # 页面视觉资源
│   ├── components/       # 页面和弹框组件
│   ├── composables/      # 登录、上传、历史、排行榜等状态逻辑
│   ├── config/           # 比赛配置兜底值
│   ├── utils/            # 字段归一化、展示文案、得分解析等纯逻辑
│   ├── App.vue           # 主应用壳和视图切换
│   └── main.js           # HTTPS 跳转、登录守卫和 Vue 挂载
├── docs/                 # SDD、测试用例、架构图
├── index.html
└── vite.config.js
```

## 配置

在 `.env` 或 `.env.local` 文件中配置后端 API 地址：

```
VITE_API_BASE_URL=http://localhost:8080
```

可选配置：

```
VITE_WRITE_API_KEY=your_write_key
VITE_UPLOAD_TIMEOUT_MS=300000
```

## 新比赛快速适配

更换为一场新比赛时，前端通常只需要调整以下内容：

1. **比赛文案和时间**
   - 优先由后端 `GET /api/contest/config` 返回比赛名称、副标题、赛制、赛题名称、赛题说明、赛程文案、开始时间和结束时间。
   - `src/config/contestDefaults.js` 只是前端兜底默认值；如果后端配置正常，生产展示以后端返回为准。

2. **视觉和静态资源**
   - 修改首页主视觉、背景图、品牌色、排行榜和历史页样式时，主要关注 `src/App.vue`、`src/components/RankingBoard.vue`、`src/components/HistoryPage.vue`、`src/components/UploadModal.vue`。
   - 如需替换图片资源，放在 `src/assets/`，并确认移动端和桌面端都不遮挡核心信息。

3. **接口和部署地址**
   - 修改 `.env.production` 或构建环境中的 `VITE_API_BASE_URL` 指向新后端。
   - 如果后端开启写接口密钥，需要同步设置 `VITE_WRITE_API_KEY`。
   - 大文件上传耗时较长时，按比赛包大小调整 `VITE_UPLOAD_TIMEOUT_MS`。

4. **登录接入**
   - 普通内网登录只需要保证第三方登录模块最终写入当前用户身份信息，并让前端调用后端用户接口完成登录态建立。
   - 如果内部登录系统故障，可使用应急登录页 `/emergency-login`，但对应账号必须由后端数据库 `emergency_login_accounts` 控制。

5. **交互回归**
   - 新比赛上线前至少验证：首页赛程倒计时、上传限制提示、上传成功/失败反馈、历史提交、得分详情、取消排队、排行榜分页/搜索/排序、移动端布局。
   - 可参考 `docs/core-functional-test-cases.md` 和 `docs/frontend-test-cases.md` 做回归。

## 代码智能体开发约束

如果使用代码智能体继续开发本前端项目，请遵循以下模式：

1. **先读上下文再改代码**
   - 先阅读本 README、`PROJECT_CONTEXT_FRONTEND.md`、`docs/software-design-document.md`、`docs/core-functional-test-cases.md`。
   - 修改页面前，先读目标组件、对应 composable、相关 utils 和 API 封装，不要凭记忆猜接口字段。

2. **页面组件只负责展示**
   - 页面组件负责布局和交互绑定。
   - 请求、轮询、取消、上传、登录态等状态逻辑放到 `src/composables/`。
   - 状态文案、得分解析、排行榜展示、用户信息、上传限制等纯逻辑放到 `src/utils/`。
   - 接口路径、请求头、超时和写密钥统一放到 `src/api/index.js` 与 `src/utils/apiConfig.js`。

3. **比赛信息以后端配置为准**
   - 比赛标题、赛题、赛程、开始/结束时间优先来自 `GET /api/contest/config`。
   - `src/config/contestDefaults.js` 只能作为兜底，不要把新比赛的生产逻辑只写死在前端。

4. **不要引入生产 mock**
   - 本地调试可以临时 mock，但提交前必须移除。
   - 如果数据库没有数据，前端应展示空状态或后端真实返回，不要自动造假数据。

5. **复用现有交互模式**
   - 上传逻辑走 `usePackageUpload`。
   - 历史提交、取消、得分详情走 `useSubmissionHistory`。
   - 排行榜分页、搜索、排序走 `useRankingBoard`。
   - 定时刷新统一使用 `useIntervalTimer`，避免重复轮询和翻页后自动跳页。

6. **UI 修改必须验证**
   - 修改首页、登录、上传、历史、排行榜后，需要在浏览器里检查桌面和移动端尺寸。
   - 特别检查：表格列宽、按钮遮挡、弹框滚动、长文本换行、上传错误提示、排行榜分页。

7. **改完必须跑基础校验**
   - 至少执行 `npm run build`。
   - 涉及交互逻辑时执行 `npm test -- scripts/frontend-regression.test.mjs`。
   - 如果只改 README，可以不跑构建，但最终回复里要明确说明。

8. **Markdown 文档使用中文**
   - 项目自有 `.md` 文档正文必须使用中文。
   - 技术标识符、接口路径、环境变量、命令和代码块可以保留原文。

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 设计与测试文档

- [前端软件设计文档 SDD](docs/software-design-document.md)：前端架构、模块边界、接口契约、状态流、扩展点和 Agent 开发约束。
- [前后端核心功能测试用例](docs/core-functional-test-cases.md)：按 L0/L1/L2 分层覆盖登录、上传、历史提交、得分详情、排行榜、日志下载和部署运维。
- [前端交互测试脑图](docs/frontend-test-cases.md)：按页面和交互路径组织的前端手工回归用例。
- [架构图/流程图/时序图](docs/diagrams/)：系统架构、前后端模块、上传、登录、评测、日志下载等关键图。

## API 对接

项目已对接以下后端 API：

### 用户接口
- `GET /api/users` - 获取所有用户
- `GET /api/users/me` - 获取当前登录用户
- `GET /api/users/me/submissions` - 获取当前用户历史提交
- `GET /api/users/me/submissions/summary` - 获取排队/评测统计
- `POST /api/users` - 创建或登录用户
- `POST /api/users/emergency-login` - 应急登录
- `PUT /api/users/me` - 更新当前用户
- `DELETE /api/users/me` - 删除当前用户
- `POST /api/users/me/submissions/{submissionId}/cancel` - 取消排队提交

### 排行榜接口
- `GET /api/rank` - 获取排行榜列表
- `GET /api/rank/page` - 获取分页排行榜
- `GET /api/rank/me` - 获取当前用户排名

### 比赛与上传接口
- `GET /api/contest/config` - 获取比赛配置
- `POST /api/upload/me` - 上传当前用户 zip 包
