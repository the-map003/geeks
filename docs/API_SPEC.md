# API Specification

Base URL: `/api`. JSON only. All timestamps ISO-8601 UTC.

## Conventions

**Success**
```json
{ "success": true, "data": { }, "message": "optional" }
```
**Paginated**
```json
{ "success": true, "data": { "items": [], "page": 1, "pageSize": 20, "total": 132, "totalPages": 7 } }
```
**Error**
```json
{ "success": false, "message": "Validation failed", "errors": [ { "path": "email", "message": "Invalid email" } ] }
```

Status codes: 200 OK, 201 Created, 204 No Content, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 422 semantic error, 429 rate limited, 500 internal.

**Authentication**: `Authorization: Bearer <accessToken>` (15 min). Refresh token is an `HttpOnly; SameSite=Lax; Secure (prod)` cookie `gfg_refresh` scoped to `/api/auth`. Rotation on every refresh; reuse of a revoked token revokes the family.

**Rate limits**: global 300 req/15 min per IP; auth endpoints 10/15 min; run/submit 20/min per user; comments 10/min per user.

**Pagination params**: `page` (1-based), `pageSize` (max 50). **Sorting**: `sort` with documented values per endpoint.

Roles: `USER < EDITOR < ADMIN < SUPER_ADMIN`. "Editor+" means EDITOR or higher.

---

## Auth `/auth`

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| POST | `/auth/register` | Public | `{ email, username, password, displayName? }` | 201 `{ user, accessToken }` + refresh cookie |
| POST | `/auth/login` | Public | `{ emailOrUsername, password }` | `{ user, accessToken }` + cookie |
| POST | `/auth/refresh` | Cookie | — | `{ user, accessToken }` + rotated cookie |
| POST | `/auth/logout` | Cookie | — | 204, clears cookie, revokes token |
| POST | `/auth/logout-all` | User | — | 204, revokes all tokens |
| GET | `/auth/me` | User | — | `{ user }` (with profile, role) |
| POST | `/auth/change-password` | User | `{ currentPassword, newPassword }` | 204, revokes other sessions |

`user` shape: `{ id, email, username, role, isActive, createdAt, profile: { displayName, avatarUrl, bio, institution, location, websiteUrl, githubUrl, linkedinUrl } }`. Never includes `passwordHash`.

## Users `/users`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/me` | User | Own user + profile + stats |
| PATCH | `/users/me` | User | Update profile fields, username (unique check) |
| GET | `/users/me/dashboard` | User | `{ streak, stats, continueLearning, recentSubmissions, recentAttempts, bookmarks }` |
| GET | `/users/me/activity?days=90` | User | Daily activity for heatmap |
| GET | `/users/:username` | Public | Public profile + public stats |

## Home `/home`

| GET | `/home` | Public | `{ featuredCategories, featuredArticles, tutorials, popularProblems, problemOfTheDay, courses, quizzes, trending }` — cached in-memory 60 s |

## Categories, tags, topics

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/categories` | Public | Tree (`?tree=true`) or flat; `?nav=true` returns nav chips |
| GET | `/categories/:slug` | Public | Category + children + counts + recent content |
| GET | `/tags` | Public | `?q=` autocomplete |
| GET | `/topics` | Public | With published problem counts |

## Articles `/articles`

| Method | Path | Auth | Query / Body |
|---|---|---|---|
| GET | `/articles` | Public | `page,pageSize,category,tag,difficulty,author,sort=latest|popular|trending,q` — PUBLISHED only |
| GET | `/articles/:slug` | Public | Published; editors see drafts. Increments view (throttled per IP/user) |
| GET | `/articles/:slug/related` | Public | 6 related by category/tags |
| POST | `/articles/:slug/like` | User | Toggle; returns `{ liked, likeCount }` |

## Tutorials `/tutorials`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/tutorials` | Public | `category,page,pageSize` |
| GET | `/tutorials/:slug` | Public | Tutorial + chapters + lesson summaries (+ `completedLessonIds` when authed) |
| GET | `/tutorials/:slug/lessons/:lessonSlug` | Public | Lesson content + prev/next + sidebar data |
| POST | `/tutorials/lessons/:id/complete` | User | Toggle completion → `{ completed, progressPercent }` |

## Courses `/courses`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/courses` | Public | `category,level,q,sort=popular|newest|rating,page` |
| GET | `/courses/:slug` | Public | Detail + modules + lessons (content omitted) + `enrollment` if authed |
| POST | `/courses/:slug/enroll` | User | 201 `{ enrollment }`; 409 if enrolled |
| GET | `/courses/:slug/lessons/:lessonSlug` | User (enrolled or preview) | Lesson content + nav |
| POST | `/courses/lessons/:id/complete` | User | → `{ completed, progressPercent }` |
| GET | `/courses/me/enrollments` | User | Enrolled courses with progress |

## Problems `/problems`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/problems/overview` | Public | Difficulty counts, topic grid, problem of the day |
| GET | `/problems` | Public | `difficulty[],topic,status(auth),q,sort=newest|popular|accuracy,page` — includes `userState` when authed |
| GET | `/problems/:slug` | Public | Statement, examples, constraints, starter code, sample tests, topics, stats, `userState`; editorial included only when `?editorial=true` |
| POST | `/problems/:slug/run` | User | `{ language, sourceCode, customInput? }` → runs against sample tests (or custom input) → `{ results[], stdout, stderr, status }` (synchronous, ≤ 10 s) |
| POST | `/problems/:slug/submit` | User | `{ language, sourceCode }` → 202 `{ submissionId, status: "PENDING" }`; processed by executor; poll `GET /submissions/:id` |

## Submissions `/submissions`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/submissions` | User | Own: `problem,status,language,page` |
| GET | `/submissions/:id` | User (owner) / Editor+ | Includes `testResults` (hidden test inputs redacted for non-editors) and `sourceCode` |

## Quizzes `/quizzes`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/quizzes` | Public | `category,difficulty,q,page` |
| GET | `/quizzes/:slug` | Public | Detail + questionCount + `bestScore`, `attempts` when authed. No questions. |
| POST | `/quizzes/:slug/attempts` | User | 201 `{ attempt }` (resumes IN_PROGRESS if exists) |
| GET | `/quiz-attempts/:id` | Owner | Questions + options **without** `isCorrect`; saved answers; `expiresAt` |
| PUT | `/quiz-attempts/:id/answers` | Owner | `{ questionId, optionId | null }` saves one answer (idempotent) |
| POST | `/quiz-attempts/:id/submit` | Owner | Scores server-side → `{ result }`; 409 if already submitted |
| GET | `/quiz-attempts/:id/result` | Owner | Score + per-question review with correct option + explanation |

## Comments `/comments`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/comments` | Public | `targetType,targetId,sort=newest|top,page` → roots with first 3 replies + `replyCount` |
| GET | `/comments/:id/replies` | Public | Paginated replies |
| POST | `/comments` | User | `{ targetType, targetId, content, parentId? }` (max 2000 chars, 1 nesting level) |
| PATCH | `/comments/:id` | Owner | `{ content }` |
| DELETE | `/comments/:id` | Owner / Editor+ | Soft delete |
| POST | `/comments/:id/like` | User | Toggle |
| POST | `/comments/:id/report` | User | `{ reason, details? }` |

## Bookmarks `/bookmarks`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/bookmarks` | User | `type,page` → items with hydrated target summary |
| POST | `/bookmarks` | User | `{ type, targetId }` → 201; 200 if exists |
| DELETE | `/bookmarks` | User | `{ type, targetId }` body or `/bookmarks/:id` |
| GET | `/bookmarks/status?type=&targetId=` | User | `{ bookmarked, id }` |

## Search `/search`

| GET | `/search` | Public | `q (min 2), type=all|articles|tutorials|courses|problems|quizzes, category, difficulty, page, pageSize` → `{ items, counts: { all, articles, … }, page, … }` |

## Admin `/admin` (Editor+ unless stated)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin/stats` | Editor+ | Counters; Admin+ receives user/report metrics |
| GET | `/admin/analytics?range=30d` | Admin+ | Series: signups, submissions, views, attempts |
| GET/PATCH | `/admin/users`, `/admin/users/:id` | Admin+ | Role change (cannot elevate above own role, cannot demote self), activate/deactivate |
| CRUD | `/admin/articles[/:id]` | Editor+ | Create/update drafts; `POST /:id/publish`, `/unpublish`, `/archive` Admin+ |
| CRUD | `/admin/tutorials[/:id]`, `/admin/tutorials/:id/chapters`, `/admin/tutorials/:id/lessons[/:lessonId]` | Editor+ | Reorder via `PUT .../reorder` |
| CRUD | `/admin/courses[/:id]`, `/admin/courses/:id/modules`, `/admin/courses/modules/:moduleId/lessons` | Editor+ | |
| CRUD | `/admin/problems[/:id]` incl. nested `examples`, `starter-code`, `test-cases` | Editor+ | `POST /admin/problems/:id/validate` runs reference solution against test cases |
| CRUD | `/admin/quizzes[/:id]`, `/admin/quizzes/:id/questions[/:qid]` | Editor+ | |
| GET/PATCH | `/admin/comments`, `/admin/comments/:id` (`hide|restore|delete`) | Editor+ | |
| GET/PATCH | `/admin/reports`, `/admin/reports/:id` (`resolve|dismiss`) | Editor+ | |
| GET | `/admin/audit-logs` | Admin+ | Paginated |
| GET/PUT | `/admin/settings` | SuperAdmin | Key/value site settings |

Every admin mutation writes an `AuditLog` row.

## Executor service (internal, not public)

`POST http://executor:5000/execute` with shared secret header `x-executor-key`.
```json
{ "language": "PYTHON", "sourceCode": "...", "tests": [{ "id": "t1", "input": "1 2", "expectedOutput": "3" }], "timeLimitMs": 2000, "memoryLimitMb": 256 }
```
Response:
```json
{ "compile": { "ok": true, "output": "" }, "results": [{ "id": "t1", "status": "ACCEPTED", "stdout": "3", "stderr": "", "runtimeMs": 12, "memoryKb": 8000 }] }
```
Drivers: `docker` (production: one ephemeral container per run, `--network none`, cpu/memory/pids limits, read-only FS, tmpfs workdir) and `local` (development only, explicit opt-in, spawns host runtimes with timeouts, no isolation guarantees, refuses to start unless `EXECUTOR_ALLOW_LOCAL=true`).
