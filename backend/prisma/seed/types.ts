/**
 * Shared shapes for seed content. Content files under ./data export arrays of these.
 * All prose is original placeholder text written for this academic project.
 */

export type SeedDifficulty = 'SCHOOL' | 'BASIC' | 'EASY' | 'MEDIUM' | 'HARD';
export type SeedLanguage = 'PYTHON' | 'JAVASCRIPT' | 'CPP' | 'JAVA';
export type SeedCourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';

/** Keys of demo users created by users.ts */
export type SeedUserKey = 'student' | 'editor' | 'admin' | 'superadmin' | 'learner2' | 'learner3';

export interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  icon: string; // lucide icon name, e.g. "binary", "code-2"
  color: string; // hex accent
  isFeatured?: boolean;
  showInNav?: boolean;
  children?: Array<{ name: string; slug: string; description: string; icon?: string }>;
}

export interface SeedTag {
  name: string;
  slug: string;
}

export interface SeedTopic {
  name: string;
  slug: string;
  description: string;
}

export interface SeedArticle {
  title: string;
  slug: string;
  excerpt: string;
  /** Markdown. Multi-language code tabs use a `::: tabs` … `:::` container wrapping fenced blocks. */
  content: string;
  categorySlug: string;
  tags: string[]; // tag slugs
  difficulty?: SeedDifficulty;
  authorKey: SeedUserKey;
  isFeatured?: boolean;
  publishedDaysAgo: number;
  viewCount?: number;
}

export interface SeedTutorialLesson {
  title: string;
  slug: string;
  content: string; // Markdown
  readingTimeMin?: number;
}

export interface SeedTutorialChapter {
  title: string;
  lessons: SeedTutorialLesson[];
}

export interface SeedTutorial {
  title: string;
  slug: string;
  description: string;
  categorySlug: string;
  authorKey: SeedUserKey;
  order: number;
  chapters: SeedTutorialChapter[];
}

export interface SeedCourseLesson {
  title: string;
  slug: string;
  content: string; // Markdown
  durationMin: number;
  isPreview?: boolean;
}

export interface SeedCourseModule {
  title: string;
  description: string;
  lessons: SeedCourseLesson[];
}

export interface SeedCourse {
  title: string;
  slug: string;
  subtitle: string;
  description: string; // Markdown
  level: SeedCourseLevel;
  price: number; // 0 for free
  durationHours: number;
  categorySlug: string;
  instructorKey: SeedUserKey;
  isFeatured?: boolean;
  ratingAvg: number;
  ratingCount: number;
  enrollmentCount: number;
  modules: SeedCourseModule[];
}

export interface SeedProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface SeedTestCase {
  input: string;
  expectedOutput: string;
  isSample?: boolean;
}

export interface SeedProblem {
  title: string;
  slug: string;
  description: string; // Markdown statement
  difficulty: SeedDifficulty;
  categorySlug: string;
  topics: string[]; // topic slugs
  constraints: string; // Markdown bullet list
  inputFormat: string;
  outputFormat: string;
  hints: string[];
  editorial: string; // Markdown, may include ::: tabs code
  expectedTimeComplexity: string;
  expectedSpaceComplexity: string;
  points: number;
  companyTags: string[];
  authorKey: SeedUserKey;
  examples: SeedProblemExample[];
  /** Starter code for every supported language. Programs read stdin and write stdout. */
  starterCode: Record<SeedLanguage, string>;
  testCases: SeedTestCase[];
  /** Working solutions used by the seed validator and admin "validate" action. */
  referenceSolutions: Partial<Record<SeedLanguage, string>>;
  isProblemOfTheDay?: boolean;
}

export interface SeedQuizQuestion {
  prompt: string; // Markdown
  explanation: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  points?: number;
}

export interface SeedQuiz {
  title: string;
  slug: string;
  description: string;
  categorySlug: string;
  difficulty: SeedDifficulty;
  timeLimitMin?: number;
  authorKey: SeedUserKey;
  questions: SeedQuizQuestion[];
}
