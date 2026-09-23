# Reference Specification — GeeksforGeeks Reproduction

Reference: https://www.geeksforgeeks.org/ (observed September 2026)

This document turns observations of the reference site into an implementation checklist. Every item is a requirement for this project unless marked *(out of scope)*. Checkboxes are ticked only when the item has been implemented and manually verified.

Legend: `[ ]` open · `[x]` implemented and verified · `[~]` partially implemented

Verification (22 September 2026): 41 backend integration tests, 6 executor tests, 16 frontend unit tests, SSR smoke test of every public route, and a Playwright run (Edge) covering login/session restore, bookmarks, comments, run + judged submission, quiz attempt/result, admin create → publish, and role denial at 1366px and 390px with no horizontal overflow. Remaining gaps are tracked in `REFERENCE_DIFF.md`.

---

## 1. Global header

Observed: white header, green logo at left, primary nav (`Courses`, `Tutorials`, `Interview Prep`), central search input, right-side auth controls (`Sign In` green button when logged out; avatar dropdown when logged in). Sticky on scroll. Under it, a secondary bar of topic chips (`DSA`, `Practice Problems`, `C`, `C++`, `Java`, `Python`, `JavaScript`, `Data Science`, `Machine Learning`, `Linux`, `DevOps`, …) that horizontally scrolls on small screens.

Checklist:
- [x] Sticky top header, 64px desktop, 56px mobile
- [x] Logo (original wordmark, not the GfG trademark) linking to `/`
- [x] Primary nav: `Courses`, `Tutorials`, `Practice`, `Quizzes` with mega-menu on hover/click for Tutorials (categories from DB)
- [x] Search input (expands to full-width on mobile via icon toggle) → `/search?q=`
- [x] Logged-out: `Sign In` primary button
- [x] Logged-in: avatar button → dropdown (`Dashboard`, `Profile`, `Bookmarks`, `Submissions`, `Settings`, `Admin` (role-gated), `Sign out`)
- [x] Secondary topic-chip bar populated from top-level categories (DB-driven), horizontally scrollable on mobile
- [x] Mobile: hamburger → slide-in drawer with accordion sections (Tutorials by category, Practice, Courses, Quizzes, account links)
- [x] Keyboard focus rings and `aria-expanded` on menus

## 2. Homepage

Observed: hero banner (`Start Your Learning Today!` / "Hello, What Do You Want To Learn?") with search, then an "Explore" grid of topic groups (Data Structures and Algorithms, Web Development, AI ML & Data Science, Python, Java, System Design, DevOps, Programming Languages, CS Subjects, Practice DSA, Interview Preparation, Databases, Software & Tools) each with "View more"; a Courses carousel (cards with rating, level, interest count); "Must Explore" quick links; footer.

Checklist:
- [x] Hero with headline, subtitle, large search, 3 featured-course pills
- [x] "Explore" grid: top-level categories with child topic links (DB-driven), "View more"
- [x] "Featured Articles" grid (published, `isFeatured` or most viewed)
- [x] "Tutorials" cards (published tutorials with lesson counts)
- [x] "Practice" strip: problems of the day / popular problems with difficulty badges
- [x] "Courses" carousel: cards with rating, level, enrollment count
- [x] "Quizzes" cards: title, question count, `Attempt Now`
- [x] "Trending" list (top viewed articles last 7 days)
- [x] CTA band (sign up / start practicing)
- [x] Skeleton loading for every section; empty state per section; error banner if API fails
- [x] All content fetched from `/api/home` (single aggregated endpoint) — nothing hardcoded

## 3. Article pages

Observed: title, `Last Updated : DD Mon, YYYY`, action row (`Improve`, `Comments`, like, save, share), body with H2/H3 headings, images, notes/callouts, tabbed code blocks (`C++`, `Java`, `Python`, `JavaScript`, …) with `Output` block, "Similar Reads" at bottom, left sidebar with tutorial chapter list when the article belongs to a tutorial, right rail with related content. Comment section at bottom.

Checklist:
- [x] Route `/articles/[slug]`; breadcrumbs `Home / Category / Article`
- [x] Title, author, published + updated dates, reading time, view count
- [x] Action row: Like (auth), Bookmark (auth), Share (copy link / X / LinkedIn), Comments jump link
- [x] Markdown rendering through a sanitizing pipeline (no raw HTML execution)
- [x] Tabbed multi-language code blocks via fenced code groups; copy button; syntax highlighting
- [x] Sticky table of contents (right rail on desktop, collapsible at top on mobile) generated from H2/H3
- [x] Reading-progress bar
- [x] Tags and category chips
- [x] "Similar Reads" (same category/tags) grid
- [x] Comments with replies, likes, report, delete
- [x] Loading skeleton, 404 "Article not found" state, draft articles hidden from non-editors
- [x] SEO: title, description, canonical, OpenGraph, Article JSON-LD

## 4. Article listing / categories / tags

- [x] `/articles` paginated list, filter by category, tag, difficulty, sort (latest/popular)
- [x] `/categories/[slug]` category hub: description, child categories, articles, tutorials, problems in that category
- [x] `/tags/[slug]` tag listing
- [x] Card: cover image, category chip, title, excerpt, author, date, reading time
- [x] Pagination control (prev/next + numbered)

## 5. Tutorial pages

Observed: tutorial hub pages (e.g. "DSA Tutorial") with an intro and a left sidebar listing chapters/lessons; lesson pages share the sidebar with the current lesson highlighted; `Previous`/`Next` at bottom.

Checklist:
- [x] `/tutorials` index: cards grouped by category
- [x] `/tutorials/[slug]` overview: description, chapter list with lessons, progress bar (auth), "Start learning" CTA
- [x] `/tutorials/[slug]/[lesson]` lesson: left sticky sidebar (chapters → lessons, current highlighted, completion checkmarks), content, `Mark as complete` (auth), Previous/Next
- [x] Mobile: sidebar becomes a top "Chapters" drawer
- [x] Right rail TOC from headings
- [x] Completion tracking persisted (`LessonProgress`)
- [x] Comments per lesson
- [x] Bookmark tutorial

## 6. Course pages

Observed: `GeeksforGeeks Courses` heading, category tabs (Placement 360, DSA/Placements, Data Science, GATE, Development, Cloud/DevOps), course cards (thumbnail, title, interest count, star rating, level, price, `Explore` button), course detail with overview, curriculum accordion, instructor, FAQs.

Checklist:
- [x] `/courses` list with category tabs, level filter, search, sort
- [x] Course card: cover, title, level, rating, enrollment count, price/free, duration
- [~] `/courses/[slug]` detail: hero (title, subtitle, rating, learners, level, duration), `Enroll`/`Continue` CTA, sticky summary card, tabs (Overview, Curriculum, Instructor — no Reviews tab; ratings are display-only), curriculum accordion (modules → lessons with duration, preview flag)
- [x] `/courses/[slug]/learn/[lessonSlug]` learning view (auth + enrolled): left module/lesson sidebar with progress, content, `Mark complete`, prev/next
- [x] Enrollment persisted; progress percent computed server-side
- [x] Empty state for no courses; 404 for unknown slug

## 7. Practice / problem list

Observed (`/explore`): left sidebar of topics with counts (`Arrays (308)` …), top filters `Difficulty`, `Status`, `Companies`, `Topics`, search box, `Sort`, problem rows showing status icon, title, company chips, submission count, accuracy %, difficulty badge (School/Basic/Easy/Medium/Hard), pagination.

Checklist:
- [x] `/practice` landing: hero, "Problem of the Day", difficulty buckets, topic grid with counts, curated links
- [x] `/problems` list: filters (difficulty multi-select, topic, status [auth], search), sort (newest / most submitted / accuracy), pagination
- [x] Row: status icon (solved ✓ / attempted ◐ / unsolved ○), title, difficulty badge, topics, accuracy %, submissions
- [x] Topic sidebar with counts (desktop) → filter dropdown (mobile)
- [x] Empty state "No problems match these filters"

## 8. Problem detail + code editor

Observed: split layout. Left panel: tabs `Problem`, `Editorial`, `Submissions`, `Comments`; difficulty + accuracy + submissions + points; statement, `Examples` (Input/Output/Explanation), `Constraints`, `Expected Time/Space Complexity`, company & topic tags (collapsible), hints. Right panel: language dropdown, editor (Monaco-like), `Custom Input` toggle, `Compile & Run`, `Submit`; bottom console showing compilation output, test results (`Passed 3/10`), expected vs. actual.

Checklist:
- [~] `/problems/[slug]` two-pane 50-50 layout on desktop (not draggable; full-screen editor toggle instead); stacked tabs (`Problem` / `Code`) on mobile
- [x] Left tabs: Problem, Editorial (published solution, auth optional), Submissions (own, auth), Comments
- [x] Metadata: difficulty badge, accuracy, submissions, points, topics, hints (accordion)
- [x] Monaco editor: language selector (Python, JavaScript, C++, Java), starter code per language, reset, theme toggle, font size
- [x] `Run` executes sample tests + optional custom input; `Submit` runs hidden tests and stores a Submission
- [x] Console panel: status chips (Running/Accepted/Wrong Answer/…), per-test result rows, stdout/stderr, compile errors, runtime/memory
- [x] Bookmark problem; mark status (unsolved/attempted/solved) reflected in list
- [x] Loading skeleton; "Execution service unavailable" error state; auth prompt on Submit when logged out

## 9. Submissions

- [x] `/submissions` own history: filters by problem/status/language, pagination
- [x] Row: problem, language, status badge, runtime, memory, passed/total, date; expand to view code
- [x] Problem page Submissions tab reuses the same component

## 10. Quizzes

Observed: `Quiz Hub: Test Your Knowledge`, breadcrumb `Quizzes / <Category>`, category tabs (Java, Python, DBMS, OS, …), quiz cards with `Number of Questions: N` and `Attempt Now`, pagination. Quiz-taking: one question at a time, radio options, `Previous`/`Next`, question palette, timer (where set), `Submit`; result page with score, correct/incorrect breakdown, explanations.

Checklist:
- [x] `/quizzes` hub: heading, category tabs, difficulty filter, cards with question count + `Attempt Now`, pagination
- [x] `/quizzes/[slug]` detail: description, question count, time limit, difficulty, best score (auth), attempt history, `Start Quiz`
- [x] `/quizzes/[slug]/attempt/[attemptId]`: question navigator palette, radio options, prev/next, timer, submit confirmation modal
- [x] `/quizzes/[slug]/result/[attemptId]`: score ring, correct/incorrect/skipped counts, per-question review with explanation, `Retake`
- [x] All scoring on the backend; option `isCorrect` never sent to client during an attempt
- [x] Attempt timeout enforced server-side

## 11. Search

- [x] Header search → `/search?q=&type=`
- [x] Results page: type tabs (All, Articles, Tutorials, Courses, Problems, Quizzes) with counts, filters (category, difficulty), paginated results, highlighted query
- [x] Empty state with suggestions; loading skeleton
- [x] PostgreSQL full-text search (`to_tsvector` / `plainto_tsquery`) + `ILIKE` fallback

## 12. Authentication

- [x] `/login`, `/register` share the reference modal-style card (logo, `Sign In` / `Sign Up` tabs, icon inputs, green gradient button, social block) with validation messages and a password visibility toggle
- [x] Redirect back to intended page after login (`?redirect=`)
- [x] Session restore on refresh; expired-session banner → redirect to login
- [x] Logout everywhere (revokes refresh tokens)

## 13. Profile / dashboard / settings

Observed reference profile: avatar, name, institution, streak/score, solved problem stats by difficulty, submissions heatmap-ish activity, badges. Dashboard shows courses in progress.

Checklist:
- [x] `/u/[username]` public profile: avatar, display name, bio, institution, joined date, solved-by-difficulty bars, recent activity (public only)
- [x] `/dashboard` (auth): greeting, streak card, solved counts, continue learning (tutorials/courses in progress), recent submissions, recent quiz attempts, bookmarks preview
- [x] `/profile` (auth): own full profile with edit link
- [x] `/settings` (auth): profile fields, avatar URL, change password, danger zone (deactivate)
- [x] `/bookmarks` (auth): type filter tabs, grid, remove bookmark, empty state

## 14. Comments

- [x] Threaded (one nesting level like the reference, replies flat under a parent)
- [x] Composer with character counter, auth prompt when logged out
- [x] Like, reply, report (reason modal), delete (own / moderator), edit (own)
- [x] Sort newest/top; "Load more" pagination
- [x] Hidden/removed comments show placeholder

## 15. Admin / CMS

- [x] `/admin` dashboard: counters (users, articles, problems, submissions today, quizzes, open reports), recent audit log, charts (submissions per day)
- [x] `/admin/users`: table, search, role change, activate/deactivate
- [x] `/admin/articles`, `/admin/tutorials`, `/admin/courses`, `/admin/problems`, `/admin/quizzes`: list with status filter, create/edit forms (Markdown editor with preview), publish/unpublish/archive
- [x] Problem editor: examples, starter code per language, test cases (sample/hidden), hints, editorial
- [x] Quiz editor: questions, options, correct flag, explanation
- [x] `/admin/comments`: moderation queue (hide/restore/delete)
- [x] `/admin/reports`: resolve/dismiss
- [x] `/admin/analytics`: charts of signups, submissions, views
- [x] `/admin/settings` (SUPER_ADMIN): site settings, feature flags, audit log viewer
- [x] Responsive admin tables (card layout on mobile)

## 16. Footer

Observed: dark footer, brand + address, columns `Company`, `Explore`, `Tutorials`, `Courses`, `Videos`, `Preparation Corner`, social icons, app badges, copyright line.

Checklist:
- [x] Dark (#1f1f1f) footer with brand column (logo, tagline, social icons)
- [x] Link columns: Company, Explore, Tutorials (DB categories), Practice, Courses, Preparation Corner
- [x] Copyright / academic disclaimer line
- [x] Collapsible accordion columns on mobile

## 17. Cross-cutting UI patterns

- [x] Cards: consistent radius (8px), 1px border `#e5e7eb`, subtle hover shadow, 16px padding
- [x] Buttons: primary (green), secondary (outline), ghost, danger; sizes sm/md/lg; loading spinner state; disabled state
- [x] Tabs: underline style, keyboard navigable
- [x] Dropdowns/menus with outside-click close and Escape
- [x] Modals: focus trap, Escape close, backdrop
- [x] Badges: difficulty (School/Basic/Easy/Medium/Hard colors), status, role
- [x] Alerts: info/success/warning/error
- [x] Pagination: prev/next + numbered with ellipsis
- [x] Breadcrumbs with JSON-LD
- [x] Skeleton loaders per card type
- [x] Empty-state component (icon, title, description, CTA)
- [x] Error-state component with retry
- [x] Toast notifications
- [x] Code block component with copy + language label
- [x] Global 404 and 500 error pages

## 18. Responsive behaviour

Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`.
- [x] Header collapses to logo + search icon + hamburger below `lg`
- [x] Topic chips scroll horizontally below `lg`
- [x] Article: 3-column (TOC-less left rail hidden, content, right rail) → single column below `lg`, TOC collapsible
- [x] Problem page: two-pane → tabbed single pane below `lg`
- [x] Admin tables → stacked cards below `md`
- [x] Forms full-width below `sm`
- [x] No horizontal page scroll at 360px width

## 19. States

Every API-driven view implements: **loading** (skeleton), **empty**, **error** (message + retry), **success**. Auth-gated views implement **unauthenticated** (redirect to login with return URL) and **forbidden** (403 page).
