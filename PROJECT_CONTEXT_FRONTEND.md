# AgentContest Frontend Context

> 本文件用于在新对话中快速恢复前端上下文。详细设计以
> `docs/software-design-document.md` 为准；本文件只保留高信号索引和当前事实。

## 1. Project Snapshot

- Repository: `/Users/wangminghai/projects/AgentContestAll/AgentContest`
- Stack: Vue 3 + Vite + Axios
- Dev URL: `http://localhost:5173/`
- Backend base URL: `VITE_API_BASE_URL`
- Main SDD: `docs/software-design-document.md`
- Diagrams: `docs/diagrams/`
- Functional tests: `docs/core-functional-test-cases.md`
- Frontend interaction test map: `docs/frontend-test-cases.md`

## 2. Current Architecture

The frontend follows a component + composable + utils split:

- `src/main.js`: HTTPS redirect, optional third-party login guard, emergency
  login path bypass, Vue mount.
- `src/App.vue`: page shell, modal routing, current view state.
- `src/api/index.js`: Axios adapter, base URL, write key, current user id
  header, upload timeout.
- `src/composables/`: session, contest config, countdown, upload, history,
  ranking, transient values, interval timers.
- `src/components/`: visual rendering and event binding.
- `src/utils/`: field normalization, display text, score detail parsing,
  upload file rules, ranking display, user storage.

Design rule: page components should stay visual. Request state, polling,
normalization, cancellation, and scoring logic belong in composables or utils.

## 3. Current API Contract

Current frontend-facing endpoints:

| API method | HTTP endpoint | Purpose |
| --- | --- | --- |
| `userApi.getUsers()` | `GET /api/users` | Public user list |
| `userApi.getMe()` | `GET /api/users/me` | Current cookie-backed user |
| `userApi.getSubmissions()` | `GET /api/users/me/submissions` | Current user history |
| `userApi.getSubmissionQueueSummary()` | `GET /api/users/me/submissions/summary` | Queue/evaluating counts |
| `userApi.addUser(data)` | `POST /api/users` | Normal create/login |
| `userApi.emergencyLogin(data)` | `POST /api/users/emergency-login` | Emergency login |
| `userApi.updateUser(data)` | `PUT /api/users/me` | Current user update |
| `userApi.cancelSubmission(id)` | `POST /api/users/me/submissions/{id}/cancel` | Cancel queued submission |
| `rankApi.getRankPage(params)` | `GET /api/rank/page` | Paginated ranking |
| `rankApi.getUserRank()` | `GET /api/rank/me` | Current user rank |
| `contestApi.getConfig()` | `GET /api/contest/config` | Contest metadata |
| `commonApi.uploadCode(formData)` | `POST /api/upload/me` | Multipart zip upload |

All normal JSON responses use:

```json
{"code":0,"message":"success","data":{}}
```

## 4. Session and Login

- Browser-local `agent_game_third_party_user_id` stores the normalized work id
  returned by the internal login bootstrap.
- Browser-local `agent_game_user` stores display profile only; it is not the
  source of truth.
- Backend signed cookie is the effective session proof.
- Startup flow calls `GET /api/users/me` first; if no valid cookie exists,
  frontend calls `POST /api/users`.
- New users must enter nickname. Existing users do not need to remember or
  re-enter nickname.
- `/emergency-login` calls `POST /api/users/emergency-login`; backend database
  whitelist controls who may use it.

## 5. Contest and Upload

- Contest title, challenge text, schedule text, start time, end time, and time
  zone come from `GET /api/contest/config`.
- `src/config/contestDefaults.js` is only a fallback.
- `VITE_WRITE_API_KEY` is attached to write requests when configured.
- `VITE_UPLOAD_TIMEOUT_MS` controls multipart upload timeout; default is 5
  minutes.
- Upload UI uses `UploadModal` + `usePackageUpload`.
- Backend is authoritative for contest window, cooldown, zip validation,
  `start.sh` validation, mounted distribution, and final status.

## 6. History, Score Detail, Ranking

- History UI uses `HistoryPage` + `useSubmissionHistory`.
- History displays submission id, created time, score, token usage, status,
  queue-ahead text, and cancel action for queued submissions.
- Only `UPLOADED` submissions can be canceled.
- Score detail comes from backend `score_detail` and `question_details`; no
  frontend production mock data is allowed.
- `score_detail` supports decimal scores.
- Escaped `\n` or `/n` in question detail text should render as line breaks.
- Ranking UI uses `RankingBoard` + `useRankingBoard`.
- Ranking default page size is 20, rendered as two 10-row columns on desktop.
- Ranking supports search, sort, jump page, personal rank, official demo label,
  and request sequence guards.

## 7. Visual Direction

The current visual language is enterprise technology:

- Clean white/light-gray/light-blue background.
- Black/gray data area with restrained deep-red highlights.
- Abstract connection/data-flow motifs are acceptable.
- Do not use Huawei/华为 names, logos, petal marks, official assets, or
  trademark elements.
- Do not use robot cartoons or neon nightclub styling.

## 8. Agent Development Rules

When an AI agent edits frontend code:

- Read `README.md` and `docs/software-design-document.md` first.
- Read the target component, related composable, related utils, and API wrapper
  before editing.
- Do not reintroduce local production mock ranking, score, question, or user
  data.
- Do not hard-code new contest data in components; use backend config or
  fallback config.
- Run `npm run build` for frontend code changes.
- Run `npm test -- scripts/frontend-regression.test.mjs` for interaction logic
  changes.
- Browser-check desktop and mobile layouts for UI changes.

