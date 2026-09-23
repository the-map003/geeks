<script setup lang="ts">
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, List } from 'lucide-vue-next';
import type { TutorialLesson } from '~/types/api';
import type { TocItem } from '~/utils/markdown';
import { formatDate } from '~/utils/format';

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const ui = useUiStore();
const slug = computed(() => route.params.slug as string);
const lessonSlug = computed(() => route.params.lesson as string);

const { data, status, error, refresh } = await useAsyncData(
  () => `lesson:${slug.value}:${lessonSlug.value}`,
  () => api.get<{ lesson: TutorialLesson }>(`/tutorials/${slug.value}/lessons/${lessonSlug.value}`),
  { watch: [slug, lessonSlug] },
);
if (status.value === 'error' && error.value) {
  const e = error.value as unknown as { status?: number };
  throw createError({ statusCode: e.status === 404 ? 404 : 500, statusMessage: e.status === 404 ? 'Lesson not found' : 'Failed to load lesson', fatal: true });
}
watch(() => auth.isAuthenticated, () => refresh());

const lesson = computed(() => data.value?.lesson);
const toc = ref<TocItem[]>([]);
const sidebarOpen = ref(false);
const completing = ref(false);

async function toggleComplete() {
  if (!lesson.value) return;
  if (!auth.isAuthenticated) {
    ui.info('Sign in to track your progress');
    return navigateTo({ path: '/login', query: { redirect: route.fullPath } });
  }
  completing.value = true;
  try {
    const res = await api.post<{ completed: boolean; progressPercent: number }>(`/tutorials/lessons/${lesson.value.id}/complete`);
    lesson.value.completed = res.completed;
    lesson.value.progressPercent = res.progressPercent;
    for (const c of lesson.value.chapters) for (const l of c.lessons) if (l.id === lesson.value.id) l.completed = res.completed;
    ui.success(res.completed ? 'Lesson marked as complete' : 'Lesson marked as incomplete');
  } catch (err) {
    ui.error('Could not update progress', isApiError(err) ? err.message : undefined);
  } finally {
    completing.value = false;
  }
}

watch(() => route.fullPath, () => (sidebarOpen.value = false));

useContentSeo(() => ({
  title: lesson.value ? `${lesson.value.title} - ${lesson.value.tutorial.title}` : 'Lesson',
  description: lesson.value ? `${lesson.value.title}: part of the ${lesson.value.tutorial.title} on GeeksforGeeks.` : '',
  path: `/tutorials/${slug.value}/${lessonSlug.value}`,
  type: 'article',
  updatedAt: lesson.value?.updatedAt ?? null,
}));
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 py-6">
    <div v-if="status === 'pending' && !lesson" class="grid gap-8 lg:grid-cols-[280px_1fr]">
      <UiSkeleton variant="rect" class="hidden h-96 lg:block" />
      <div class="space-y-4"><UiSkeleton variant="title" /><UiSkeleton :lines="10" /></div>
    </div>

    <template v-else-if="lesson">
      <UiBreadcrumbs :items="[{ label: 'Tutorials', to: '/tutorials' }, { label: lesson.tutorial.title, to: `/tutorials/${lesson.tutorial.slug}` }, { label: lesson.title }]" class="mb-5" />

      <div class="mb-4 lg:hidden">
        <UiButton variant="secondary" size="sm" @click="sidebarOpen = !sidebarOpen"><List class="h-4 w-4" /> {{ sidebarOpen ? 'Hide chapters' : 'Show chapters' }}</UiButton>
        <div v-if="sidebarOpen" class="mt-3">
          <TutorialSidebar :tutorial-slug="lesson.tutorial.slug" :tutorial-title="lesson.tutorial.title" :chapters="lesson.chapters" :current-lesson-id="lesson.id" :progress-percent="auth.isAuthenticated ? lesson.progressPercent : undefined" />
        </div>
      </div>

      <div class="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_240px]">
        <aside class="hidden lg:block">
          <div class="sticky top-32">
            <TutorialSidebar :tutorial-slug="lesson.tutorial.slug" :tutorial-title="lesson.tutorial.title" :chapters="lesson.chapters" :current-lesson-id="lesson.id" :progress-percent="auth.isAuthenticated ? lesson.progressPercent : undefined" />
          </div>
        </aside>

        <article class="min-w-0">
          <header class="border-b border-line pb-5">
            <p class="text-sm font-semibold text-brand-600">{{ lesson.tutorial.title }}</p>
            <h1 class="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{{ lesson.title }}</h1>
            <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              <span class="inline-flex items-center gap-1.5"><Clock class="h-4 w-4" /> {{ lesson.readingTimeMin }} min read</span>
              <span>Last updated: {{ formatDate(lesson.updatedAt) }}</span>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <ClientOnly>
                <UiButton :variant="lesson.completed ? 'primary' : 'secondary'" size="sm" :loading="completing" @click="toggleComplete">
                  <CheckCircle2 v-if="lesson.completed" class="h-4 w-4" /><Circle v-else class="h-4 w-4" />
                  {{ lesson.completed ? 'Completed' : 'Mark as complete' }}
                </UiButton>
              </ClientOnly>
              <ShareMenu :title="lesson.title" size="sm" />
            </div>
          </header>

          <div class="mt-5 xl:hidden"><TableOfContents :items="toc" collapsible /></div>

          <div class="mt-6"><MarkdownContent :source="lesson.content" @toc="toc = $event" /></div>

          <nav class="mt-10 grid gap-3 border-t border-line pt-6 sm:grid-cols-2" aria-label="Lesson navigation">
            <NuxtLink v-if="lesson.prev" :to="`/tutorials/${lesson.tutorial.slug}/${lesson.prev.slug}`" class="group flex items-center gap-3 rounded-lg border border-line p-4 transition hover:border-brand-400 hover:bg-brand-50/40">
              <ArrowLeft class="h-5 w-5 shrink-0 text-ink-muted group-hover:text-brand-600" />
              <span class="min-w-0"><span class="block text-xs text-ink-muted">Previous</span><span class="block truncate font-medium text-ink">{{ lesson.prev.title }}</span></span>
            </NuxtLink>
            <span v-else />
            <NuxtLink v-if="lesson.next" :to="`/tutorials/${lesson.tutorial.slug}/${lesson.next.slug}`" class="group flex items-center justify-end gap-3 rounded-lg border border-line p-4 text-right transition hover:border-brand-400 hover:bg-brand-50/40">
              <span class="min-w-0"><span class="block text-xs text-ink-muted">Next</span><span class="block truncate font-medium text-ink">{{ lesson.next.title }}</span></span>
              <ArrowRight class="h-5 w-5 shrink-0 text-ink-muted group-hover:text-brand-600" />
            </NuxtLink>
            <NuxtLink v-else :to="`/tutorials/${lesson.tutorial.slug}`" class="flex items-center justify-end gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 text-right">
              <span><span class="block text-xs text-brand-700">You reached the end</span><span class="block font-medium text-brand-800">Back to tutorial overview</span></span>
            </NuxtLink>
          </nav>

          <div class="mt-12"><CommentThread target-type="TUTORIAL_LESSON" :target-id="lesson.id" /></div>
        </article>

        <aside class="hidden xl:block">
          <div class="sticky top-32"><TableOfContents :items="toc" /></div>
        </aside>
      </div>
    </template>
  </div>
</template>
