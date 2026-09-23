<script setup lang="ts">
import type { Difficulty, UserStats } from '~/types/api';
import { DIFFICULTY_LABEL, DIFFICULTY_TEXT_CLASS, percent } from '~/utils/format';

defineProps<{ stats: UserStats }>();
const difficulties: Difficulty[] = ['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD'];
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <UiCard>
      <p class="text-sm font-semibold text-ink">Problems solved</p>
      <p class="mt-1 text-4xl font-extrabold text-brand-600">{{ stats.solved.total }}</p>
      <ul class="mt-4 space-y-2">
        <li v-for="d in difficulties" :key="d" class="flex items-center gap-3 text-sm">
          <span class="w-16 font-medium" :class="DIFFICULTY_TEXT_CLASS[d]">{{ DIFFICULTY_LABEL[d] }}</span>
          <UiProgress :value="percent(stats.solved.byDifficulty[d], Math.max(1, stats.solved.total))" size="xs" class="flex-1" />
          <span class="w-6 text-right text-ink-muted">{{ stats.solved.byDifficulty[d] }}</span>
        </li>
      </ul>
    </UiCard>
    <div class="grid grid-cols-2 gap-4">
      <UiCard><p class="text-xs text-ink-muted">Streak</p><p class="text-2xl font-bold text-ink">{{ stats.streak.current }}<span class="text-sm font-medium text-ink-muted"> days</span></p><p class="text-xs text-ink-muted">Longest {{ stats.streak.longest }}</p></UiCard>
      <UiCard><p class="text-xs text-ink-muted">Submissions</p><p class="text-2xl font-bold text-ink">{{ stats.submissions }}</p><p class="text-xs text-ink-muted">{{ stats.attempted }} attempted</p></UiCard>
      <UiCard><p class="text-xs text-ink-muted">Lessons done</p><p class="text-2xl font-bold text-ink">{{ stats.lessonsCompleted }}</p><p class="text-xs text-ink-muted">{{ stats.coursesEnrolled }} courses</p></UiCard>
      <UiCard><p class="text-xs text-ink-muted">Quizzes</p><p class="text-2xl font-bold text-ink">{{ stats.quizAttempts }}</p><p class="text-xs text-ink-muted">{{ stats.articlesLiked }} articles liked</p></UiCard>
    </div>
  </div>
</template>
