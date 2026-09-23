<script setup lang="ts">
import type { Difficulty } from '~/types/api';
import { LANGUAGE_LABEL } from '~/utils/format';

definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'ADMIN' });
useSeoMeta({ title: 'Analytics · Admin', robots: 'noindex' });

type Point = { date: string; value: number };
interface Analytics {
  range: string;
  series: Record<'signups' | 'submissions' | 'accepted' | 'views' | 'quizAttempts' | 'comments', Point[]>;
  topProblems: Array<{ id: string; title: string; slug: string; submissionCount: number; acceptedCount: number; difficulty: Difficulty }>;
  topArticles: Array<{ id: string; title: string; slug: string; viewCount: number; likeCount: number }>;
  languages: Array<{ language: keyof typeof LANGUAGE_LABEL; count: number }>;
}

const api = useApi();
const range = useQueryParam('range', '30d');
const { data, status, error, refresh } = await useAsyncData(() => `analytics:${range.value}`, () => api.get<Analytics>('/admin/analytics', { range: range.value }), { watch: [range] });

// Categorical slots from the validated reference palette (adjacent pair blue/orange).
const BLUE = '#2a78d6';
const ORANGE = '#eb6834';

const labels = computed(() => data.value?.series.signups.map((p) => p.date) ?? []);
const vals = (k: keyof Analytics['series']) => data.value?.series[k].map((p) => p.value) ?? [];
const sum = (k: keyof Analytics['series']) => vals(k).reduce((s, v) => s + v, 0);
</script>

<template>
  <div>
    <AdminPageHeader title="Analytics" subtitle="Platform activity over time. All charts share the range filter.">
      <UiTabs v-model="range" :tabs="[{ value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }]" variant="pills" size="sm" :scrollable="false" />
    </AdminPageHeader>

    <div v-if="status === 'pending' && !data" class="grid gap-4 lg:grid-cols-2"><UiSkeleton v-for="i in 4" :key="i" variant="rect" class="h-64" /></div>
    <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
    <div v-else-if="data" :class="status === 'pending' ? 'opacity-60 transition-opacity' : ''">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiStatTile label="New signups" :value="sum('signups')" :hint="`in the last ${range.replace('d', ' days')}`" tone="brand" />
        <UiStatTile label="Submissions" :value="sum('submissions')" :hint="`${sum('accepted')} accepted`" tone="blue" />
        <UiStatTile label="Article views" :value="sum('views')" tone="purple" />
        <UiStatTile label="Quiz attempts" :value="sum('quizAttempts')" :hint="`${sum('comments')} comments posted`" tone="amber" />
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-2">
        <LineChart title="Signups per day" :labels="labels" :series="[{ name: 'Signups', values: vals('signups'), color: BLUE }]" area />
        <LineChart title="Submissions per day" subtitle="All submissions vs. accepted verdicts" :labels="labels" :series="[{ name: 'Submissions', values: vals('submissions'), color: BLUE }, { name: 'Accepted', values: vals('accepted'), color: ORANGE }]" />
        <LineChart title="Article views per day" :labels="labels" :series="[{ name: 'Views', values: vals('views'), color: BLUE }]" area />
        <LineChart title="Quiz attempts per day" :labels="labels" :series="[{ name: 'Attempts', values: vals('quizAttempts'), color: BLUE }]" area />
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        <BarList title="Most submitted problems" subtitle="All time" :items="data.topProblems.map((p) => ({ label: p.title, value: p.submissionCount, to: `/admin/problems/${p.id}`, hint: `${p.submissionCount ? Math.round((p.acceptedCount / p.submissionCount) * 100) : 0}% acc.` }))" :color="BLUE" />
        <BarList title="Most viewed articles" subtitle="All time" :items="data.topArticles.map((a) => ({ label: a.title, value: a.viewCount, to: `/admin/articles/${a.id}`, hint: `${a.likeCount} likes` }))" :color="BLUE" />
        <BarList title="Submission languages" :subtitle="`Last ${range.replace('d', ' days')}`" :items="data.languages.map((l) => ({ label: LANGUAGE_LABEL[l.language], value: l.count }))" :color="BLUE" />
      </div>
    </div>
  </div>
</template>
