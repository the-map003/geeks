<script setup lang="ts">
import { HelpCircle } from 'lucide-vue-next';
import type { Paginated, QuizSummary } from '~/types/api';

const api = useApi();
const { tree } = useNavigation();
const category = useQueryParam('category');
const difficulty = useQueryParam('difficulty');
const sort = useQueryParam('sort', 'popular');
const page = useQueryPage();

const query = computed(() => ({ category: category.value || undefined, difficulty: difficulty.value || undefined, sort: sort.value, page: page.value, pageSize: 12 }));
const { data, status, error, refresh } = await useAsyncData(() => `quizzes:${JSON.stringify(query.value)}`, () => api.get<Paginated<QuizSummary>>('/quizzes', query.value, { auth: false }), { watch: [query] });

const tabs = computed(() => [{ value: '', label: 'All quizzes' }, ...tree.value.flatMap((c) => [{ value: c.slug, label: c.name }])]);
const activeCategory = computed(() => {
  for (const c of tree.value) {
    if (c.slug === category.value) return c;
    const child = c.children?.find((ch) => ch.slug === category.value);
    if (child) return child;
  }
  return null;
});

useContentSeo(() => ({ title: activeCategory.value ? `${activeCategory.value.name} Quizzes` : 'Quiz Hub', description: 'Test your knowledge with topic-wise multiple-choice quizzes on programming languages, DSA, DBMS, operating systems and more.', path: '/quizzes' }));
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 py-8">
    <UiBreadcrumbs :items="[{ label: 'Quizzes', to: '/quizzes' }, ...(activeCategory ? [{ label: activeCategory.name }] : [])]" class="mb-4" />
    <h1 class="text-3xl font-bold tracking-tight text-ink">Quiz Hub: Test Your Knowledge</h1>
    <p class="mt-1 max-w-2xl text-ink-muted">Multiple-choice quizzes with instant scoring and explanations. Sign in to keep your attempt history.</p>

    <UiTabs v-model="category" :tabs="tabs" class="mt-6" />
    <div class="mt-4 flex flex-wrap gap-3">
      <UiSelect v-model="difficulty" :options="[{ value: '', label: 'Any difficulty' }, { value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }]" size="sm" class="w-44" />
      <UiSelect v-model="sort" :options="[{ value: 'popular', label: 'Most attempted' }, { value: 'newest', label: 'Newest' }, { value: 'title', label: 'Title A–Z' }]" size="sm" class="w-44" />
    </div>

    <div class="mt-8">
      <div v-if="status === 'pending'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><UiSkeleton v-for="i in 6" :key="i" variant="rect" class="h-52" /></div>
      <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
      <template v-else-if="data?.items.length">
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><QuizCard v-for="q in data.items" :key="q.id" :quiz="q" /></div>
        <UiPagination v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-8" />
      </template>
      <UiEmptyState v-else title="No quizzes here yet" description="Try another category or difficulty." :icon="HelpCircle">
        <UiButton variant="secondary" size="sm" @click="navigateTo('/quizzes')">Show all quizzes</UiButton>
      </UiEmptyState>
    </div>
  </div>
</template>
