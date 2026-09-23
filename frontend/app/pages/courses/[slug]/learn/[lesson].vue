<script setup lang="ts">
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, List, Lock } from 'lucide-vue-next';
import type { CourseLesson } from '~/types/api';

definePageMeta({ middleware: 'auth', hideFooter: true });

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const ui = useUiStore();
const slug = computed(() => route.params.slug as string);
const lessonSlug = computed(() => route.params.lesson as string);

const { data, status, error, refresh } = await useAsyncData(
  () => `course-lesson:${slug.value}:${lessonSlug.value}`,
  () => api.get<{ lesson: CourseLesson & { enrolled: boolean } }>(`/courses/${slug.value}/lessons/${lessonSlug.value}`),
  { watch: [slug, lessonSlug] },
);

const lesson = computed(() => data.value?.lesson);
const errorStatus = computed(() => (error.value as unknown as { status?: number } | null)?.status);
const sidebarOpen = ref(false);
const completing = ref(false);
watch(() => route.fullPath, () => (sidebarOpen.value = false));

async function toggleComplete() {
  if (!lesson.value) return;
  completing.value = true;
  try {
    const res = await api.post<{ completed: boolean; progressPercent: number }>(`/courses/lessons/${lesson.value.id}/complete`);
    lesson.value.completed = res.completed;
    lesson.value.progressPercent = res.progressPercent;
    for (const m of lesson.value.modules) for (const l of m.lessons) if (l.id === lesson.value.id) l.completed = res.completed;
    ui.success(res.completed ? 'Lesson completed' : 'Marked as incomplete');
    if (res.completed && lesson.value.next) navigateTo(`/courses/${slug.value}/learn/${lesson.value.next.slug}`);
  } catch (err) {
    ui.error('Could not update progress', isApiError(err) ? err.message : undefined);
  } finally {
    completing.value = false;
  }
}

useSeoMeta({ title: () => (lesson.value ? `${lesson.value.title} - ${lesson.value.course.title}` : 'Lesson'), robots: 'noindex' });
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 py-6">
    <div v-if="status === 'pending' && !lesson" class="grid gap-8 lg:grid-cols-[300px_1fr]">
      <UiSkeleton variant="rect" class="hidden h-96 lg:block" />
      <div class="space-y-4"><UiSkeleton variant="title" /><UiSkeleton :lines="10" /></div>
    </div>

    <div v-else-if="status === 'error'" class="mx-auto max-w-lg py-16">
      <UiEmptyState v-if="errorStatus === 403 || errorStatus === 401" title="Enrol to unlock this lesson" description="This lesson is part of the paid curriculum. Enrol in the course to access every lesson and track your progress." :icon="Lock">
        <UiButton :to="`/courses/${slug}`">Go to course</UiButton>
      </UiEmptyState>
      <UiErrorState v-else :message="errorStatus === 404 ? 'This lesson does not exist.' : error?.message" @retry="refresh()" />
    </div>

    <template v-else-if="lesson">
      <UiBreadcrumbs :items="[{ label: 'Courses', to: '/courses' }, { label: lesson.course.title, to: `/courses/${lesson.course.slug}` }, { label: lesson.title }]" class="mb-5" />

      <div class="mb-4 lg:hidden">
        <UiButton variant="secondary" size="sm" @click="sidebarOpen = !sidebarOpen"><List class="h-4 w-4" /> {{ sidebarOpen ? 'Hide curriculum' : 'Show curriculum' }}</UiButton>
      </div>

      <div class="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside :class="sidebarOpen ? 'block' : 'hidden lg:block'">
          <div class="sticky top-32 rounded-lg border border-line bg-surface">
            <div class="border-b border-line px-4 py-3">
              <NuxtLink :to="`/courses/${lesson.course.slug}`" class="block text-sm font-bold text-ink hover:text-brand-700">{{ lesson.course.title }}</NuxtLink>
              <UiProgress :value="lesson.progressPercent" size="xs" show-label class="mt-2" />
            </div>
            <div class="max-h-[calc(100vh-260px)] overflow-y-auto py-1">
              <div v-for="(m, mi) in lesson.modules" :key="m.id">
                <p class="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Module {{ mi + 1 }}: {{ m.title }}</p>
                <ul>
                  <li v-for="l in m.lessons" :key="l.id">
                    <NuxtLink
                      :to="`/courses/${lesson.course.slug}/learn/${l.slug}`"
                      class="flex items-center gap-2 border-l-2 py-1.5 pl-4 pr-3 text-sm transition"
                      :class="l.id === lesson.id ? 'border-brand-500 bg-brand-50 font-medium text-brand-700' : 'border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink'"
                    >
                      <CheckCircle2 v-if="l.completed" class="h-4 w-4 shrink-0 text-green-600" />
                      <Lock v-else-if="!l.isPreview && !lesson.enrolled" class="h-4 w-4 shrink-0 text-ink-faint" />
                      <Circle v-else class="h-4 w-4 shrink-0 text-gray-300" />
                      <span class="flex-1 truncate">{{ l.title }}</span>
                      <span class="text-[11px] text-ink-muted">{{ l.durationMin }}m</span>
                    </NuxtLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>

        <article class="min-w-0">
          <header class="border-b border-line pb-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">{{ lesson.module.title }}</p>
            <h1 class="mt-1 text-3xl font-extrabold tracking-tight text-ink">{{ lesson.title }}</h1>
            <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
              <span class="inline-flex items-center gap-1.5"><Clock class="h-4 w-4" /> {{ lesson.durationMin }} min</span>
              <UiBadge v-if="lesson.isPreview" tone="blue" size="xs">Free preview</UiBadge>
              <UiAlert v-if="!lesson.enrolled" tone="info" class="w-full">You are previewing this lesson. <NuxtLink :to="`/courses/${lesson.course.slug}`" class="font-semibold underline">Enrol</NuxtLink> to track progress and unlock every lesson.</UiAlert>
            </div>
          </header>

          <div v-if="lesson.videoUrl" class="mt-6 aspect-video overflow-hidden rounded-lg bg-black">
            <iframe :src="lesson.videoUrl" class="h-full w-full" title="Lesson video" allowfullscreen loading="lazy" referrerpolicy="no-referrer" />
          </div>

          <div class="mt-6"><MarkdownContent :source="lesson.content" /></div>

          <div class="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <UiButton v-if="lesson.enrolled" :variant="lesson.completed ? 'secondary' : 'primary'" size="lg" :loading="completing" @click="toggleComplete">
              <CheckCircle2 class="h-5 w-5" /> {{ lesson.completed ? 'Completed — mark incomplete' : 'Mark complete & continue' }}
            </UiButton>
            <UiButton v-else :to="`/courses/${lesson.course.slug}`" size="lg">Enrol to continue</UiButton>
            <div class="flex gap-2">
              <UiButton v-if="lesson.prev" :to="`/courses/${lesson.course.slug}/learn/${lesson.prev.slug}`" variant="secondary"><ArrowLeft class="h-4 w-4" /> Previous</UiButton>
              <UiButton v-if="lesson.next" :to="`/courses/${lesson.course.slug}/learn/${lesson.next.slug}`" variant="secondary">Next <ArrowRight class="h-4 w-4" /></UiButton>
            </div>
          </div>
          <p v-if="auth.isAuthenticated && lesson.progressPercent === 100" class="mt-4 rounded-lg bg-green-50 p-4 text-sm font-medium text-green-800">🎉 You have completed this course. Well done!</p>
        </article>
      </div>
    </template>
  </div>
</template>
