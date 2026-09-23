// Shared API payload types mirrored from the backend (docs/API_SPEC.md).

export type Role = 'USER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Difficulty = 'SCHOOL' | 'BASIC' | 'EASY' | 'MEDIUM' | 'HARD';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type Language = 'PYTHON' | 'JAVASCRIPT' | 'CPP' | 'JAVA';
export type SubmissionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'INTERNAL_ERROR';
export type ProblemUserState = 'ATTEMPTED' | 'SOLVED';
export type BookmarkType = 'ARTICLE' | 'PROBLEM' | 'TUTORIAL' | 'COURSE';
export type CommentTarget = 'ARTICLE' | 'PROBLEM' | 'TUTORIAL_LESSON' | 'COURSE' | 'QUIZ';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface FieldError {
  path: string;
  message: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors: FieldError[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Profile {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  institution: string | null;
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  profile: Profile;
}

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
  profile: Profile;
}

export interface UserStats {
  solved: { total: number; byDifficulty: Record<Difficulty, number> };
  attempted: number;
  submissions: number;
  quizAttempts: number;
  lessonsCompleted: number;
  coursesEnrolled: number;
  articlesLiked: number;
  streak: { current: number; longest: number; activeDays: number };
}

export interface AuthorSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  order: number;
  isFeatured: boolean;
  showInNav: boolean;
  children?: Category[];
  counts?: { articles: number; tutorials: number; problems: number; courses: number; quizzes: number };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  problemCount?: number;
}

export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  difficulty: Difficulty | null;
  readingTimeMin: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isFeatured: boolean;
  publishedAt: string | null;
  updatedAt: string;
  author: AuthorSummary;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  tags: Tag[];
}

export interface Article extends ArticleSummary {
  content: string;
  status: ContentStatus;
  liked?: boolean;
  bookmarked?: boolean;
}

export interface TutorialLessonSummary {
  id: string;
  title: string;
  slug: string;
  order: number;
  readingTimeMin: number;
  completed?: boolean;
}

export interface TutorialChapter {
  id: string;
  title: string;
  order: number;
  lessons: TutorialLessonSummary[];
}

export interface TutorialSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  lessonCount: number;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  author: AuthorSummary;
  progressPercent?: number;
}

export interface Tutorial extends TutorialSummary {
  chapters: TutorialChapter[];
  completedLessonIds?: string[];
  bookmarked?: boolean;
}

export interface TutorialLesson extends TutorialLessonSummary {
  content: string;
  updatedAt: string;
  tutorial: Pick<TutorialSummary, 'id' | 'title' | 'slug' | 'description' | 'category'>;
  chapters: TutorialChapter[];
  prev: TutorialLessonSummary | null;
  next: TutorialLessonSummary | null;
  completedLessonIds?: string[];
  progressPercent?: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  coverImageUrl: string | null;
  level: CourseLevel;
  price: string;
  isFree: boolean;
  durationHours: number;
  enrollmentCount: number;
  ratingAvg: string;
  ratingCount: number;
  isFeatured: boolean;
  lessonCount: number;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  instructor: AuthorSummary;
}

export interface CourseLessonSummary {
  id: string;
  title: string;
  slug: string;
  durationMin: number;
  order: number;
  isPreview: boolean;
  completed?: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: CourseLessonSummary[];
}

export interface Enrollment {
  id: string;
  enrolledAt: string;
  completedAt: string | null;
  progressPercent: number;
  lastLessonId: string | null;
}

export interface Course extends CourseSummary {
  description: string;
  modules: CourseModule[];
  instructorProfile: Profile;
  enrollment?: Enrollment | null;
  bookmarked?: boolean;
}

export interface CourseLesson extends CourseLessonSummary {
  content: string;
  videoUrl: string | null;
  module: Pick<CourseModule, 'id' | 'title'>;
  course: Pick<CourseSummary, 'id' | 'title' | 'slug'>;
  modules: CourseModule[];
  prev: CourseLessonSummary | null;
  next: CourseLessonSummary | null;
  progressPercent: number;
}

export interface ProblemSummary {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  points: number;
  submissionCount: number;
  acceptedCount: number;
  accuracy: number;
  companyTags: string[];
  topics: Topic[];
  userState: ProblemUserState | null;
}

export interface ProblemExample {
  id: string;
  input: string;
  output: string;
  explanation: string | null;
}

export interface Problem extends ProblemSummary {
  description: string;
  constraints: string | null;
  inputFormat: string | null;
  outputFormat: string | null;
  hints: string[];
  editorial?: string | null;
  expectedTimeComplexity: string | null;
  expectedSpaceComplexity: string | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  examples: ProblemExample[];
  starterCode: Record<Language, string>;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  bookmarked?: boolean;
}

export interface TestResult {
  id: string;
  status: SubmissionStatus;
  isSample: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  stderr?: string;
  runtimeMs: number;
  memoryKb?: number;
}

export interface RunResult {
  status: SubmissionStatus;
  compileOutput: string | null;
  results: TestResult[];
  stdout?: string;
  stderr?: string;
  runtimeMs: number;
}

export interface Submission {
  id: string;
  language: Language;
  status: SubmissionStatus;
  runtimeMs: number | null;
  memoryKb: number | null;
  passedCount: number;
  totalCount: number;
  compileOutput: string | null;
  errorMessage: string | null;
  createdAt: string;
  judgedAt: string | null;
  sourceCode?: string;
  testResults?: TestResult[];
  problem: Pick<ProblemSummary, 'id' | 'title' | 'slug' | 'difficulty'>;
}

export interface QuizSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  timeLimitMin: number | null;
  questionCount: number;
  attemptCount: number;
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
}

export interface QuizAttemptSummary {
  id: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string | null;
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
}

export interface Quiz extends QuizSummary {
  author: AuthorSummary;
  bestScore?: number | null;
  attempts?: QuizAttemptSummary[];
  activeAttemptId?: string | null;
}

export interface AttemptQuestion {
  id: string;
  prompt: string;
  order: number;
  points: number;
  options: Array<{ id: string; text: string; order: number }>;
}

export interface QuizAttempt extends QuizAttemptSummary {
  quiz: Pick<QuizSummary, 'id' | 'title' | 'slug' | 'timeLimitMin'>;
  questions: AttemptQuestion[];
  answers: Record<string, string | null>;
}

export interface QuizResult extends QuizAttemptSummary {
  quiz: Pick<QuizSummary, 'id' | 'title' | 'slug'>;
  questions: Array<{
    id: string;
    prompt: string;
    explanation: string | null;
    points: number;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
    selectedOptionId: string | null;
    isCorrect: boolean;
  }>;
}

export interface Comment {
  id: string;
  content: string;
  likeCount: number;
  replyCount: number;
  isDeleted: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  author: AuthorSummary & { role: Role };
  liked?: boolean;
  replies?: Comment[];
}

export interface Bookmark {
  id: string;
  type: BookmarkType;
  createdAt: string;
  target:
    | { type: 'ARTICLE'; item: ArticleSummary }
    | { type: 'PROBLEM'; item: ProblemSummary }
    | { type: 'TUTORIAL'; item: TutorialSummary }
    | { type: 'COURSE'; item: CourseSummary };
}

export interface SearchItem {
  type: 'article' | 'tutorial' | 'course' | 'problem' | 'quiz';
  id: string;
  title: string;
  slug: string;
  url: string;
  excerpt: string;
  meta: Record<string, string | number | null>;
  rank: number;
}

export interface SearchResponse extends Paginated<SearchItem> {
  counts: Record<'all' | 'articles' | 'tutorials' | 'courses' | 'problems' | 'quizzes', number>;
}

export interface HomeData {
  featuredCategories: Category[];
  featuredArticles: ArticleSummary[];
  latestArticles: ArticleSummary[];
  tutorials: TutorialSummary[];
  popularProblems: ProblemSummary[];
  problemOfTheDay: ProblemSummary | null;
  courses: CourseSummary[];
  quizzes: QuizSummary[];
  trending: ArticleSummary[];
  stats: { articles: number; problems: number; courses: number; quizzes: number; learners: number };
}
