<script setup lang="ts">
import { BookOpen, CheckCircle2, Circle, Clock, Layers, PlayCircle } from 'lucide-vue-next';
import type { Tutorial } from '~/types/api';

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const slug = computed(() => route.params.slug as string);

const { data, status, error, refresh } = await useAsyncData(() => `tutorial:${slug.value}`, () => api.get<{ tutorial: Tutorial }>(`/tutorials/${slug.value}`), { watch: [slug] });
if (status.value === 'error' && error.value) {
  const e = error.value as unknown as { status?: number };
  throw createError({ statusCode: e.status === 404 ? 404 : 500, statusMessage: e.status === 404 ? 'Tutorial not found' : 'Failed to load tutorial', fatal: true });
}
// Re-fetch with credentials once the session is restored so progress shows up.
watch(() => auth.isAuthenticated, () => refresh());

const tutorial = computed(() => data.value?.tutorial);
const allLessons = computed(() => tutorial.value?.chapters.flatMap((c) => c.lessons) ?? []);
const nextLesson = computed(() => allLessons.value.find((l) => !l.completed) ?? allLessons.value[0]);
const totalMinutes = computed(() => allLessons.value.reduce((s, l) => s + l.readingTimeMin, 0));
const completedCount = computed(() => allLessons.value.filter((l) => l.completed).length);

useContentSeo(() => ({
  title: tutorial.value?.title ?? 'Tutorial',
  description: tutorial.value?.description ?? '',
  path: `/tutorials/${slug.value}`,
  jsonLd: tutorial.value
    ? { '@type': 'Course', name: tutorial.value.title, description: tutorial.value.description, provider: { '@type': 'Organization', name: 'GeeksforGeeks (academic reproduction)' } }
    : null,
}));
</script>

<template>
  <div>
    <div v-if="status === 'pending' && !tutorial" class="mx-auto max-w-[1240px] px-4 py-8 space-y-4">
      <UiSkeleton variant="title" /><UiSkeleton :lines="2" /><UiSkeleton variant="rect" class="h-64" />
    </div>
    <template v-else-if="tutorial">
      <section class="border-b border-line bg-gradient-to-br from-brand-50 to-page">
        <div class="mx-auto max-w-[1240px] px-4 py-10">
          <UiBreadcrumbs :items="[{ label: 'Tutorials', to: '/tutorials' }, ...(tutorial.category ? [{ label: tutorial.category.name, to: `/categories/${tutorial.category.slug}` }] : []), { label: tutorial.title }]" class="mb-5" />
          <div class="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <p v-if="tutorial.category" class="text-sm font-semibold text-brand-600">{{ tutorial.category.name }}</p>
              <h1 class="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{{ tutorial.title }}</h1>
              <p class="mt-3 max-w-2xl text-lg text-ink-muted">{{ tutorial.description }}</p>
              <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
                <span class="inline-flex items-center gap-1.5"><Layers class="h-4 w-4" /> {{ tutorial.chapters.length }} chapters</span>
                <span class="inline-flex items-center gap-1.5"><BookOpen class="h-4 w-4" /> {{ tutorial.lessonCount }} lessons</span>
                <span class="inline-flex items-center gap-1.5"><Clock class="h-4 w-4" /> ~{{ totalMinutes }} min total</span>
                <span class="inline-flex items-center gap-1.5"><UiAvatar :name="tutorial.author.displayName" :src="tutorial.author.avatarUrl" size="xs" /> {{ tutorial.author.displayName }}</span>
              </div>
              <div class="mt-6 flex flex-wrap items-center gap-3">
                <UiButton v-if="nextLesson" :to="`/tutorials/${tutorial.slug}/${nextLesson.slug}`" size="lg">
                  <PlayCircle class="h-5 w-5" /> {{ completedCount > 0 && completedCount < allLessons.length ? 'Continue learning' : completedCount === allLessons.length && allLessons.length ? 'Review tutorial' : 'Start learning' }}
                </UiButton>
                <ClientOnly><BookmarkButton type="TUTORIAL" :target-id="tutorial.id" :initial="tutorial.bookmarked" size="lg" /></ClientOnly>
                <ShareMenu :title="tutorial.title" size="lg" />
              </div>
            </div>
            <ClientOnly>
              <UiCard v-if="auth.isAuthenticated" class="self-start">
                <p class="text-sm font-semibold text-ink">Your progress</p>
                <p class="mt-1 text-3xl font-bold text-brand-600">{{ tutorial.progressPercent ?? 0 }}%</p>
                <UiProgress :value="tutorial.progressPercent ?? 0" class="mt-2" />
                <p class="mt-2 text-xs text-ink-muted">{{ completedCount }} of {{ allLessons.length }} lessons completed</p>
              </UiCard>
              <UiCard v-else class="self-start">
                <p class="text-sm font-semibold text-ink">Track your progress</p>
                <p class="mt-1 text-sm text-ink-muted">Sign in to mark lessons complete and pick up where you left off.</p>
                <UiButton :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" size="sm" class="mt-3" variant="secondary">Sign in</UiButton>
              </UiCard>
            </ClientOnly>
          </div>
        </div>
      </section>

      <div class="mx-auto max-w-4xl px-4 py-10">
        <h2 class="text-2xl font-bold text-ink">Course content</h2>
        <div class="mt-5 space-y-4">
          <div v-for="(chapter, ci) in tutorial.chapters" :key="chapter.id" class="overflow-hidden rounded-lg border border-line bg-surface">
            <div class="flex items-center justify-between bg-surface-muted px-4 py-3">
              <h3 class="font-semibold text-ink"><span class="mr-2 text-ink-muted">Chapter {{ ci + 1 }}</span>{{ chapter.title }}</h3>
              <span class="text-xs text-ink-muted">{{ chapter.lessons.length }} lessons</span>
            </div>
            <ul class="divide-y divide-line">
              <li v-for="lesson in chapter.lessons" :key="lesson.id">
                <NuxtLink :to="`/tutorials/${tutorial.slug}/${lesson.slug}`" class="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/40">
                  <CheckCircle2 v-if="lesson.completed" class="h-5 w-5 shrink-0 text-green-600" />
                  <Circle v-else class="h-5 w-5 shrink-0 text-gray-300" />
                  <span class="flex-1 text-[15px] font-medium text-ink">{{ lesson.title }}</span>
                  <span class="text-xs text-ink-muted">{{ lesson.readingTimeMin }} min</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
