# Database Design

PostgreSQL 17 via Prisma ORM (`backend/prisma/schema.prisma`). IDs are `cuid()` strings. All tables carry `createdAt` and, where rows mutate, `updatedAt`.

## Design decisions

1. **Single category tree** (`Category`, self-referential `parentId`) is shared by articles, tutorials, courses, quizzes and problems. It powers the header topic chips and the homepage "Explore" grid.
2. **Topics** (`Topic`) are the algorithmic tags for problems (Arrays, Strings, DP …) and are separate from article `Tag`s because they carry counts, filters and problem-specific semantics.
3. **Comments and bookmarks use nullable foreign keys** (`articleId`, `problemId`, `tutorialLessonId`, `courseId`, `quizId`) plus a `targetType` enum instead of a polymorphic `targetId` string. This keeps referential integrity and cascade deletes. A composite unique per (user, target column) prevents duplicate bookmarks.
4. **Denormalised counters** (`viewCount`, `likeCount`, `submissionCount`, `acceptedCount`, `enrollmentCount`) are updated transactionally in services. They avoid `COUNT(*)` on hot list pages. Rebuild scripts exist in the seed folder.
5. **`UserProblemStatus`** caches unsolved/attempted/solved per user so the problem list can join one row per problem instead of aggregating submissions.
6. **`UserActivity`** stores one row per user per day for streak calculation.
7. **Refresh tokens are stored hashed** (SHA-256) and rotated; a reused revoked token revokes the whole family.
8. Content bodies are **Markdown**; rendering is sanitised on the frontend. Raw HTML is never stored as trusted.
9. Full-text search uses generated `tsvector` columns added via a raw SQL migration on `Article`, `TutorialLesson`, `Course`, `Problem`, `Quiz` with GIN indexes.

## Enums

| Enum | Values |
|---|---|
| `Role` | USER, EDITOR, ADMIN, SUPER_ADMIN |
| `ContentStatus` | DRAFT, PUBLISHED, ARCHIVED |
| `Difficulty` | SCHOOL, BASIC, EASY, MEDIUM, HARD |
| `CourseLevel` | BEGINNER, INTERMEDIATE, ADVANCED, ALL_LEVELS |
| `Language` | PYTHON, JAVASCRIPT, CPP, JAVA |
| `SubmissionStatus` | PENDING, RUNNING, ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, RUNTIME_ERROR, COMPILE_ERROR, INTERNAL_ERROR |
| `ProblemUserState` | ATTEMPTED, SOLVED |
| `AttemptStatus` | IN_PROGRESS, SUBMITTED, EXPIRED |
| `CommentTarget` | ARTICLE, PROBLEM, TUTORIAL_LESSON, COURSE, QUIZ |
| `BookmarkType` | ARTICLE, PROBLEM, TUTORIAL, COURSE |
| `ReportTarget` | COMMENT, ARTICLE, USER, PROBLEM |
| `ReportStatus` | OPEN, RESOLVED, DISMISSED |
| `NotificationType` | SYSTEM, COMMENT_REPLY, SUBMISSION_RESULT, COURSE, ACHIEVEMENT |

## Models

### Identity

| Model | Fields | Constraints / indexes |
|---|---|---|
| `User` | id, email, username, passwordHash, role, isActive, lastLoginAt, createdAt, updatedAt | unique(email), unique(username), index(role) |
| `Profile` | id, userId, displayName, bio, avatarUrl, institution, location, websiteUrl, githubUrl, linkedinUrl, updatedAt | unique(userId), cascade on user delete |
| `RefreshToken` | id, userId, tokenHash, familyId, expiresAt, revokedAt, userAgent, ip, createdAt | unique(tokenHash), index(userId), index(familyId) |
| `UserActivity` | id, userId, date, problemsSolved, lessonsCompleted, quizzesTaken, articlesRead | unique(userId, date) |
| `Notification` | id, userId, type, title, body, link, readAt, createdAt | index(userId, readAt) |

### Taxonomy

| Model | Fields | Constraints |
|---|---|---|
| `Category` | id, name, slug, description, icon, color, parentId, order, isFeatured, showInNav | unique(slug), index(parentId) |
| `Tag` | id, name, slug | unique(slug) |
| `Topic` | id, name, slug, description | unique(slug) |

### Articles

| Model | Fields | Constraints |
|---|---|---|
| `Article` | id, title, slug, excerpt, content, coverImageUrl, status, difficulty?, authorId, categoryId?, readingTimeMin, viewCount, likeCount, commentCount, isFeatured, publishedAt, createdAt, updatedAt | unique(slug), index(status, publishedAt), index(categoryId), index(authorId) |
| `ArticleTag` | articleId, tagId | pk(articleId, tagId) |
| `ArticleLike` | id, userId, articleId, createdAt | unique(userId, articleId) |
| `ArticleView` | id, articleId, userId?, viewedAt | index(articleId, viewedAt) — feeds "Trending" |

### Tutorials

| Model | Fields | Constraints |
|---|---|---|
| `Tutorial` | id, title, slug, description, coverImageUrl, status, categoryId?, authorId, order, publishedAt, createdAt, updatedAt | unique(slug), index(status), index(categoryId) |
| `TutorialChapter` | id, tutorialId, title, order | index(tutorialId, order) |
| `TutorialLesson` | id, tutorialId, chapterId?, title, slug, content, order, readingTimeMin, createdAt, updatedAt | unique(tutorialId, slug), index(chapterId, order) |
| `LessonProgress` | id, userId, lessonId, completedAt | unique(userId, lessonId) |

### Courses

| Model | Fields | Constraints |
|---|---|---|
| `Course` | id, title, slug, subtitle, description, coverImageUrl, level, status, price (Decimal 10,2), isFree, durationHours, categoryId?, instructorId, enrollmentCount, ratingAvg, ratingCount, publishedAt, createdAt, updatedAt | unique(slug), index(status), index(categoryId) |
| `CourseModule` | id, courseId, title, description, order | index(courseId, order) |
| `CourseLesson` | id, moduleId, title, slug, content, videoUrl?, durationMin, order, isPreview | unique(moduleId, slug) |
| `Enrollment` | id, userId, courseId, enrolledAt, completedAt, progressPercent, lastLessonId? | unique(userId, courseId) |
| `CourseLessonProgress` | id, userId, lessonId, completedAt | unique(userId, lessonId) |

### Practice

| Model | Fields | Constraints |
|---|---|---|
| `Problem` | id, title, slug, description, difficulty, status, categoryId?, authorId, constraints, inputFormat, outputFormat, hints (String[]), editorial, expectedTimeComplexity, expectedSpaceComplexity, timeLimitMs, memoryLimitMb, points, companyTags (String[]), submissionCount, acceptedCount, publishedAt, createdAt, updatedAt | unique(slug), index(status, difficulty), index(categoryId) |
| `ProblemTopic` | problemId, topicId | pk(problemId, topicId) |
| `ProblemExample` | id, problemId, input, output, explanation, order | index(problemId) |
| `ProblemStarterCode` | id, problemId, language, code | unique(problemId, language) |
| `TestCase` | id, problemId, input, expectedOutput, isSample, order, weight | index(problemId, isSample) |
| `Submission` | id, userId, problemId, language, sourceCode, status, runtimeMs, memoryKb, passedCount, totalCount, compileOutput, errorMessage, testResults (Json), createdAt | index(userId, createdAt), index(problemId, status), index(userId, problemId) |
| `UserProblemStatus` | id, userId, problemId, state, solvedAt, lastAttemptAt | unique(userId, problemId), index(userId, state) |

### Quizzes

| Model | Fields | Constraints |
|---|---|---|
| `Quiz` | id, title, slug, description, categoryId?, difficulty, status, authorId, timeLimitMin?, attemptCount, publishedAt, createdAt, updatedAt | unique(slug), index(status, categoryId) |
| `Question` | id, quizId, prompt, explanation, order, points | index(quizId, order) |
| `QuestionOption` | id, questionId, text, isCorrect, order | index(questionId) |
| `QuizAttempt` | id, userId, quizId, status, startedAt, submittedAt, expiresAt, score, maxScore, correctCount, totalCount | index(userId, quizId), index(quizId, status) |
| `QuizAnswer` | id, attemptId, questionId, selectedOptionId?, isCorrect | unique(attemptId, questionId) |

### Community

| Model | Fields | Constraints |
|---|---|---|
| `Comment` | id, authorId, targetType, articleId?, problemId?, tutorialLessonId?, courseId?, quizId?, parentId?, content, likeCount, isDeleted, isHidden, hiddenReason, createdAt, updatedAt | index(articleId), index(problemId), index(tutorialLessonId), index(courseId), index(quizId), index(parentId) |
| `CommentLike` | id, userId, commentId | unique(userId, commentId) |
| `Bookmark` | id, userId, type, articleId?, problemId?, tutorialId?, courseId?, createdAt | unique(userId, articleId), unique(userId, problemId), unique(userId, tutorialId), unique(userId, courseId); index(userId, type) |
| `Report` | id, reporterId, targetType, commentId?, articleId?, problemId?, reportedUserId?, reason, details, status, resolvedById?, resolvedAt, resolutionNote, createdAt | index(status), index(reporterId) |

### Administration

| Model | Fields | Constraints |
|---|---|---|
| `AuditLog` | id, actorId?, action, entityType, entityId, metadata (Json), ip, createdAt | index(entityType, entityId), index(actorId), index(createdAt) |
| `SiteSetting` | key, value (Json), description, updatedById?, updatedAt | pk(key) |

## Cascade rules

- Deleting a `User` cascades to Profile, RefreshToken, UserActivity, Notification, ArticleLike, CommentLike, Bookmark, LessonProgress, CourseLessonProgress, Enrollment, Submission, UserProblemStatus, QuizAttempt. Authored content (`Article.authorId`, `Problem.authorId`, `Comment.authorId`) uses `Restrict` — users with content are deactivated, not deleted.
- Deleting content cascades to its children (tags joins, examples, test cases, lessons, questions, comments, bookmarks, likes).
- `Category.parentId` uses `SetNull`; content `categoryId` uses `SetNull`.

## Full-text search (raw migration)

```sql
ALTER TABLE "Article" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(content,'')), 'C')
  ) STORED;
CREATE INDEX "Article_search_idx" ON "Article" USING GIN ("searchVector");
```
Equivalent columns exist for `Tutorial`, `TutorialLesson`, `Course`, `Problem`, `Quiz`. The Prisma schema marks them as `Unsupported("tsvector")?`.

## Seed data

`backend/prisma/seed/` creates: 6 users (student, editor, admin, superadmin, two extra learners), ~14 categories in a two-level tree, ~30 tags, ~20 topics, ~24 articles, 3 tutorials (≈ 25 lessons), 4 courses (≈ 30 lessons), 24 problems with examples/starter code/test cases in 4 languages, 8 quizzes (≈ 60 questions), comments, bookmarks, sample submissions and activity. All prose is original placeholder content.
