<script setup lang="ts">
import { CheckCircle2, MinusCircle, RotateCcw, XCircle } from 'lucide-vue-next';
import type { QuizResult } from '~/types/api';
import { formatDateTime, percent } from '~/utils/format';

definePageMeta({ middleware: 'auth' });

const route = useRoute();
const api = useApi();
const ui = useUiStore();
const slug = computed(() => route.params.slug as string);
const attemptId = computed(() => route.params.id as string);

const { data, status, error, refresh } = await useAsyncData(() => `result:${attemptId.value}`, () => api.get<{ result: QuizResult }>(`/quiz-attempts/${attemptId.value}/result`));
const result = computed(() => data.value?.result);
const errorStatus = computed(() => (error.value as unknown as { status?: number } | null)?.status);

const pct = computed(() => (result.value ? percent(result.value.score, result.value.maxScore) : 0));
const skipped = computed(() => result.value?.questions.filter((q) => !q.selectedOptionId).length ?? 0);
const wrong = computed(() => result.value ? result.value.questions.filter((q) => q.selectedOptionId && !q.isCorrect).length : 0);
const verdict = computed(() => (pct.value >= 80 ? 'Excellent work!' : pct.value >= 50 ? 'Good effort — review the explanations below.' : 'Keep practising — every attempt makes you stronger.'));
const filter = ref<'all' | 'wrong'>('all');
const shown = computed(() => (filter.value === 'wrong' ? result.value?.questions.filter((q) => !q.isCorrect) : result.value?.questions) ?? []);

const retaking = ref(false);
async function retake() {
  retaking.value = true;
  try {
    const res = await api.post<{ attempt: { id: string } }>(`/quizzes/${slug.value}/attempts`);
    navigateTo(`/quizzes/${slug.value}/attempt/${res.attempt.id}`);
  } catch (err) {
    ui.error('Could not start a new attempt', isApiError(err) ? err.message : undefined);
  } finally {
    retaking.value = false;
  }
}

useSeoMeta({ title: () => (result.value ? `${result.value.quiz.title} — Result` : 'Quiz result'), robots: 'noindex' });
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <div v-if="status === 'pending' && !result" class="space-y-4"><UiSkeleton variant="rect" class="h-48" /><UiSkeleton :lines="6" /></div>
    <div v-else-if="status === 'error'">
      <UiEmptyState v-if="errorStatus === 409" title="This attempt is still in progress" description="Finish the quiz to see your result.">
        <UiButton :to="`/quizzes/${slug}/attempt/${attemptId}`">Continue attempt</UiButton>
      </UiEmptyState>
      <UiErrorState v-else :message="error?.message" @retry="refresh()" />
    </div>

    <template v-else-if="result">
      <UiBreadcrumbs :items="[{ label: 'Quizzes', to: '/quizzes' }, { label: result.quiz.title, to: `/quizzes/${result.quiz.slug}` }, { label: 'Result' }]" class="mb-5" />

      <section class="rounded-2xl bg-gradient-to-br from-ink to-[#2a3b31] p-6 text-white sm:p-8">
        <div class="flex flex-col items-center gap-6 sm:flex-row">
          <div class="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 120 120" class="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="12" />
              <circle cx="60" cy="60" r="52" fill="none" :stroke="pct >= 50 ? '#4ea86f' : '#f59e0b'" stroke-width="12" stroke-linecap="round" :stroke-dasharray="`${(pct / 100) * 326.7} 326.7`" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-3xl font-extrabold">{{ pct }}%</span>
              <span class="text-xs text-gray-300">{{ result.score }}/{{ result.maxScore }} pts</span>
            </div>
          </div>
          <div class="text-center sm:text-left">
            <p class="text-sm uppercase tracking-wide text-gray-300">{{ result.quiz.title }}</p>
            <h1 class="mt-1 text-3xl font-extrabold">{{ verdict }}</h1>
            <p class="mt-2 text-sm text-gray-300">{{ result.status === 'EXPIRED' ? 'Submitted automatically when time ran out · ' : '' }}{{ formatDateTime(result.submittedAt) }}</p>
            <div class="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm"><CheckCircle2 class="h-4 w-4 text-green-400" /> {{ result.correctCount }} correct</span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm"><XCircle class="h-4 w-4 text-red-400" /> {{ wrong }} wrong</span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm"><MinusCircle class="h-4 w-4 text-gray-300" /> {{ skipped }} skipped</span>
            </div>
            <div class="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <UiButton :loading="retaking" @click="retake"><RotateCcw class="h-4 w-4" /> Retake quiz</UiButton>
              <UiButton to="/quizzes" variant="secondary">More quizzes</UiButton>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-bold text-ink">Review answers</h2>
          <UiTabs v-model="filter" :tabs="[{ value: 'all', label: 'All', count: result.questions.length }, { value: 'wrong', label: 'Incorrect', count: result.questions.length - result.correctCount }]" variant="pills" size="sm" :scrollable="false" />
        </div>
        <UiEmptyState v-if="!shown.length" title="Perfect score!" description="You answered every question correctly." compact :icon="CheckCircle2" />
        <div class="space-y-4">
          <UiCard v-for="(q, i) in shown" :key="q.id" class="border-l-4" :class="q.isCorrect ? 'border-l-green-500' : q.selectedOptionId ? 'border-l-red-500' : 'border-l-gray-300'">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Question {{ result.questions.indexOf(q) + 1 }}</p>
              <UiBadge :tone="q.isCorrect ? 'green' : q.selectedOptionId ? 'red' : 'gray'" size="xs">{{ q.isCorrect ? `+${q.points}` : q.selectedOptionId ? 'Incorrect' : 'Skipped' }}</UiBadge>
            </div>
            <MarkdownContent :source="q.prompt" compact class="mt-1 font-medium" />
            <ul class="mt-3 space-y-1.5">
              <li v-for="(o, oi) in q.options" :key="o.id" class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm" :class="o.isCorrect ? 'border-green-300 bg-green-50 text-green-900' : o.id === q.selectedOptionId ? 'border-red-300 bg-red-50 text-red-900' : 'border-line text-ink-muted'">
                <span class="w-5 text-xs font-bold">{{ String.fromCharCode(65 + oi) }}</span>
                <span class="flex-1">{{ o.text }}</span>
                <CheckCircle2 v-if="o.isCorrect" class="h-4 w-4 text-green-600" />
                <XCircle v-else-if="o.id === q.selectedOptionId" class="h-4 w-4 text-red-600" />
              </li>
            </ul>
            <p v-if="q.explanation" class="mt-3 rounded-md bg-surface-muted p-3 text-sm text-ink"><span class="font-semibold">Explanation: </span>{{ q.explanation }}</p>
            <span class="hidden">{{ i }}</span>
          </UiCard>
        </div>
      </section>
    </template>
  </div>
</template>
