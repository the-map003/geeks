<script setup lang="ts">
import type { ArticleSummary, Category, CourseSummary, ProblemSummary, QuizSummary, TutorialSummary } from '~/types/api';

interface CategoryHub {
  category: Category & { parent: Category | null; children: Category[] };
  articles: ArticleSummary[];
  tutorials: TutorialSummary[];
  problems: ProblemSummary[];
  courses: CourseSummary[];
  quizzes: QuizSummary[];
}

const route = useRoute();
const api = useApi();
const slug = computed(() => route.params.slug as string);

const { data, status, error } = await useAsyncData(() => `category:${slug.value}`, () => api.get<CategoryHub>(`/categories/${slug.value}`, undefined, { auth: false }), {
  watch: [slug],
});

if (status.value === 'error' && error.value) {
  const e = error.value as unknown as { status?: number };
  throw createError({ statusCode: e.status === 404 ? 404 : 500, statusMessage: e.status === 404 ? 'Category not found' : 'Failed to load category', fatal: true });
}

const hub = computed(() => data.value);
const cat = computed(() => hub.value?.category);

const tab = ref('all');
const tabs = computed(() => {
  const c = cat.value?.counts;
  return [
    { value: 'all', label: 'Overview' },
    { value: 'articles', label: 'Articles', count: c?.articles },
    { value: 'tutorials', label: 'Tutorials', count: c?.tutorials },
    { value: 'problems', label: 'Problems', count: c?.problems },
    { value: 'courses', label: 'Courses', count: c?.courses },
    { value: 'quizzes', label: 'Quizzes', count: c?.quizzes },
  ];
});

const crumbs = computed(() => [
  ...(cat.value?.parent ? [{ label: cat.value.parent.name, to: `/categories/${cat.value.parent.slug}` }] : []),
  { label: cat.value?.name ?? '' },
]);

useContentSeo(() => ({
  title: cat.value ? `${cat.value.name} — Tutorials, Articles & Practice` : 'Category',
  description: cat.value?.description ?? '',
  path: `/categories/${slug.value}`,
}));
</script>

<template>
  <div>
    <div v-if="status === 'pending' && !hub" class="mx-auto max-w-[1240px] px-4 py-8 space-y-4">
      <UiSkeleton variant="title" />
      <UiSkeleton :lines="2" />
      <div class="grid gap-4 sm:grid-cols-3"><UiSkeleton v-for="i in 3" :key="i" variant="card" /></div>
    </div>

    <template v-else-if="hub && cat">
      <section class="border-b border-line bg-surface-muted">
        <div class="mx-auto max-w-[1240px] px-4 py-8">
          <UiBreadcrumbs :items="crumbs" class="mb-4" />
          <div class="flex items-start gap-4">
            <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow" :style="{ backgroundColor: cat.color ?? '#2f8d46' }">
              <CategoryIcon :name="cat.icon" class="h-7 w-7" />
            </span>
            <div class="min-w-0">
              <h1 class="text-3xl font-bold tracking-tight text-ink">{{ cat.name }}</h1>
              <p class="mt-1 max-w-3xl text-ink-muted">{{ cat.description }}</p>
            </div>
          </div>
          <div v-if="cat.children.length" class="mt-5 flex flex-wrap gap-2">
            <NuxtLink v-for="child in cat.children" :key="child.id" :to="`/categories/${child.slug}`" class="rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-ink transition hover:border-brand-400 hover:text-brand-700">
              {{ child.name }}
            </NuxtLink>
          </div>
        </div>
      </section>

      <div class="mx-auto max-w-[1240px] px-4 py-8">
        <UiTabs v-model="tab" :tabs="tabs" class="mb-8" />

        <div class="space-y-14">
          <section v-if="(tab === 'all' || tab === 'tutorials') && hub.tutorials.length">
            <UiSectionHeader title="Tutorials" :to="`/tutorials?category=${cat.slug}`" />
            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><TutorialCard v-for="t in hub.tutorials" :key="t.id" :tutorial="t" /></div>
          </section>

          <section v-if="(tab === 'all' || tab === 'articles') && hub.articles.length">
            <UiSectionHeader title="Articles" :to="`/articles?category=${cat.slug}`" />
            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><ArticleCard v-for="a in hub.articles.slice(0, tab === 'all' ? 6 : 12)" :key="a.id" :article="a" /></div>
          </section>

          <section v-if="(tab === 'all' || tab === 'problems') && hub.problems.length">
            <UiSectionHeader title="Practice Problems" :to="`/problems`" />
            <div class="overflow-hidden rounded-lg border border-line"><ProblemRow v-for="p in hub.problems" :key="p.id" :problem="p" /></div>
          </section>

          <section v-if="(tab === 'all' || tab === 'courses') && hub.courses.length">
            <UiSectionHeader title="Courses" :to="`/courses?category=${cat.slug}`" />
            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><CourseCard v-for="c in hub.courses" :key="c.id" :course="c" /></div>
          </section>

          <section v-if="(tab === 'all' || tab === 'quizzes') && hub.quizzes.length">
            <UiSectionHeader title="Quizzes" :to="`/quizzes?category=${cat.slug}`" />
            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><QuizCard v-for="q in hub.quizzes" :key="q.id" :quiz="q" /></div>
          </section>

          <UiEmptyState
            v-if="
              (tab === 'articles' && !hub.articles.length) ||
              (tab === 'tutorials' && !hub.tutorials.length) ||
              (tab === 'problems' && !hub.problems.length) ||
              (tab === 'courses' && !hub.courses.length) ||
              (tab === 'quizzes' && !hub.quizzes.length) ||
              (tab === 'all' && !hub.articles.length && !hub.tutorials.length && !hub.problems.length && !hub.courses.length && !hub.quizzes.length)
            "
            title="Nothing here yet"
            description="Content for this topic is on its way. Explore other categories in the meantime."
          >
            <UiButton to="/" variant="secondary" size="sm">Back to home</UiButton>
          </UiEmptyState>
        </div>
      </div>
    </template>
  </div>
</template>
