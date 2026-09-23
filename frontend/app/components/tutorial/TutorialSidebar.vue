<script setup lang="ts">
import { CheckCircle2, ChevronDown, Circle } from 'lucide-vue-next';
import type { TutorialChapter } from '~/types/api';

const props = defineProps<{ tutorialSlug: string; tutorialTitle: string; chapters: TutorialChapter[]; currentLessonId?: string | null; progressPercent?: number }>();

const collapsed = ref<Set<string>>(new Set());
function toggle(id: string) {
  const next = new Set(collapsed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsed.value = next;
}
const totalLessons = computed(() => props.chapters.reduce((s, c) => s + c.lessons.length, 0));
</script>

<template>
  <nav aria-label="Tutorial chapters" class="rounded-lg border border-line bg-surface">
    <div class="border-b border-line px-4 py-3">
      <NuxtLink :to="`/tutorials/${tutorialSlug}`" class="block text-sm font-bold text-ink hover:text-brand-700">{{ tutorialTitle }}</NuxtLink>
      <p class="mt-0.5 text-xs text-ink-muted">{{ totalLessons }} lessons</p>
      <UiProgress v-if="progressPercent !== undefined" :value="progressPercent" size="xs" show-label class="mt-2" />
    </div>
    <div class="max-h-[calc(100vh-240px)] overflow-y-auto py-1">
      <div v-for="chapter in chapters" :key="chapter.id">
        <button type="button" class="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink" :aria-expanded="!collapsed.has(chapter.id)" @click="toggle(chapter.id)">
          {{ chapter.title }}
          <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="collapsed.has(chapter.id) ? '-rotate-90' : ''" />
        </button>
        <ul v-show="!collapsed.has(chapter.id)" class="pb-1">
          <li v-for="lesson in chapter.lessons" :key="lesson.id">
            <NuxtLink
              :to="`/tutorials/${tutorialSlug}/${lesson.slug}`"
              class="flex items-center gap-2 border-l-2 py-1.5 pl-4 pr-3 text-sm transition"
              :class="lesson.id === currentLessonId ? 'border-brand-500 bg-brand-50 font-medium text-brand-700' : 'border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink'"
              :aria-current="lesson.id === currentLessonId ? 'page' : undefined"
            >
              <CheckCircle2 v-if="lesson.completed" class="h-4 w-4 shrink-0 text-green-600" />
              <Circle v-else class="h-4 w-4 shrink-0 text-gray-300" />
              <span class="truncate">{{ lesson.title }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
