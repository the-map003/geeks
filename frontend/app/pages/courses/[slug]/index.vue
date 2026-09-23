<script setup lang="ts">
import { CheckCircle2, ChevronDown, Circle, Clock, Eye, GraduationCap, Layers, Lock, PlayCircle, Star, Users } from 'lucide-vue-next';
import type { Course } from '~/types/api';
import { compactNumber, formatDate, formatPrice, LEVEL_LABEL } from '~/utils/format';

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const ui = useUiStore();
const slug = computed(() => route.params.slug as string);

const { data, status, error, refresh } = await useAsyncData(() => `course:${slug.value}`, () => api.get<{ course: Course }>(`/courses/${slug.value}`), { watch: [slug] });
if (status.value === 'error' && error.value) {
  const e = error.value as unknown as { status?: number };
  throw createError({ statusCode: e.status === 404 ? 404 : 500, statusMessage: e.status === 404 ? 'Course not found' : 'Failed to load course', fatal: true });
}
watch(() => auth.isAuthenticated, () => refresh());

const course = computed(() => data.value?.course);
const tab = ref('overview');
const tabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'curriculum', label: 'Curriculum' },
  { value: 'instructor', label: 'Instructor' },
];
const openModules = ref<Set<string>>(new Set());
watch(course, (c) => { if (c) openModules.value = new Set(c.modules.slice(0, 1).map((m) => m.id)); }, { immediate: true });
function toggleModule(id: string) {
  const next = new Set(openModules.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  openModules.value = next;
}

const allLessons = computed(() => course.value?.modules.flatMap((m) => m.lessons) ?? []);
const totalMinutes = computed(() => allLessons.value.reduce((s, l) => s + l.durationMin, 0));
const continueLesson = computed(() => allLessons.value.find((l) => !l.completed) ?? allLessons.value[0]);
const enrolling = ref(false);

async function enroll() {
  if (!course.value) return;
  if (!auth.isAuthenticated) {
    ui.info('Sign in to enrol');
    return navigateTo({ path: '/login', query: { redirect: route.fullPath } });
  }
  enrolling.value = true;
  try {
    await api.post(`/courses/${course.value.slug}/enroll`);
    ui.success('You are enrolled!', 'Start with the first lesson.');
    await refresh();
    if (continueLesson.value) navigateTo(`/courses/${course.value.slug}/learn/${continueLesson.value.slug}`);
  } catch (err) {
    if (isApiError(err) && err.status === 409) {
      await refresh();
    } else {
      ui.error('Could not enrol', isApiError(err) ? err.message : undefined);
    }
  } finally {
    enrolling.value = false;
  }
}

useContentSeo(() => ({
  title: course.value?.title ?? 'Course',
  description: course.value?.subtitle ?? '',
  path: `/courses/${slug.value}`,
  jsonLd: course.value
    ? {
        '@type': 'Course',
        name: course.value.title,
        description: course.value.subtitle,
        provider: { '@type': 'Organization', name: 'GeeksforGeeks (academic reproduction)' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: course.value.ratingAvg, ratingCount: course.value.ratingCount },
      }
    : null,
}));
</script>

<template>
  <div>
    <div v-if="status === 'pending' && !course" class="mx-auto max-w-[1240px] px-4 py-8 space-y-4"><UiSkeleton variant="title" /><UiSkeleton :lines="3" /><UiSkeleton variant="rect" class="h-64" /></div>

    <template v-else-if="course">
      <section class="bg-[#1f2a37] text-white">
        <div class="mx-auto grid max-w-[1240px] gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div class="min-w-0">
            <UiBreadcrumbs :items="[{ label: 'Courses', to: '/courses' }, ...(course.category ? [{ label: course.category.name, to: `/categories/${course.category.slug}` }] : []), { label: course.title }]" class="mb-5 [&_a]:text-ink-faint [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-ink-muted" />
            <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">{{ course.title }}</h1>
            <p v-if="course.subtitle" class="mt-3 max-w-2xl text-lg text-gray-300">{{ course.subtitle }}</p>
            <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-300">
              <span class="inline-flex items-center gap-1 font-semibold text-amber-400"><Star class="h-4 w-4 fill-current" /> {{ Number(course.ratingAvg).toFixed(1) }} <span class="font-normal text-ink-faint">({{ compactNumber(course.ratingCount) }} ratings)</span></span>
              <span class="inline-flex items-center gap-1.5"><Users class="h-4 w-4" /> {{ compactNumber(course.enrollmentCount) }} learners</span>
              <span class="inline-flex items-center gap-1.5"><GraduationCap class="h-4 w-4" /> {{ LEVEL_LABEL[course.level] }}</span>
              <span class="inline-flex items-center gap-1.5"><Clock class="h-4 w-4" /> {{ course.durationHours }} hours</span>
            </div>
            <p class="mt-4 inline-flex items-center gap-2 text-sm text-gray-300">
              <UiAvatar :name="course.instructor.displayName" :src="course.instructor.avatarUrl" size="sm" /> Created by <span class="font-medium text-white">{{ course.instructor.displayName }}</span>
            </p>
          </div>

          <!-- Sticky summary card -->
          <div class="lg:relative">
            <UiCard class="text-ink shadow-xl lg:absolute lg:top-0 lg:w-full">
              <CourseThumb :title="course.title" :src="course.coverImageUrl" :category="course.category?.slug" rounded="rounded-md" />
              <div class="mt-4 flex items-baseline justify-between">
                <span class="text-3xl font-extrabold">{{ formatPrice(course.price, course.isFree) }}</span>
                <span v-if="!course.isFree" class="text-xs text-ink-muted">Free to enrol in this build</span>
              </div>
              <ClientOnly>
                <template v-if="course.enrollment">
                  <UiProgress :value="course.enrollment.progressPercent" show-label class="mt-3" />
                  <UiButton v-if="continueLesson" :to="`/courses/${course.slug}/learn/${continueLesson.slug}`" block size="lg" class="mt-3">
                    <PlayCircle class="h-5 w-5" /> {{ course.enrollment.progressPercent > 0 ? 'Continue learning' : 'Start learning' }}
                  </UiButton>
                  <p class="mt-2 text-center text-xs text-ink-muted">Enrolled {{ formatDate(course.enrollment.enrolledAt) }}</p>
                </template>
                <UiButton v-else block size="lg" class="mt-3" :loading="enrolling" @click="enroll">Enrol now</UiButton>
                <template #fallback><div class="mt-3 h-12 animate-pulse rounded-md bg-surface-strong" /></template>
              </ClientOnly>
              <div class="mt-3 flex gap-2">
                <ClientOnly><BookmarkButton type="COURSE" :target-id="course.id" :initial="course.bookmarked" size="sm" class="flex-1" /></ClientOnly>
                <ShareMenu :title="course.title" size="sm" />
              </div>
              <ul class="mt-4 space-y-2 border-t border-line pt-4 text-sm text-ink-muted">
                <li class="flex items-center gap-2"><Layers class="h-4 w-4" /> {{ course.modules.length }} modules · {{ course.lessonCount }} lessons</li>
                <li class="flex items-center gap-2"><Clock class="h-4 w-4" /> ~{{ Math.round(totalMinutes / 60) }}h of lesson content</li>
                <li class="flex items-center gap-2"><Eye class="h-4 w-4" /> Preview lessons available</li>
              </ul>
            </UiCard>
          </div>
        </div>
      </section>

      <div class="mx-auto max-w-[1240px] px-4 py-8">
        <div class="lg:max-w-[calc(100%-392px)]">
          <UiTabs v-model="tab" :tabs="tabs" />

          <div v-show="tab === 'overview'" class="mt-6">
            <MarkdownContent :source="course.description" compact />
          </div>

          <div v-show="tab === 'curriculum'" class="mt-6 space-y-3">
            <p class="text-sm text-ink-muted">{{ course.modules.length }} modules · {{ course.lessonCount }} lessons · {{ totalMinutes }} min</p>
            <div v-for="(m, mi) in course.modules" :key="m.id" class="overflow-hidden rounded-lg border border-line bg-surface">
              <button type="button" class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-muted" :aria-expanded="openModules.has(m.id)" @click="toggleModule(m.id)">
                <span>
                  <span class="block text-xs font-semibold uppercase tracking-wide text-ink-muted">Module {{ mi + 1 }}</span>
                  <span class="block font-semibold text-ink">{{ m.title }}</span>
                  <span v-if="m.description" class="mt-0.5 block text-sm text-ink-muted">{{ m.description }}</span>
                </span>
                <span class="flex shrink-0 items-center gap-3 text-xs text-ink-muted">{{ m.lessons.length }} lessons <ChevronDown class="h-4 w-4 transition-transform" :class="openModules.has(m.id) ? 'rotate-180' : ''" /></span>
              </button>
              <ul v-show="openModules.has(m.id)" class="divide-y divide-line border-t border-line">
                <li v-for="l in m.lessons" :key="l.id">
                  <component
                    :is="l.isPreview || course.enrollment ? 'NuxtLink' : 'div'"
                    :to="l.isPreview || course.enrollment ? `/courses/${course.slug}/learn/${l.slug}` : undefined"
                    class="flex items-center gap-3 px-4 py-2.5 text-sm"
                    :class="l.isPreview || course.enrollment ? 'hover:bg-brand-50/40' : 'text-ink-muted'"
                  >
                    <CheckCircle2 v-if="l.completed" class="h-4 w-4 shrink-0 text-green-600" />
                    <Lock v-else-if="!l.isPreview && !course.enrollment" class="h-4 w-4 shrink-0 text-ink-faint" />
                    <Circle v-else class="h-4 w-4 shrink-0 text-gray-300" />
                    <span class="flex-1 font-medium text-ink">{{ l.title }}</span>
                    <UiBadge v-if="l.isPreview" tone="blue" size="xs">Preview</UiBadge>
                    <span class="text-xs text-ink-muted">{{ l.durationMin }} min</span>
                  </component>
                </li>
              </ul>
            </div>
          </div>

          <div v-show="tab === 'instructor'" class="mt-6">
            <UiCard class="flex flex-col gap-4 sm:flex-row">
              <UiAvatar :name="course.instructorProfile.displayName" :src="course.instructorProfile.avatarUrl" size="xl" />
              <div>
                <NuxtLink :to="`/u/${course.instructor.username}`" class="text-xl font-bold text-ink hover:text-brand-700">{{ course.instructorProfile.displayName }}</NuxtLink>
                <p v-if="course.instructorProfile.institution" class="text-sm text-ink-muted">{{ course.instructorProfile.institution }}</p>
                <p class="mt-3 text-[15px] text-ink">{{ course.instructorProfile.bio ?? 'This instructor has not added a bio yet.' }}</p>
              </div>
            </UiCard>
          </div>

          <div class="mt-12"><CommentThread target-type="COURSE" :target-id="course.id" /></div>
        </div>
      </div>
    </template>
  </div>
</template>
