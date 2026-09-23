<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next';
import type { Paginated, TutorialSummary } from '~/types/api';

const api = useApi();
const { tree } = useNavigation();
const category = useQueryParam('category');
const page = useQueryPage();

const { data, status, error, refresh } = await useAsyncData(
  () => `tutorials:${category.value}:${page.value}`,
  () => api.get<Paginated<TutorialSummary>>('/tutorials', { category: category.value || undefined, page: page.value, pageSize: 12 }, { auth: false }),
  { watch: [category, page] },
);

const tabs = computed(() => [{ value: '', label: 'All' }, ...tree.value.map((c) => ({ value: c.slug, label: c.name }))]);

useContentSeo({
  title: 'Tutorials',
  description: 'Structured, chapter-based tutorials on data structures, algorithms, programming languages, databases and more.',
  path: '/tutorials',
});
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 py-8">
    <UiBreadcrumbs :items="[{ label: 'Tutorials', to: '/tutorials' }]" class="mb-4" />
    <h1 class="text-3xl font-bold tracking-tight text-ink">Tutorials</h1>
    <p class="mt-1 max-w-2xl text-ink-muted">Learn step by step. Each tutorial is organised into chapters and lessons, with progress tracking when you sign in.</p>

    <UiTabs v-model="category" :tabs="tabs" class="mt-6" />

    <div class="mt-8">
      <div v-if="status === 'pending'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><UiSkeleton v-for="i in 6" :key="i" variant="card" /></div>
      <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
      <template v-else-if="data?.items.length">
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><TutorialCard v-for="t in data.items" :key="t.id" :tutorial="t" /></div>
        <UiPagination v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-8" />
      </template>
      <UiEmptyState v-else title="No tutorials in this category yet" description="Try another category or browse all tutorials." :icon="BookOpen">
        <UiButton variant="secondary" size="sm" @click="category = ''">Show all</UiButton>
      </UiEmptyState>
    </div>
  </div>
</template>
