# Implementation Plan

## Environment constraints discovered (September 2026)

| Tool | Status on the development machine | Decision |
|---|---|---|
| Node.js 24.21 / npm 11.19 | Available (`C:\Program Files\nodejs`, not on the shell PATH) | Use; scripts prepend it to PATH |
| PostgreSQL | Not installed | Use `embedded-postgres` (PostgreSQL 17 binaries downloaded by npm) for local development via `npm run db:start`. Docker Compose provides PostgreSQL for VPS deployment. The stack remains PostgreSQL + Prisma. |
| Docker | Not installed | Docker files are authored and documented but cannot be executed locally. Code execution uses the `local` executor driver in development (Python 3.14 and Node present on host) and the `docker` driver in production. |
| Git | Not installed | No `git init` performed; repository layout is ready for `git init` once Git is available. |
| Python 3.14 | Available | Enables local Python execution in the dev executor |
| gcc / Java | Not installed | C++ and Java run only through the Docker executor driver |

## Version pins

Nuxt 4.5 · Vue 3.5 · TypeScript 5.9 · Tailwind CSS 4 (`@tailwindcss/vite`) · Pinia 3 (`@pinia/nuxt`) · VueUse 15 · Monaco 0.56 · Lucide · Express 5.2 · Zod 4 · Prisma 6.19 · bcryptjs · jsonwebtoken · Vitest 5 · tsx.

## Repository layout

```
geeks/
├── frontend/            Nuxt 4 app (app/ srcDir convention)
├── backend/             Express + Prisma API
├── executor/            Isolated code-execution service
├── docs/                Specs and diffs
├── nginx/               Production reverse-proxy config
├── scripts/             Dev helpers (embedded Postgres)
├── docker-compose.yml   Production stack
├── docker-compose.dev.yml  Dev stack when Docker is available
├── .env.example
├── package.json         npm workspaces + root scripts
└── README.md
```

## Stages

| Stage | Scope | Exit criteria |
|---|---|---|
| 1 Initialization | Workspaces, Nuxt scaffold, Express scaffold, executor scaffold, Docker files, env config, embedded Postgres script | `npm install`, `npm run db:start`, `npm run dev` start all services; health endpoint responds |
| 2 Database | Prisma schema, initial migration incl. FTS SQL, seed system | `prisma migrate dev` clean; `prisma db seed` populates demo data |
| 3 Backend foundation | Env validation, logger, error handler, response helpers, Zod validation middleware, rate limiting, helmet/CORS, auth module (register/login/refresh/logout/me/change-password), RBAC middleware, audit helper, tests | Auth tests pass; protected routes reject anonymous requests |
| 4 Frontend foundation | Tailwind theme, layouts (default, auth, admin), header + mega menu + mobile drawer, footer, design-system components, API client with refresh, auth store + middleware, toasts, error page | Login/register/logout work end-to-end; UI matches spec at desktop/mobile |
| 5 Public content | Home API + page, categories, articles (list/detail/related/like), Markdown renderer with code tabs, TOC, tutorials (index/overview/lesson/progress), courses (list/detail/enroll/learn/progress) | Every page has loading/empty/error states; SEO meta present |
| 6 Practice | Problems API, executor service (local + docker drivers), run/submit pipeline, submission processing, Monaco editor component, problem list/detail, submissions page | Submit a Python/JS solution locally → stored submission with correct verdict |
| 7 Quizzes | Quiz API, attempt lifecycle, server-side scoring, hub/detail/attempt/result pages | Tampering with request payload cannot alter score |
| 8 User features | Dashboard API, streaks, profile, settings, bookmarks, public profile | Data persists and reflects across pages |
| 9 Community | Comments API (threads, likes, reports, moderation), comment components on articles/lessons/problems/courses/quizzes | Rate limits and authorization verified |
| 10 Search | FTS endpoint, search page with tabs/filters/pagination | Queries hit across all five types |
| 11 Admin | Admin API, admin layout, dashboard, users, CMS editors (articles, tutorials, courses, problems, quizzes), moderation, reports, analytics, settings, audit logs | Editor can create → admin publishes → appears publicly |
| 12 Production | Helmet CSP, sitemap/robots, structured data, image lazy loading, Dockerfiles, compose, Nginx, deployment guide, REFERENCE_DIFF review | `docker compose up` documented; docs complete |

## Status (22 September 2026)

| Stage | Status | Evidence |
|---|---|---|
| 1 Initialization | Done | `npm install`, `npm run db:start`, `npm run dev` bring up all services; `/api/health` responds |
| 2 Database | Done | 2 migrations (`init`, `fulltext_search` with triggers + GIN), seed loads 6 users / 48 categories / 24 articles / 24 tutorial lessons / 4 courses (36 lessons) / 24 problems (193 tests) / 8 quizzes (64 questions) |
| 3 Backend foundation | Done | `tests/auth.test.ts` (rotation, reuse detection, change-password) + `tests/unit/streak.test.ts` |
| 4 Frontend foundation | Done | Header/mega menu/drawer/footer, design-system components, API client with silent refresh, auth store, `vue-tsc` clean |
| 5 Public content | Done | Home, articles, categories, tags, tutorials, courses render server-side with metadata (SSR smoke test 200/404) |
| 6 Practice | Done | Executor (local + docker drivers, 6 tests), problems/submissions API, Monaco workspace; `tests/problems.test.ts` judges a Python solution end to end |
| 7 Quizzes | Done | `tests/quizzes.test.ts` proves server-side scoring and tamper rejection |
| 8 User features | Done | Dashboard, profile, settings, bookmarks, submissions, public profile |
| 9 Community | Done | Comments/replies/likes/reports with rate limits; moderation covered in `tests/admin.test.ts` |
| 10 Search | Done | `tests/search.test.ts` (FTS, filters, fuzzy fallback) |
| 11 Admin | Done | Dashboard, users, CMS editors for all five content types, moderation, reports, analytics, settings, audit log |
| 12 Production | Done (documented, not executed locally) | Dockerfiles, compose, Nginx, sitemap/robots, README deployment guide. Docker is not installed on the dev machine, so the compose stack was not run here. |

## Working rules

- Type-check (`npm run typecheck`), lint, and run tests after each module.
- No fake API calls; every UI action calls a real endpoint.
- Every list page: loading skeleton, empty state, error state with retry.
- Update `docs/PAGE_INVENTORY.md` status and `docs/REFERENCE_DIFF.md` after each page.
