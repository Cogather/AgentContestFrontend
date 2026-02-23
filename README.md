# Agent Game - Agent大赛前端

这是 Agent 大赛的前端项目，基于 Vue 3 + Vite 构建。

## 功能特性

- 参赛题目展示
- 个人参赛配置（姓名、工号、Agent名称、IP地址、端口）
- 开始判题功能
- 提交历史记录
- 实时排行榜（分页展示、个人积分展示）

## 技术栈

- Vue 3 (Composition API)
- Vite
- Axios

## 项目结构

```
agent-game/
├── src/
│   ├── api/           # API 服务层
│   ├── components/    # Vue 组件
│   │   ├── UserConfigModal.vue    # 用户配置弹窗
│   │   ├── ConfirmModal.vue       # 确认提交弹窗
│   │   ├── HistoryModal.vue       # 历史记录弹窗
│   │   └── RankingBoard.vue       # 排行榜组件
│   ├── App.vue         # 主应用组件
│   ├── main.js         # 入口文件
│   └── style.css       # 全局样式
├── index.html
└── vite.config.js
```

## 配置

在 `.env` 或 `.env.local` 文件中配置后端 API 地址：

```
VITE_API_BASE_URL=http://localhost:8080
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## API 对接

项目已对接以下后端 API：

### 用户接口
- `GET /api/users` - 获取所有用户
- `GET /api/users/{user_id}` - 获取单个用户
- `POST /api/users` - 添加用户
- `PUT /api/users/{user_id}` - 更新用户

### 排行榜接口
- `GET /api/rank` - 获取排行榜列表
- `GET /api/rank/{user_id}` - 获取单个用户排名
