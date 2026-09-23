import type { CourseLevel, Difficulty, Language, SubmissionStatus } from '~/types/api';

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  const diff = Math.max(0, Date.now() - d.getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function compactNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  SCHOOL: 'School',
  BASIC: 'Basic',
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  SCHOOL: 'bg-surface-muted text-ink ring-line',
  BASIC: 'bg-sky-50 text-sky-700 ring-sky-200',
  EASY: 'bg-green-50 text-green-700 ring-green-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HARD: 'bg-red-50 text-red-700 ring-red-200',
};

export const DIFFICULTY_TEXT_CLASS: Record<Difficulty, string> = {
  SCHOOL: 'text-ink-muted',
  BASIC: 'text-sky-600',
  EASY: 'text-green-600',
  MEDIUM: 'text-amber-600',
  HARD: 'text-red-600',
};

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate and Advanced',
  ADVANCED: 'Advanced',
  ALL_LEVELS: 'Beginner to Advanced',
};

export const LANGUAGE_LABEL: Record<Language, string> = {
  PYTHON: 'Python 3',
  JAVASCRIPT: 'JavaScript (Node)',
  CPP: 'C++17',
  JAVA: 'Java 21',
};

export const LANGUAGE_MONACO: Record<Language, string> = {
  PYTHON: 'python',
  JAVASCRIPT: 'javascript',
  CPP: 'cpp',
  JAVA: 'java',
};

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
  RUNTIME_ERROR: 'Runtime Error',
  COMPILE_ERROR: 'Compilation Error',
  INTERNAL_ERROR: 'Internal Error',
};

export const STATUS_CLASS: Record<SubmissionStatus, string> = {
  PENDING: 'bg-surface-muted text-ink',
  RUNNING: 'bg-sky-50 text-sky-700',
  ACCEPTED: 'bg-green-50 text-green-700',
  WRONG_ANSWER: 'bg-red-50 text-red-700',
  TIME_LIMIT_EXCEEDED: 'bg-amber-50 text-amber-700',
  MEMORY_LIMIT_EXCEEDED: 'bg-amber-50 text-amber-700',
  RUNTIME_ERROR: 'bg-orange-50 text-orange-700',
  COMPILE_ERROR: 'bg-purple-50 text-purple-700',
  INTERNAL_ERROR: 'bg-surface-muted text-ink',
};

export function formatPrice(price: string | number, isFree: boolean): string {
  if (isFree || Number(price) === 0) return 'Free';
  return `$${Number(price).toFixed(0)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
