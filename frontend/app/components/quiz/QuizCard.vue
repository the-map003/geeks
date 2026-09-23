<script setup lang="ts">
import { HelpCircle, Timer, Users } from 'lucide-vue-next';
import type { QuizSummary } from '~/types/api';
import { compactNumber } from '~/utils/format';

defineProps<{ quiz: QuizSummary }>();
</script>

<template>
  <div class="flex h-full flex-col rounded-lg border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
    <div class="flex items-start justify-between gap-2">
      <p v-if="quiz.category" class="text-xs font-semibold text-brand-600">{{ quiz.category.name }}</p>
      <DifficultyBadge :difficulty="quiz.difficulty" size="xs" />
    </div>
    <h3 class="mt-2 text-base font-semibold leading-snug text-ink">
      <NuxtLink :to="`/quizzes/${quiz.slug}`" class="hover:text-brand-700">{{ quiz.title }}</NuxtLink>
    </h3>
    <p class="mt-1.5 line-clamp-2 flex-1 text-sm text-ink-muted">{{ quiz.description }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      <span class="inline-flex items-center gap-1"><HelpCircle class="h-3.5 w-3.5" /> {{ quiz.questionCount }} questions</span>
      <span v-if="quiz.timeLimitMin" class="inline-flex items-center gap-1"><Timer class="h-3.5 w-3.5" /> {{ quiz.timeLimitMin }} min</span>
      <span class="inline-flex items-center gap-1"><Users class="h-3.5 w-3.5" /> {{ compactNumber(quiz.attemptCount) }} attempts</span>
    </div>
    <UiButton :to="`/quizzes/${quiz.slug}`" variant="secondary" size="sm" class="mt-4 w-full">Attempt Now</UiButton>
  </div>
</template>
