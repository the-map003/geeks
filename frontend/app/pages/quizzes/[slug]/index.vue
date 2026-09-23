<script setup lang="ts">
import { HelpCircle, PlayCircle, Timer, Trophy, Users } from 'lucide-vue-next';
import type { Quiz } from '~/types/api';
import { compactNumber, formatDateTime, percent } from '~/utils/format';

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const ui = useUiStore();
const slug = computed(() => route.params.slug as string);

const { data, status, error, refresh } = await useAsyncData(() => `quiz:${slug.value}`, () => api.get<{ quiz: Quiz }>(`/quizzes/${slug.value}`), { watch: [slug] });
if (status.value === 'error' && error.value) {
  const e = error.value as unknown as { status?: number };
  throw createError({ statusCode: e.status === 404 ? 404 : 500, statusMessage: e.status === 404 ? 'Quiz not found' : 'Failed to load quiz', fatal: true });
}
watch(() => auth.isAuthenticated, () => refresh());
const quiz = computed(() => data.value?.quiz);
const starting = ref(false);

async function start() {
  if (!quiz.value) return;
  if (!auth.isAuthenticated) {
    ui.info('Sign in to take quizzes');
    return navigateTo({ path: '/login', query: { redirect: route.fullPath } });
  }
  starting.value = true;
  try {
    const res = await api.post<{ attempt: { id: string }; resumed: boolean }>(`/quizzes/${quiz.value.slug}/attempts`);
    if (res.resumed) ui.info('Resuming your unfinished attempt');
    navigateTo(`/quizzes/${quiz.value.slug}/attempt/${res.attempt.id}`);
  } catch (err) {
    ui.error('Could not start the quiz', isApiError(err) ? err.message : undefined);
  } finally {
    starting.value = false;
  }
}

useContentSeo(() => ({ title: quiz.value?.title ?? 'Quiz', description: quiz.value?.description ?? '', path: `/quizzes/${slug.value}`, jsonLd: quiz.value ? { '@type': 'Quiz', name: quiz.value.title, description: quiz.value.description } : null }));
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div v-if="status === 'pending' && !quiz" class="space-y-4"><UiSkeleton variant="title" /><UiSkeleton :lines="3" /><UiSkeleton variant="rect" class="h-40" /></div>
    <template v-else-if="quiz">
      <UiBreadcrumbs :items="[{ label: 'Quizzes', to: '/quizzes' }, ...(quiz.category ? [{ label: quiz.category.name, to: `/quizzes?category=${quiz.category.slug}` }] : []), { label: quiz.title }]" class="mb-5" />
      <div class="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <DifficultyBadge :difficulty="quiz.difficulty" />
            <span v-if="quiz.category" class="text-sm font-semibold text-brand-600">{{ quiz.category.name }}</span>
          </div>
          <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{{ quiz.title }}</h1>
          <p class="mt-3 text-lg text-ink-muted">{{ quiz.description }}</p>
          <div class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
            <span class="inline-flex items-center gap-1.5"><HelpCircle class="h-4 w-4" /> {{ quiz.questionCount }} questions</span>
            <span class="inline-flex items-center gap-1.5"><Timer class="h-4 w-4" /> {{ quiz.timeLimitMin ? `${quiz.timeLimitMin} minutes` : 'No time limit' }}</span>
            <span class="inline-flex items-center gap-1.5"><Users class="h-4 w-4" /> {{ compactNumber(quiz.attemptCount) }} attempts</span>
          </div>

          <UiCard class="mt-8">
            <h2 class="font-semibold text-ink">How it works</h2>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              <li>Each question has exactly one correct option. You can move back and forth and change answers.</li>
              <li v-if="quiz.timeLimitMin">The timer starts when you begin; the attempt is submitted automatically when time runs out.</li>
              <li>Scores are calculated on the server after you submit. You will see explanations for every question.</li>
              <li>You can retake the quiz as many times as you like.</li>
            </ul>
          </UiCard>

          <ClientOnly>
            <section v-if="auth.isAuthenticated && quiz.attempts?.length" class="mt-8">
              <h2 class="mb-3 text-lg font-bold text-ink">Your attempts</h2>
              <div class="overflow-hidden rounded-lg border border-line">
                <div v-for="a in quiz.attempts" :key="a.id" class="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <UiBadge :tone="a.status === 'SUBMITTED' ? 'green' : a.status === 'IN_PROGRESS' ? 'amber' : 'gray'" size="xs">{{ a.status === 'IN_PROGRESS' ? 'In progress' : a.status === 'SUBMITTED' ? 'Submitted' : 'Expired' }}</UiBadge>
                  <span class="text-sm text-ink-muted">{{ formatDateTime(a.submittedAt ?? a.startedAt) }}</span>
                  <span v-if="a.status !== 'IN_PROGRESS'" class="text-sm font-semibold text-ink">{{ a.score }}/{{ a.maxScore }} ({{ percent(a.score, a.maxScore) }}%)</span>
                  <span class="flex-1" />
                  <NuxtLink v-if="a.status === 'IN_PROGRESS'" :to="`/quizzes/${quiz.slug}/attempt/${a.id}`" class="text-sm font-semibold text-brand-600 hover:underline">Continue</NuxtLink>
                  <NuxtLink v-else :to="`/quizzes/${quiz.slug}/result/${a.id}`" class="text-sm font-semibold text-brand-600 hover:underline">Review</NuxtLink>
                </div>
              </div>
            </section>
          </ClientOnly>

          <div class="mt-10"><CommentThread target-type="QUIZ" :target-id="quiz.id" /></div>
        </div>

        <aside>
          <UiCard class="sticky top-32">
            <ClientOnly>
              <div v-if="auth.isAuthenticated && quiz.bestScore !== null && quiz.bestScore !== undefined" class="mb-4 rounded-lg bg-brand-50 p-4 text-center">
                <p class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700"><Trophy class="h-4 w-4" /> Your best score</p>
                <p class="mt-1 text-3xl font-extrabold text-brand-700">{{ quiz.bestScore }}<span class="text-base font-medium text-brand-600">/{{ quiz.attempts?.[0]?.maxScore ?? quiz.questionCount }}</span></p>
              </div>
            </ClientOnly>
            <UiButton block size="lg" :loading="starting" @click="start">
              <PlayCircle class="h-5 w-5" /> {{ quiz.activeAttemptId ? 'Continue attempt' : 'Start quiz' }}
            </UiButton>
            <p class="mt-3 text-center text-xs text-ink-muted">{{ quiz.questionCount }} questions{{ quiz.timeLimitMin ? ` · ${quiz.timeLimitMin} min` : '' }}</p>
            <div class="mt-4 border-t border-line pt-4 text-sm text-ink-muted">
              <p>Created by <NuxtLink :to="`/u/${quiz.author.username}`" class="font-medium text-ink hover:text-brand-700">{{ quiz.author.displayName }}</NuxtLink></p>
            </div>
            <ShareMenu :title="quiz.title" size="sm" class="mt-3" />
          </UiCard>
        </aside>
      </div>
    </template>
  </div>
</template>
