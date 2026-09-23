# Page Inventory

Status values: `Planned` · `In progress` · `Done` (frontend + backend + states + responsive verified).

Verification performed on 22 September 2026: every route below renders (SSR smoke test: 200 for valid slugs, 404 for unknown ones); backend behaviour is covered by 41 integration tests; browser flows (login, bookmark, comment, run/submit code, quiz attempt, admin create/publish, role denial) and 1366px/390px screenshots were exercised with Playwright — see `REFERENCE_DIFF.md` for outstanding differences.

Frontend routes live in `frontend/app/pages`. API paths are relative to `/api`. Auth column: `Public`, `User`, `Editor+`, `Admin+`, `SuperAdmin`.

## Public

| Route | Purpose | Key components | API | DB | Auth | Responsive notes | Interactions | Status |
|---|---|---|---|---|---|---|---|---|
| `/` | Homepage | `HeroSearch`, `ExploreGrid`, `ArticleCard`, `TutorialCard`, `ProblemRow`, `CourseCard`, `QuizCard`, `TrendingList`, `CtaBand` | `GET /home` | Category, Article, Tutorial, Problem, Course, Quiz | Public | Sections stack; carousel → horizontal scroll | Search submit, card navigation | Done |
| `/articles` | Article listing | `ArticleCard`, `FilterBar`, `Pagination`, `CategorySidebar` | `GET /articles`, `GET /categories`, `GET /tags` | Article, Category, Tag | Public | Sidebar → dropdown | Filter, sort, paginate | Done |
| `/articles/[slug]` | Article detail | `ArticleHeader`, `MarkdownRenderer`, `CodeTabs`, `TableOfContents`, `ReadingProgress`, `ShareMenu`, `RelatedArticles`, `CommentThread` | `GET /articles/:slug`, `GET /articles/:slug/related`, `GET /comments`, `POST /articles/:slug/like`, `POST /bookmarks` | Article, ArticleLike, Bookmark, Comment | Public (mutations User) | 3-col → 1-col; TOC collapsible | Like, bookmark, share, comment | Done |
| `/categories/[slug]` | Category hub | `CategoryHeader`, `SubcategoryChips`, `ArticleCard`, `TutorialCard`, `ProblemRow` | `GET /categories/:slug` | Category + content | Public | Grid → 1-col | Browse | Done |
| `/tags/[slug]` | Tag listing | `ArticleCard`, `Pagination` | `GET /articles?tag=` | Tag, Article | Public | — | Paginate | Done |
| `/tutorials` | Tutorial index | `TutorialCard`, `CategoryTabs` | `GET /tutorials` | Tutorial | Public | Tabs scroll | Filter by category | Done |
| `/tutorials/[slug]` | Tutorial overview | `TutorialHero`, `ChapterList`, `ProgressBar` | `GET /tutorials/:slug`, `GET /tutorials/:slug/progress` | Tutorial, Chapter, Lesson, LessonProgress | Public (progress User) | — | Start/continue | Done |
| `/tutorials/[slug]/[lesson]` | Lesson | `TutorialSidebar`, `MarkdownRenderer`, `CodeTabs`, `LessonNav`, `MarkCompleteButton`, `CommentThread` | `GET /tutorials/:slug/lessons/:lesson`, `POST /tutorials/lessons/:id/complete` | TutorialLesson, LessonProgress, Comment | Public (complete User) | Sidebar → drawer | Prev/next, complete | Done |
| `/courses` | Course listing | `CourseCard`, `CategoryTabs`, `LevelFilter`, `Pagination` | `GET /courses` | Course | Public | Grid 3→1 | Filter/sort | Done |
| `/courses/[slug]` | Course detail | `CourseHero`, `EnrollCard`, `CurriculumAccordion`, `InstructorCard`, `Tabs` | `GET /courses/:slug`, `POST /courses/:slug/enroll` | Course, Module, Lesson, Enrollment | Public (enroll User) | Sticky card → bottom bar | Enroll, expand modules | Done |
| `/courses/[slug]/learn/[lesson]` | Course player | `CourseSidebar`, `MarkdownRenderer`, `LessonNav`, `MarkCompleteButton` | `GET /courses/:slug/lessons/:lesson`, `POST /courses/lessons/:id/complete` | CourseLesson, CourseLessonProgress | User (enrolled) | Sidebar → drawer | Complete, prev/next | Done |
| `/practice` | Practice landing | `PracticeHero`, `ProblemOfTheDay`, `DifficultyBuckets`, `TopicGrid` | `GET /problems/overview` | Problem, Topic | Public | Grid collapse | Navigate | Done |
| `/problems` | Problem list | `ProblemFilters`, `TopicSidebar`, `ProblemRow`, `Pagination` | `GET /problems`, `GET /topics` | Problem, Topic, UserProblemStatus | Public (status User) | Sidebar → dropdown; row → card | Filter, search, sort | Done |
| `/problems/[slug]` | Problem + editor | `ProblemStatement`, `ProblemTabs`, `CodeEditor` (Monaco), `LanguageSelect`, `RunPanel`, `SubmissionList`, `CommentThread`, `EditorialView` | `GET /problems/:slug`, `POST /problems/:slug/run`, `POST /problems/:slug/submit`, `GET /submissions?problem=`, `GET /submissions/:id` | Problem, Example, StarterCode, TestCase, Submission | Public (run/submit User) | Split → tabs | Run, submit, poll result | Done |
| `/quizzes` | Quiz hub | `QuizCard`, `CategoryTabs`, `Pagination` | `GET /quizzes`, `GET /categories` | Quiz | Public | Grid 3→1 | Filter | Done |
| `/quizzes/[slug]` | Quiz detail | `QuizHero`, `AttemptHistory`, `StartQuizButton` | `GET /quizzes/:slug`, `GET /quizzes/:slug/attempts`, `POST /quizzes/:slug/attempts` | Quiz, QuizAttempt | Public (start User) | — | Start | Done |
| `/quizzes/[slug]/attempt/[id]` | Take quiz | `QuestionCard`, `QuestionPalette`, `QuizTimer`, `ConfirmSubmitModal` | `GET /quiz-attempts/:id`, `PUT /quiz-attempts/:id/answers`, `POST /quiz-attempts/:id/submit` | QuizAttempt, QuizAnswer | User (owner) | Palette → bottom sheet | Answer, navigate, submit | Done |
| `/quizzes/[slug]/result/[id]` | Quiz result | `ScoreRing`, `QuestionReview` | `GET /quiz-attempts/:id/result` | QuizAttempt, QuizAnswer | User (owner) | — | Retake | Done |
| `/search` | Global search | `SearchTabs`, `SearchResultItem`, `Pagination`, `EmptySearch` | `GET /search` | All content | Public | Tabs scroll | Query, filter | Done |
| `/u/[username]` | Public profile | `ProfileHeader`, `SolvedStats`, `ActivityList` | `GET /users/:username` | User, Profile, UserProblemStatus | Public | — | — | Done |
| `/login` | Login | `AuthCard`, `LoginForm` | `POST /auth/login` | User, RefreshToken | Public | Full-width | Submit, redirect | Done |
| `/register` | Register | `AuthCard`, `RegisterForm` | `POST /auth/register` | User, Profile | Public | Full-width | Submit | Done |
| `/about` | About / academic disclaimer | Static | — | — | Public | — | — | Done |

## Authenticated user

| Route | Purpose | Key components | API | DB | Auth | Responsive | Interactions | Status |
|---|---|---|---|---|---|---|---|---|
| `/dashboard` | User dashboard | `StreakCard`, `StatTiles`, `ContinueLearning`, `RecentSubmissions`, `RecentQuizzes`, `BookmarkPreview` | `GET /users/me/dashboard` | Many | User | Tiles 4→2→1 | Navigate | Done |
| `/profile` | Own profile | `ProfileHeader`, `SolvedStats`, `ActivityList` | `GET /users/me` | User, Profile | User | — | Edit link | Done |
| `/settings` | Account settings | `ProfileForm`, `PasswordForm`, `DangerZone` | `PATCH /users/me`, `POST /auth/change-password` | User, Profile | User | Full-width | Save | Done |
| `/bookmarks` | Bookmarks | `TypeTabs`, `BookmarkCard`, `EmptyState` | `GET /bookmarks`, `DELETE /bookmarks/:id` | Bookmark | User | Grid 3→1 | Filter, remove | Done |
| `/submissions` | Submission history | `SubmissionFilters`, `SubmissionRow`, `CodeViewer` | `GET /submissions` | Submission | User | Row → card | Filter, expand | Done |

## Admin (`/admin` layout, role-gated)

| Route | Purpose | Key components | API | Auth | Status |
|---|---|---|---|---|---|
| `/admin` | Dashboard | `StatTiles`, `SubmissionsChart`, `AuditLogTable` | `GET /admin/stats` | Editor+ (stats limited) / Admin+ | Done |
| `/admin/users` | User management | `DataTable`, `RoleSelect`, `ConfirmModal` | `GET /admin/users`, `PATCH /admin/users/:id` | Admin+ | Done |
| `/admin/articles` | Article CMS | `DataTable`, `StatusFilter` | `GET /admin/articles` | Editor+ | Done |
| `/admin/articles/new`, `/admin/articles/[id]` | Article editor | `MarkdownEditor`, `TagInput`, `CategorySelect`, `PublishControls` | `POST/PUT /admin/articles`, `POST /admin/articles/:id/publish` | Editor+ (publish Admin+) | Done |
| `/admin/tutorials`, `/admin/tutorials/[id]` | Tutorial CMS | `ChapterEditor`, `LessonEditor` | `/admin/tutorials*` | Editor+ | Done |
| `/admin/courses`, `/admin/courses/[id]` | Course CMS | `ModuleEditor`, `LessonEditor` | `/admin/courses*` | Editor+ | Done |
| `/admin/problems`, `/admin/problems/[id]` | Problem CMS | `ProblemForm`, `ExampleEditor`, `StarterCodeEditor`, `TestCaseEditor` | `/admin/problems*` | Editor+ | Done |
| `/admin/quizzes`, `/admin/quizzes/[id]` | Quiz CMS | `QuestionEditor`, `OptionEditor` | `/admin/quizzes*` | Editor+ | Done |
| `/admin/comments` | Moderation | `DataTable`, actions | `GET /admin/comments`, `PATCH /admin/comments/:id` | Editor+ | Done |
| `/admin/reports` | Reports | `DataTable`, resolve/dismiss | `/admin/reports*` | Editor+ | Done |
| `/admin/analytics` | Analytics | charts | `GET /admin/analytics` | Admin+ | Done |
| `/admin/settings` | System settings + audit log | `SettingsForm`, `AuditLogTable` | `/admin/settings`, `/admin/audit-logs` | SuperAdmin | Done |

## System pages

| Route | Purpose | Status |
|---|---|---|
| `error.vue` (404/403/500) | Global error page with return home | Done |
| `/sitemap.xml`, `/robots.txt` | SEO (Nitro server routes, data from `GET /api/sitemap`) | Done |
| `/about` | Academic disclaimer, privacy and terms | Done |
