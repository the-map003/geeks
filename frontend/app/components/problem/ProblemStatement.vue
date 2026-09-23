<script setup lang="ts">
import { Building2, ChevronDown, Lightbulb, Tag } from 'lucide-vue-next';
import type { Problem } from '~/types/api';
import { compactNumber } from '~/utils/format';

defineProps<{ problem: Problem }>();
const revealedHints = ref<Set<number>>(new Set());
function toggleHint(i: number) {
  const next = new Set(revealedHints.value);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  revealedHints.value = next;
}
const showTags = ref(false);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
      <DifficultyBadge :difficulty="problem.difficulty" />
      <span>Accuracy: <strong class="text-ink">{{ problem.accuracy }}%</strong></span>
      <span>Submissions: <strong class="text-ink">{{ compactNumber(problem.submissionCount) }}</strong></span>
      <span>Points: <strong class="text-ink">{{ problem.points }}</strong></span>
    </div>

    <MarkdownContent :source="problem.description" compact />

    <div v-if="problem.examples.length" class="space-y-4">
      <div v-for="(ex, i) in problem.examples" :key="ex.id" class="overflow-hidden rounded-lg border border-line">
        <p class="bg-surface-muted px-4 py-2 text-sm font-semibold text-ink">Example {{ i + 1 }}</p>
        <div class="grid gap-px bg-line sm:grid-cols-2">
          <div class="bg-surface p-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Input</p>
            <pre class="whitespace-pre-wrap break-words font-mono text-[13px] text-ink">{{ ex.input.trimEnd() }}</pre>
          </div>
          <div class="bg-surface p-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Output</p>
            <pre class="whitespace-pre-wrap break-words font-mono text-[13px] text-ink">{{ ex.output.trimEnd() }}</pre>
          </div>
        </div>
        <div v-if="ex.explanation" class="border-t border-line bg-surface p-3 text-sm text-ink-muted"><span class="font-semibold text-ink">Explanation: </span>{{ ex.explanation }}</div>
      </div>
    </div>

    <div v-if="problem.inputFormat || problem.outputFormat" class="grid gap-4 sm:grid-cols-2">
      <div v-if="problem.inputFormat">
        <h3 class="text-sm font-semibold text-ink">Input Format</h3>
        <MarkdownContent :source="problem.inputFormat" compact class="mt-1 text-sm" />
      </div>
      <div v-if="problem.outputFormat">
        <h3 class="text-sm font-semibold text-ink">Output Format</h3>
        <MarkdownContent :source="problem.outputFormat" compact class="mt-1 text-sm" />
      </div>
    </div>

    <div v-if="problem.constraints">
      <h3 class="text-sm font-semibold text-ink">Constraints</h3>
      <MarkdownContent :source="problem.constraints" compact class="mt-1 text-sm" />
    </div>

    <div v-if="problem.expectedTimeComplexity || problem.expectedSpaceComplexity" class="rounded-lg bg-surface-muted p-3 text-sm">
      <p v-if="problem.expectedTimeComplexity"><span class="font-semibold text-ink">Expected Time Complexity:</span> <code class="font-mono">{{ problem.expectedTimeComplexity }}</code></p>
      <p v-if="problem.expectedSpaceComplexity" class="mt-1"><span class="font-semibold text-ink">Expected Auxiliary Space:</span> <code class="font-mono">{{ problem.expectedSpaceComplexity }}</code></p>
      <p class="mt-1 text-xs text-ink-muted">Time limit {{ (problem.timeLimitMs / 1000).toFixed(1) }}s · Memory limit {{ problem.memoryLimitMb }} MB</p>
    </div>

    <div v-if="problem.hints.length" class="space-y-2">
      <h3 class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink"><Lightbulb class="h-4 w-4 text-amber-500" /> Hints</h3>
      <div v-for="(hint, i) in problem.hints" :key="i" class="rounded-lg border border-line">
        <button type="button" class="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface-muted" :aria-expanded="revealedHints.has(i)" @click="toggleHint(i)">
          Hint {{ i + 1 }}
          <ChevronDown class="h-4 w-4 text-ink-muted transition-transform" :class="revealedHints.has(i) ? 'rotate-180' : ''" />
        </button>
        <p v-if="revealedHints.has(i)" class="border-t border-line px-3 py-2 text-sm text-ink-muted">{{ hint }}</p>
      </div>
    </div>

    <div class="rounded-lg border border-line">
      <button type="button" class="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface-muted" :aria-expanded="showTags" @click="showTags = !showTags">
        <span class="inline-flex items-center gap-1.5"><Tag class="h-4 w-4 text-ink-muted" /> Topic &amp; company tags</span>
        <ChevronDown class="h-4 w-4 text-ink-muted transition-transform" :class="showTags ? 'rotate-180' : ''" />
      </button>
      <div v-if="showTags" class="space-y-2 border-t border-line px-3 py-3">
        <div class="flex flex-wrap gap-1.5">
          <NuxtLink v-for="t in problem.topics" :key="t.id" :to="{ path: '/problems', query: { topic: t.slug } }" class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100">{{ t.name }}</NuxtLink>
        </div>
        <div v-if="problem.companyTags.length" class="flex flex-wrap gap-1.5">
          <span v-for="c in problem.companyTags" :key="c" class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"><Building2 class="h-3 w-3" /> {{ c }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
