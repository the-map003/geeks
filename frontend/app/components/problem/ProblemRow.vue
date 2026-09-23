<script setup lang="ts">
import { CheckCircle2, Circle, CircleDot } from 'lucide-vue-next';
import type { ProblemSummary } from '~/types/api';
import { compactNumber } from '~/utils/format';

withDefaults(defineProps<{ problem: ProblemSummary; showTopics?: boolean; dense?: boolean }>(), { showTopics: true, dense: false });
</script>

<template>
  <NuxtLink
    :to="`/problems/${problem.slug}`"
    class="group grid items-center gap-x-4 gap-y-1 border-b border-line bg-surface px-4 transition hover:bg-brand-50/40"
    :class="dense ? 'grid-cols-[auto_1fr_auto] py-2.5' : 'grid-cols-[auto_1fr_auto] py-3 sm:grid-cols-[auto_1fr_120px_110px_90px]'"
  >
    <span class="shrink-0" :title="problem.userState === 'SOLVED' ? 'Solved' : problem.userState === 'ATTEMPTED' ? 'Attempted' : 'Unsolved'">
      <CheckCircle2 v-if="problem.userState === 'SOLVED'" class="h-5 w-5 text-green-600" />
      <CircleDot v-else-if="problem.userState === 'ATTEMPTED'" class="h-5 w-5 text-amber-500" />
      <Circle v-else class="h-5 w-5 text-gray-300" />
    </span>

    <span class="min-w-0">
      <span class="block truncate text-[15px] font-medium text-ink group-hover:text-brand-700">{{ problem.title }}</span>
      <span v-if="showTopics && !dense" class="mt-1 hidden flex-wrap gap-1 sm:flex">
        <span v-for="t in problem.topics.slice(0, 3)" :key="t.id" class="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink-muted">{{ t.name }}</span>
        <span v-for="c in problem.companyTags.slice(0, 2)" :key="c" class="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700">{{ c }}</span>
      </span>
      <span class="mt-0.5 block text-xs text-ink-muted sm:hidden">{{ problem.accuracy }}% accuracy · {{ compactNumber(problem.submissionCount) }} submissions</span>
    </span>

    <span v-if="!dense" class="hidden text-sm text-ink-muted sm:block">{{ compactNumber(problem.submissionCount) }} subs</span>
    <span v-if="!dense" class="hidden text-sm text-ink-muted sm:block">{{ problem.accuracy }}% acc.</span>
    <span class="justify-self-end"><DifficultyBadge :difficulty="problem.difficulty" size="xs" /></span>
  </NuxtLink>
</template>
