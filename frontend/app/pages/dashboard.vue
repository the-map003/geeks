<script setup lang="ts">
import { Bookmark, CheckCircle2, Code2, Flame, GraduationCap, HelpCircle, Bell, BookOpen } from 'lucide-vue-next';
import type { CourseSummary, Enrollment, ProblemSummary, Submission, TutorialSummary, UserStats, Difficulty } from '~/types/api';
import { DIFFICULTY_LABEL, DIFFICULTY_TEXT_CLASS, formatDateTime, percent, timeAgo } from '~/utils/format';

definePageMeta({ middleware: 'auth' });
useSeoMeta({ title: 'Dashboard', robots: 'noindex' });

interface Dashboard {
  stats: UserStats;
  continueLearning: { tutorials: TutorialSummary[]; courses: Array<{ enrollment: Enrollment & { lastLessonSlug: string | null }; course: CourseSummary }> };
  recentSubmissions: Submission[];
  recentAttempts: Array<{ id: string; status: string; submittedAt: string; score: number; maxScore: number; quiz: { title: string; slug: string; difficulty: Difficulty } }>;
  bookmarkCount: number;
  notifications: Array<{ id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }>;
  recommendedProblems: ProblemSummary[];
}

const api = useApi();
const auth = useAuthStore();
const { data, status, error, refresh } = await useAsyncData('dashboard', () => api.get<Dashboard>('/users/me/dashboard'));
const { data: activity } = useAsyncData('dashboard-activity', () => api.get<{ activity: Array<{ date: string; count: number }> }>('/users/me/activity', { days: 84 }), { lazy: true });

const d = computed(() => data.value);
const difficulties: Difficulty[] = ['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD'];
const greeting = computed(() => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
});

// 12-week heatmap grid
const heatmap = computed(() => {
  const map = new Map((activity.value?.activity ?? []).map((a) => [a.date, a.count]));
  const cells: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const dt = new Date(today);
    dt.setUTCDate(today.getUTCDate() - i);
    const key = dt.toISOString().slice(0, 10);
    cells.push({ date: key, count: map.get(key) ?? 0 });
  }
  return cells;
});
function heatClass(c: number) {
  if (c === 0) return 'bg-surface-muted';
  if (c < 2) return 'bg-brand-200';
  if (c < 4) return 'bg-brand-400';
  return 'bg-brand-600';
}

async function markAllRead() {
  await api.post('/users/me/notifications/read');
  refresh();
}
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 py-8">
    <div v-if="status === 'pending' && !d" class="space-y-6">
      <UiSkeleton variant="title" />
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><UiSkeleton v-for="i in 4" :key="i" variant="rect" class="h-24" /></div>
      <UiSkeleton variant="rect" class="h-64" />
    </div>
    <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />

    <template v-else-if="d">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-ink">{{ greeting }}, {{ auth.displayName }} 👋</h1>
          <p class="mt-1 text-ink-muted">Here is what is happening with your learning.</p>
        </div>
        <UiButton to="/problems" size="sm"><Code2 class="h-4 w-4" /> Practice now</UiButton>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiStatTile label="Current streak" :value="`${d.stats.streak.current} day${d.stats.streak.current === 1 ? '' : 's'}`" :hint="`Longest: ${d.stats.streak.longest} · Active days: ${d.stats.streak.activeDays}`" :icon="Flame" tone="amber" />
        <UiStatTile label="Problems solved" :value="d.stats.solved.total" :hint="`${d.stats.attempted} attempted · ${d.stats.submissions} submissions`" :icon="CheckCircle2" tone="brand" />
        <UiStatTile label="Lessons completed" :value="d.stats.lessonsCompleted" :hint="`${d.stats.coursesEnrolled} course${d.stats.coursesEnrolled === 1 ? '' : 's'} enrolled`" :icon="BookOpen" tone="blue" />
        <UiStatTile label="Quizzes taken" :value="d.stats.quizAttempts" :hint="`${d.bookmarkCount} bookmarks saved`" :icon="HelpCircle" tone="purple" />
      </div>

      <div class="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div class="space-y-8">
          <!-- Continue learning -->
          <section>
            <UiSectionHeader title="Continue learning" to="/tutorials" link-label="Browse tutorials" />
            <div v-if="d.continueLearning.courses.length || d.continueLearning.tutorials.length" class="grid gap-4 sm:grid-cols-2">
              <UiCard v-for="e in d.continueLearning.courses" :key="e.course.id" hover :to="`/courses/${e.course.slug}${e.enrollment.lastLessonSlug ? `/learn/${e.enrollment.lastLessonSlug}` : ''}`">
                <p class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><GraduationCap class="h-3.5 w-3.5" /> Course</p>
                <p class="mt-1 font-semibold text-ink">{{ e.course.title }}</p>
                <UiProgress :value="e.enrollment.progressPercent" size="xs" show-label class="mt-3" />
              </UiCard>
              <UiCard v-for="t in d.continueLearning.tutorials" :key="t.id" hover :to="`/tutorials/${t.slug}`">
                <p class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><BookOpen class="h-3.5 w-3.5" /> Tutorial</p>
                <p class="mt-1 font-semibold text-ink">{{ t.title }}</p>
                <UiProgress :value="t.progressPercent ?? 0" size="xs" show-label class="mt-3" />
              </UiCard>
            </div>
            <UiEmptyState v-else title="Nothing in progress" description="Start a tutorial or enrol in a course to see it here." compact :icon="BookOpen">
              <UiButton to="/tutorials" size="sm" variant="secondary">Explore tutorials</UiButton>
              <UiButton to="/courses" size="sm" variant="secondary">Browse courses</UiButton>
            </UiEmptyState>
          </section>

          <!-- Recent submissions -->
          <section>
            <UiSectionHeader title="Recent submissions" to="/submissions" />
            <div v-if="d.recentSubmissions.length" class="overflow-hidden rounded-lg border border-line">
              <NuxtLink v-for="s in d.recentSubmissions" :key="s.id" :to="`/problems/${s.problem.slug}`" class="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-surface-muted">
                <StatusBadge :status="s.status" size="xs" />
                <span class="min-w-0 flex-1 truncate text-sm font-medium text-ink">{{ s.problem.title }}</span>
                <DifficultyBadge :difficulty="s.problem.difficulty" size="xs" class="hidden sm:inline-flex" />
                <span class="text-xs text-ink-muted">{{ timeAgo(s.createdAt) }}</span>
              </NuxtLink>
            </div>
            <UiEmptyState v-else title="No submissions yet" description="Solve your first problem to see it here." compact :icon="Code2">
              <UiButton to="/problems" size="sm" variant="secondary">Pick a problem</UiButton>
            </UiEmptyState>
          </section>

          <!-- Recommended -->
          <section v-if="d.recommendedProblems.length">
            <UiSectionHeader title="Recommended for you" subtitle="Unsolved problems to try next." />
            <div class="overflow-hidden rounded-lg border border-line"><ProblemRow v-for="p in d.recommendedProblems" :key="p.id" :problem="p" dense /></div>
          </section>
        </div>

        <div class="space-y-8">
          <!-- Activity heatmap -->
          <UiCard>
            <p class="text-sm font-semibold text-ink">Activity · last 12 weeks</p>
            <div class="mt-3 grid grid-flow-col grid-rows-7 gap-1">
              <span v-for="c in heatmap" :key="c.date" class="h-3 w-3 rounded-sm" :class="heatClass(c.count)" :title="`${c.date}: ${c.count} activities`" />
            </div>
            <p class="mt-2 text-xs text-ink-muted">Solving problems, completing lessons, taking quizzes and reading articles all count.</p>
          </UiCard>

          <!-- Solved by difficulty -->
          <UiCard>
            <p class="text-sm font-semibold text-ink">Solved by difficulty</p>
            <ul class="mt-3 space-y-2">
              <li v-for="diff in difficulties" :key="diff" class="flex items-center gap-3 text-sm">
                <span class="w-16 font-medium" :class="DIFFICULTY_TEXT_CLASS[diff]">{{ DIFFICULTY_LABEL[diff] }}</span>
                <UiProgress :value="percent(d.stats.solved.byDifficulty[diff], Math.max(1, d.stats.solved.total))" size="xs" class="flex-1" />
                <span class="w-6 text-right text-ink-muted">{{ d.stats.solved.byDifficulty[diff] }}</span>
              </li>
            </ul>
          </UiCard>

          <!-- Quiz attempts -->
          <UiCard>
            <div class="flex items-center justify-between"><p class="text-sm font-semibold text-ink">Recent quiz results</p><NuxtLink to="/quizzes" class="text-xs font-medium text-brand-600 hover:underline">Take a quiz</NuxtLink></div>
            <ul v-if="d.recentAttempts.length" class="mt-3 divide-y divide-line">
              <li v-for="a in d.recentAttempts" :key="a.id" class="flex items-center gap-3 py-2 text-sm">
                <NuxtLink :to="`/quizzes/${a.quiz.slug}/result/${a.id}`" class="min-w-0 flex-1 truncate font-medium text-ink hover:text-brand-700">{{ a.quiz.title }}</NuxtLink>
                <span class="font-semibold" :class="percent(a.score, a.maxScore) >= 50 ? 'text-green-600' : 'text-amber-600'">{{ percent(a.score, a.maxScore) }}%</span>
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-ink-muted">No quiz attempts yet.</p>
          </UiCard>

          <!-- Notifications -->
          <UiCard>
            <div class="flex items-center justify-between">
              <p class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink"><Bell class="h-4 w-4" /> Notifications</p>
              <button v-if="d.notifications.some((n) => !n.readAt)" type="button" class="text-xs font-medium text-brand-600 hover:underline" @click="markAllRead">Mark all read</button>
            </div>
            <ul v-if="d.notifications.length" class="mt-3 divide-y divide-line">
              <li v-for="n in d.notifications" :key="n.id" class="py-2 text-sm" :class="n.readAt ? 'text-ink-muted' : 'text-ink'">
                <component :is="n.link ? 'NuxtLink' : 'div'" :to="n.link ?? undefined" class="block">
                  <p class="font-medium">{{ n.title }}</p>
                  <p v-if="n.body" class="text-xs text-ink-muted">{{ n.body }}</p>
                  <p class="text-[11px] text-ink-muted">{{ formatDateTime(n.createdAt) }}</p>
                </component>
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-ink-muted">You are all caught up.</p>
          </UiCard>

          <UiCard hover to="/bookmarks" class="flex items-center gap-3">
            <Bookmark class="h-5 w-5 text-brand-600" />
            <span class="text-sm font-medium text-ink">{{ d.bookmarkCount }} saved bookmark{{ d.bookmarkCount === 1 ? '' : 's' }}</span>
          </UiCard>
        </div>
      </div>
    </template>
  </div>
</template>
