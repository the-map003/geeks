# GeeksHub — academic full-stack reproduction of a GeeksforGeeks-style learning platform

A complete learning platform built as a software-engineering assignment: articles, chapter-based tutorials, courses with enrolment and progress, a coding-practice platform with an online judge, quizzes with server-side scoring, comments and moderation, bookmarks, global search, user dashboards and a full admin/CMS panel. All content is original placeholder material; no proprietary assets or text are used.

| Layer | Stack |
|---|---|
| Frontend | Nuxt 4 · Vue 3 · TypeScript · Tailwind CSS 4 · Pinia · VueUse · Monaco Editor · Lucide icons |
| Backend | Node.js · Express 5 · TypeScript · Zod · JWT (access + rotating refresh cookie) · bcrypt |
| Database | PostgreSQL 17 · Prisma ORM · full-text search (tsvector + GIN) |
| Execution | Separate executor service; Docker driver in production, host-process driver for development |
| Infra | Docker · Docker Compose · Nginx · environment-based configuration |

Design documents live in [`docs/`](docs/): reference analysis, page inventory, database design, API spec, implementation plan and reference diff.

> **Branding note.** On request, the frontend reproduces the reference look including a from-scratch interlocking-G mark and the "GeeksforGeeks" wordmark (fonts Nunito / Source Sans 3, the reference palette and layout). The name and mark belong to Sanchhaya Education Private Limited; they are used here for coursework only and the footer/About page state the non-affiliation. Change `siteName` in `frontend/nuxt.config.ts` and `frontend/app/components/layout/AppLogo.vue` before any public deployment.

---

## Quick start (local development)

Requirements: **Node.js 20+** (tested with 24), **npm 10+**. PostgreSQL and Docker are *not* required locally — a real PostgreSQL 17 server is downloaded by npm and run from `./data/postgres`.

```bash
npm install                 # installs all workspaces (frontend, backend, executor)
npm run setup               # copies every .env.example to .env
npm run db:start            # starts embedded PostgreSQL on port 5433 (keep this terminal open)
```

In a second terminal:

```bash
npm run db:migrate          # applies Prisma migrations (creates the schema)
npm run db:seed             # loads demo users and original sample content
npm run dev                 # backend :4000, executor :5000, frontend :3000
```

Open **http://localhost:3000**.

> **Windows note.** The PostgreSQL binaries need the Visual C++ 2015-2022 runtime. If it is not installed, `npm run db:start` deploys the DLLs app-locally from an existing installation (Edge/OneDrive) and prints a notice; installing the [official redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) is the proper fix. The `python` on PATH may be the Microsoft Store stub — set `PYTHON_BIN` in `executor/.env` to a real interpreter (see the comment in `executor/.env.example`).

### Demo accounts (development seed only)

| Role | Email | Password |
|---|---|---|
| Student | `student@example.com` | `Student@123` |
| Editor | `editor@example.com` | `Editor@123` |
| Admin | `admin@example.com` | `Admin@123` |
| Super admin | `superadmin@example.com` | `SuperAdmin@123` |

Never use these in production. Re-run `npm run db:seed` to reset the demo data (it truncates every table).

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Backend + executor + frontend with hot reload |
| `npm run dev:all` | Same, plus the embedded database in one terminal |
| `npm run typecheck` | `tsc` for backend/executor, `vue-tsc` for the frontend |
| `npm run lint` | ESLint in every workspace |
| `npm test` | Vitest in every workspace (backend tests use the `geeks_test` database) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Deletes the embedded database cluster (`./data/postgres`) |

---

## Repository layout

```
geeks/
├── frontend/            Nuxt 4 application (app/ directory convention)
│   ├── app/pages        Routes (public, user, admin)
│   ├── app/components   layout/, common/, article/, tutorial/, course/, problem/, code/, quiz/, comments/, dashboard/, admin/
│   ├── app/composables  useApi (fetch + silent refresh), useNavigation, useSeo, useQueryState, admin helpers
│   ├── app/stores       Pinia: auth, ui (toasts)
│   ├── app/middleware   auth (role-aware), guest
│   └── server/routes    sitemap.xml, robots.txt
├── backend/             Express API
│   ├── src/modules      auth, users, categories, articles, tutorials, courses, problems, submissions, quizzes, comments, bookmarks, search, home, admin
│   ├── src/middleware    auth (JWT + roles), validate (Zod), rateLimit, error handler
│   ├── prisma/schema.prisma + migrations
│   └── prisma/seed      Seed system with original content (Markdown files under seed/data/content)
├── executor/            Code-execution service (local + docker drivers)
├── nginx/               Reverse-proxy config for production
├── scripts/             db.mjs (embedded PostgreSQL), setup-env.mjs
├── docs/                Specifications and reference comparison
├── docker-compose.yml   Production stack
└── docker-compose.dev.yml  Dev database via Docker (alternative to db.mjs)
```

---

## Architecture notes

**Authentication.** Access tokens are short-lived JWTs sent as a bearer header; refresh tokens are random secrets stored hashed in the database and delivered as an `HttpOnly` cookie scoped to `/api/auth`. Every refresh rotates the token; reuse of a rotated token revokes the whole token family. Roles: `USER < EDITOR < ADMIN < SUPER_ADMIN`, enforced server-side on every route.

**Content workflow.** Articles, tutorials, courses, problems and quizzes move through `DRAFT → PUBLISHED → ARCHIVED`. Editors create and edit; admins publish, unpublish, archive and delete. Every administrative mutation is written to the audit log.

**Code execution.** The API never runs user code. It posts to the executor service (shared secret header), which runs each test case in an isolated container (`--network none`, memory/CPU/PID limits, read-only root FS). Verdicts: `ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `COMPILE_ERROR`, `INTERNAL_ERROR`. Submissions are judged asynchronously and the client polls. For development without Docker the executor's `local` driver spawns host interpreters with time limits only — it is **not sandboxed** and refuses to start unless `EXECUTOR_ALLOW_LOCAL=true`.

**Quizzes.** Attempt payloads never include correct-option flags. Scores are computed on the server at submit time; time limits are enforced server-side.

**Search.** Trigger-maintained `tsvector` columns with GIN indexes on articles, tutorials, lessons, courses, problems and quizzes; weighted ranking with `websearch_to_tsquery`, falling back to title matching for partial words.

---

## Testing

```bash
npm test                    # all workspaces
npm test -w backend         # 41 integration tests: auth, users, problems + judge flow, quizzes, search, admin
npm test -w executor        # driver and output-comparison tests
npm test -w frontend        # unit tests for Markdown rendering and formatting helpers
```

Backend tests run against a dedicated `geeks_test` database (created automatically) and require the embedded database to be running; the judge flow test also requires the executor to be running (it is skipped otherwise).

---

## Production deployment (VPS with Docker)

1. Install Docker Engine and the Compose plugin on the server.
2. Clone the repository and create the environment file:
   ```bash
   cp .env.example .env
   # set POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, EXECUTOR_KEY (long random strings),
   # PUBLIC_SITE_URL and CORS_ORIGIN (e.g. https://learn.example.com)
   ```
3. Build and start:
   ```bash
   docker compose up -d --build
   ```
   The backend container runs `prisma migrate deploy` on start. Seed demo content once with:
   ```bash
   docker compose exec backend npx prisma db seed
   ```
4. Nginx listens on `${HTTP_PORT:-80}` and proxies `/api/` to the API and everything else to the Nuxt server. Terminate TLS in front of it (e.g. Caddy, Certbot with the host Nginx, or a cloud load balancer) and set `PUBLIC_SITE_URL` to the `https://` origin.
5. The executor mounts the host Docker socket to launch sandbox containers (`python:3.12-alpine`, `node:22-alpine`, `gcc:14`, `eclipse-temurin:21-jdk-alpine`). Pull them once so first submissions are fast:
   ```bash
   docker pull python:3.12-alpine node:22-alpine gcc:14 eclipse-temurin:21-jdk-alpine
   ```

Security checklist for production: strong secrets in `.env`, `COOKIE_SECURE=true` (set by compose), HTTPS in front of Nginx, the executor never exposed publicly (it is only on the internal network), and regular database backups of the `postgres_data` volume.

---

## Environment variables

See `backend/.env.example`, `frontend/.env.example`, `executor/.env.example` (local development) and `.env.example` (Docker Compose). Secrets are never committed; `.env` files are git-ignored.

## Licence

Coursework project. Source code © the author. Not affiliated with GeeksforGeeks or Sanchhaya Education Private Limited.
