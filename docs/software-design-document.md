# AgentContest Frontend Software Design Document

## 1. Document Control

| Item | Value |
| --- | --- |
| System | AgentContest Frontend |
| Repository | `AgentContest` |
| Runtime | Vue 3, Vite, Axios |
| Primary Audience | Human developers and AI coding agents |
| Status | Living design document |

## 2. Purpose

This document describes the frontend design of the AgentContest platform. It is
intended to help future developers or AI agents safely adapt the frontend for a
new contest without rediscovering session, upload, ranking, history, and score
detail behavior from source code alone.

The frontend is responsible for:

- Rendering contest information, schedule, countdown, upload entry, history,
  score details, and ranking.
- Coordinating with third-party login or emergency login.
- Calling backend `/me` APIs with cookies, write API keys, and current user id
  headers.
- Presenting backend validation errors clearly without inventing local mock
  data.

The backend remains the authority for identity, upload acceptance, contest
window, cooldown, score detail data, ranking data, and status transitions.

## 3. Design Goals

- **Config-first contest reuse**: contest name, challenge text, schedule, and
  time windows should come from `GET /api/contest/config` whenever possible.
- **Low-intrusion feature changes**: page components should stay visual; API,
  state transitions, and display parsing should live in composables and utils.
- **Production-safe data display**: frontend must not fabricate leaderboard,
  score, question, or history data when backend data is missing.
- **Recoverable deployment**: environment variables must control API base URL,
  write key, upload timeout, and optional login guard behavior.
- **Human-friendly operations**: upload progress, failure messages, queue
  status, cancellation, and history refresh should be visible and predictable.

## 4. System Context

```text
Browser
  -> main.js
  -> App.vue
  -> composables
  -> api/index.js
  -> AgentContest backend
  -> MySQL / mounted package dirs / evaluator
```

External actors:

- **Participant**: opens the contest page, registers nickname, uploads zip,
  views history and ranking.
- **Internal login system**: optionally provides the work id and writes it into
  frontend storage before the app initializes.
- **Backend service**: signs user session cookies, enforces upload rules, and
  returns contest/ranking/history data.

## 5. High-Level Architecture

The frontend uses a layered Vue architecture:

| Layer | Files | Responsibility |
| --- | --- | --- |
| Entrypoint | `src/main.js` | HTTPS redirect, optional third-party login guard, app mount |
| Shell | `src/App.vue` | Page shell, modal routing, current view selection |
| API adapter | `src/api/index.js` | Axios instance, base URL, write key, current user id header, upload timeout |
| App composables | `src/composables/useUserSession.js`, `useContestConfig.js`, `useContestClock.js`, `useErrorDialog.js` | Shared session, contest config, countdown, and error state |
| Feature composables | `usePackageUpload.js`, `useSubmissionHistory.js`, `useRankingBoard.js` | Upload, history, cancel, score detail, ranking state |
| Components | `RegisterPanel.vue`, `ContestSchedulePanel.vue`, `UploadModal.vue`, `HistoryPage.vue`, `RankingBoard.vue`, `ErrorModal.vue` | Visual rendering and event binding |
| Utilities | `src/utils/*.js` | Field normalization, display text, score formatting, upload file rules, local storage |

Design rule: if logic can be unit-tested or reused without DOM knowledge, it
belongs in `composables` or `utils`, not directly inside a component template.

## 6. Module Design

### 6.1 Entrypoint

`src/main.js` runs before Vue mounts:

- Calls `redirectHttpToHttps()` for non-local HTTP access.
- Allows `/emergency-login` to mount without third-party login checks.
- If `VITE_ENABLE_LOGIN_GUARD=true`, probes `VITE_LOGIN_STATUS_PATH`; a valid
  work id is normalized and stored as `agent_game_third_party_user_id`.
- If the guard fails, redirects to `VITE_LOGIN_PAGE_URL` with current URL as
  redirect target.
- If the guard is disabled, mounts the app directly.

### 6.2 User Session

`useUserSession` owns frontend session bootstrap:

- Reads user id from URL query or `agent_game_third_party_user_id`.
- Calls `GET /api/users/me` first to reuse an existing backend cookie.
- If no valid cookie exists, calls `POST /api/users` with the resolved work id.
- If the backend says nickname is required, shows the registration panel.
- Supports `/emergency-login` through `POST /api/users/emergency-login`.

The frontend stores profile data for display convenience, but backend Cookie is
the real session proof.

### 6.3 Contest Config and Clock

`useContestConfig` calls `GET /api/contest/config` and normalizes backend
fields. `src/config/contestDefaults.js` is only a fallback for local startup or
temporary backend outage.

`useContestClock` derives:

- Not started: show countdown to contest start.
- Running: show countdown to submission end.
- Ended: show ended state.

The frontend can guide users, but upload eligibility is finally enforced by the
backend.

### 6.4 Upload

`UploadModal` delegates upload behavior to `usePackageUpload`:

- Client-side validation only checks `.zip` and file presence.
- `commonApi.uploadCode` posts to `POST /api/upload/me`.
- Upload timeout uses `VITE_UPLOAD_TIMEOUT_MS`, default 5 minutes.
- Success shows an animated success state.
- Backend error messages are shown inside the upload box.

No frontend-only cooldown decision should be treated as authoritative. The
upload click path must call backend status/config when a fresh blocking decision
is needed.

### 6.5 History and Score Detail

`HistoryPage` delegates data and actions to `useSubmissionHistory`:

- Loads `GET /api/users/me/submissions`.
- Loads queue/evaluating summary from `GET /api/users/me/submissions/summary`.
- Auto-refreshes through `useIntervalTimer`.
- Cancels only backend-cancelable queued submissions through
  `POST /api/users/me/submissions/{submissionId}/cancel`.
- Shows submission id, created time, score, token usage, status, and actions.
- Opens score details only when `score_detail` and `question_details` contain
  usable backend data.

`submissionScoreDetails.js` merges `score_detail` and `question_details` by
question id. It supports decimal scores and escaped line breaks.

### 6.6 Ranking

`RankingBoard` delegates ranking state to `useRankingBoard`:

- Calls `GET /api/rank/page`.
- Shows 20 rows per page by default, rendered as two 10-row columns.
- Supports nickname search, score/token/submission-count sorting, jump page,
  and current user rank.
- Calls `GET /api/rank/me` for personal ranking.
- Uses request sequence guards to prevent old responses from overriding newer
  page/sort/search state.

Test accounts are displayed as official demo rows when backend marks them as
test accounts.

## 7. API Design

| Frontend API method | HTTP endpoint | Notes |
| --- | --- | --- |
| `userApi.getUsers()` | `GET /api/users` | Public user list for admin/debug display |
| `userApi.getMe()` | `GET /api/users/me` | Current cookie-backed user |
| `userApi.getSubmissions()` | `GET /api/users/me/submissions` | Current user's history |
| `userApi.getSubmissionQueueSummary()` | `GET /api/users/me/submissions/summary` | Global queued/evaluating counts |
| `userApi.addUser(data)` | `POST /api/users` | Create/login normal user |
| `userApi.emergencyLogin(data)` | `POST /api/users/emergency-login` | Emergency login whitelist path |
| `userApi.updateUser(data)` | `PUT /api/users/me` | Current user update, nickname immutable |
| `userApi.cancelSubmission(id)` | `POST /api/users/me/submissions/{id}/cancel` | Cancel queued upload |
| `rankApi.getRankPage(params)` | `GET /api/rank/page` | Paginated leaderboard |
| `rankApi.getUserRank()` | `GET /api/rank/me` | Personal rank |
| `contestApi.getConfig()` | `GET /api/contest/config` | Contest metadata and schedule |
| `commonApi.uploadCode(formData)` | `POST /api/upload/me` | Multipart zip upload |

All standard JSON responses use:

```json
{"code":0,"message":"success","data":{}}
```

## 8. Data Design

Frontend storage keys:

| Key | Purpose |
| --- | --- |
| `agent_game_third_party_user_id` | Normalized 8-digit work id from login bootstrap |
| `agent_game_user` | Cached normalized user profile for display |

Important display fields:

- `SubmissionResponse.id`: displayed in history as submission id.
- `SubmissionResponse.status`: normalized by `submissionDisplay.js`.
- `SubmissionResponse.score`: decimal-safe total score.
- `SubmissionResponse.score_detail`: evaluator JSON array string.
- `SubmissionResponse.question_details`: backend question metadata.
- `SubmissionResponse.token_usage`: displayed in history and ranking.
- `SubmissionResponse.queue_ahead`: displayed for queued submissions.

Server file paths must not be displayed in normal history UI.

## 9. Security and Privacy

- Production HTTP is redirected to HTTPS before app mount, except localhost.
- Write requests can include `X-Agent-Contest-Write-Key` when configured.
- Current user id header is used as a low-cost consistency check, not as a
  strong auth mechanism.
- Backend cookie remains the effective session proof.
- Frontend must not expose stored/original package paths.
- Emergency login is a controlled fallback and must rely on backend whitelist.

## 10. Error Handling

Errors should be surfaced at the closest useful UI:

- Upload validation or upload API errors: inside `UploadModal`.
- History load failure: history page error state.
- Ranking load failure: ranking board error state.
- Global session or operation errors: `ErrorModal` or registration panel error.

Do not replace backend errors with generic text when backend already returns a
user-actionable message.

## 11. Extensibility Guide

For a new contest:

- Update backend contest config first; frontend should consume it.
- Replace visual assets under `src/assets/` only when needed.
- Add new display rules to `src/utils/`, not inline in templates.
- Add new long-running feature state to `src/composables/`.
- Keep new backend endpoints inside `src/api/index.js`.
- Update `docs/software-design-document.md`, diagrams, and functional tests
  when behavior changes.

## 12. Verification

Recommended checks:

```bash
npm run build
npm test -- scripts/frontend-regression.test.mjs
```

Visual checks are required for changes touching:

- Login/registration page.
- Contest hero and schedule area.
- Upload modal.
- History table and score detail dialog.
- Ranking layout, especially narrow screens and two-column desktop mode.

