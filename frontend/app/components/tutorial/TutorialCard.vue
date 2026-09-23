<script setup lang="ts">
import { BookOpen, Layers } from 'lucide-vue-next';
import type { TutorialSummary } from '~/types/api';

defineProps<{ tutorial: TutorialSummary }>();
</script>

<template>
  <NuxtLink
    :to="`/tutorials/${tutorial.slug}`"
    class="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
  >
    <CoverPlaceholder :seed="tutorial.slug" :src="tutorial.coverImageUrl" :alt="tutorial.title" :icon="BookOpen" aspect="aspect-[16/7]" />
    <div class="flex flex-1 flex-col p-4">
      <p v-if="tutorial.category" class="text-xs font-semibold text-brand-600">{{ tutorial.category.name }}</p>
      <h3 class="mt-1.5 text-base font-semibold text-ink group-hover:text-brand-700">{{ tutorial.title }}</h3>
      <p class="mt-1.5 line-clamp-2 flex-1 text-sm text-ink-muted">{{ tutorial.description }}</p>
      <div class="mt-4 flex items-center justify-between text-xs text-ink-muted">
        <span class="inline-flex items-center gap-1"><Layers class="h-3.5 w-3.5" /> {{ tutorial.lessonCount }} lessons</span>
        <span>by {{ tutorial.author.displayName }}</span>
      </div>
      <UiProgress v-if="tutorial.progressPercent !== undefined && tutorial.progressPercent > 0" :value="tutorial.progressPercent" size="xs" show-label class="mt-3" />
    </div>
  </NuxtLink>
</template>
