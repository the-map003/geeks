<script setup lang="ts">
import { Code2, Flame, Trophy, Zap, AlertTriangle } from 'lucide-vue-next';
import type { Difficulty, ProblemSummary, Topic } from '~/types/api';
import { DIFFICULTY_LABEL, DIFFICULTY_TEXT_CLASS } from '~/utils/format';

interface Overview {
  total: number;
  byDifficulty: Record<Difficulty, number>;
  topics: Topic[];
  problemOfTheDay: ProblemSummary | null;
  recent: ProblemSummary[];
  executor: { available: boolean; driver: string | null; languages: string[] };
}

const api = useApi();
const auth = useAuthStore();
const { data, status, error, refresh } = await useAsyncData('practice-overview', () => api.get<Overview>('/problems/overview', undefined, { auth: false }));

const difficulties: Difficulty[] = ['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD'];

useContentSeo({ title: 'Practice Coding', description: 'Practice data structures and algorithms with hundreds of problems, a problem of the day and an online judge.', path: '/practice' });
</script>

<template>
  <div>
    <section class="bg-gradient-to-br from-ink via-[#1f2f26] to-brand-900 text-white">
      <div class="mx-auto grid max-w-[1240px] gap-8 px-4 py-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide"><Zap class="h-3.5 w-3.5" /> Practice</p>
          <h1 class="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Sharpen your coding skills</h1>
          <p class="mt-4 max-w-xl text-lg text-gray-300">Solve problems by topic and difficulty, run your code against sample tests and submit to the judge. Track what you have solved and keep your streak alive.</p>
          <div class="mt-7 flex flex-wrap gap-3">
            <UiButton to="/problems" size="lg">Browse all problems</UiButton>
            <UiButton v-if="!auth.isAuthenticated" to="/register" size="lg" variant="secondary">Create free account</UiButton>
          </div>
          <div v-if="data && !data.executor.available" class="mt-6 inline-flex items-start gap-2 rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
            <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" /> The code execution service is offline right now. You can still read problems and editorials.
          </div>
        </div>
        <div>
          <template v-if="status === 'pending'"><UiSkeleton variant="rect" class="h-56 bg-white/10" /></template>
          <div v-else-if="data?.problemOfTheDay" class="rounded-xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <p class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-300"><Flame class="h-4 w-4" /> Problem of the day</p>
            <h2 class="mt-3 text-2xl font-bold">{{ data.problemOfTheDay.title }}</h2>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-300">
              <DifficultyBadge :difficulty="data.problemOfTheDay.difficulty" />
              <span>{{ data.problemOfTheDay.accuracy }}% accuracy</span><span>·</span><span>{{ data.problemOfTheDay.points }} points</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5">
              <span v-for="t in data.problemOfTheDay.topics" :key="t.id" class="rounded bg-white/10 px-2 py-0.5 text-xs">{{ t.name }}</span>
            </div>
            <UiButton :to="`/problems/${data.problemOfTheDay.slug}`" class="mt-5" size="lg">Solve today's problem</UiButton>
          </div>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-[1240px] space-y-14 px-4 py-12">
      <UiErrorState v-if="status === 'error'" :message="error?.message" @retry="refresh()" />

      <section>
        <UiSectionHeader title="Pick your level" subtitle="From school-level warm-ups to hard interview questions." />
        <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <NuxtLink v-for="d in difficulties" :key="d" :to="{ path: '/problems', query: { difficulty: d } }" class="rounded-lg border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
            <p class="text-sm font-semibold" :class="DIFFICULTY_TEXT_CLASS[d]">{{ DIFFICULTY_LABEL[d] }}</p>
            <p class="mt-1 text-3xl font-bold text-ink">{{ status === 'pending' ? '—' : data?.byDifficulty[d] ?? 0 }}</p>
            <p class="text-xs text-ink-muted">problems</p>
          </NuxtLink>
        </div>
      </section>

      <section>
        <UiSectionHeader title="Practice by topic" subtitle="Focus on one technique at a time." to="/problems" link-label="All problems" />
        <div v-if="status === 'pending'" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><UiSkeleton v-for="i in 8" :key="i" variant="rect" class="h-16" /></div>
        <div v-else-if="data?.topics.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink v-for="t in data.topics" :key="t.id" :to="{ path: '/problems', query: { topic: t.slug } }" class="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 transition hover:border-brand-400 hover:bg-brand-50/40">
            <span class="font-medium text-ink">{{ t.name }}</span>
            <span class="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted">{{ t.problemCount }}</span>
          </NuxtLink>
        </div>
        <UiEmptyState v-else title="No topics yet" compact />
      </section>

      <section class="grid gap-8 lg:grid-cols-2">
        <div>
          <UiSectionHeader title="Recently added" to="/problems?sort=newest" />
          <div class="overflow-hidden rounded-lg border border-line">
            <template v-if="status === 'pending'"><UiSkeleton v-for="i in 5" :key="i" variant="row" /></template>
            <template v-else-if="data?.recent.length"><ProblemRow v-for="p in data.recent" :key="p.id" :problem="p" dense /></template>
            <UiEmptyState v-else title="No problems yet" compact :icon="Code2" />
          </div>
        </div>
        <div>
          <UiSectionHeader title="How it works" />
          <ol class="space-y-3">
            <li v-for="(step, i) in ['Pick a problem and read the statement, examples and constraints.', 'Write your solution in Python, JavaScript, C++ or Java using the built-in editor.', 'Run against the sample tests or your own input to debug quickly.', 'Submit to the judge to run hidden tests and record your verdict.']" :key="i" class="flex gap-3 rounded-lg border border-line bg-surface p-4">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{{ i + 1 }}</span>
              <p class="text-sm text-ink">{{ step }}</p>
            </li>
          </ol>
          <p v-if="data?.executor.available" class="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-muted"><Trophy class="h-3.5 w-3.5" /> Judge online · languages: {{ data.executor.languages.join(', ') }}</p>
        </div>
      </section>
    </div>
  </div>
</template>
