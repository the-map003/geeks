<script setup lang="ts">
import { Tag } from 'lucide-vue-next';
import type { ArticleSummary, Paginated } from '~/types/api';

const route = useRoute();
const api = useApi();
const slug = computed(() => route.params.slug as string);
const page = useQueryPage();

const { data, status, error, refresh } = await useAsyncData(
  () => `tag:${slug.value}:${page.value}`,
  () => api.get<Paginated<ArticleSummary>>('/articles', { tag: slug.value, page: page.value, pageSize: 12 }, { auth: false }),
  { watch: [slug, page] },
);

const tagName = computed(() => data.value?.items[0]?.tags.find((t) => t.slug === slug.value)?.name ?? slug.value.replace(/-/g, ' '));

useContentSeo(() => ({ title: `#${tagName.value} articles`, description: `Articles tagged ${tagName.value}.`, path: `/tags/${slug.value}` }));
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 py-8">
    <UiBreadcrumbs :items="[{ label: 'Articles', to: '/articles' }, { label: `#${tagName}` }]" class="mb-4" />
    <h1 class="inline-flex items-center gap-2 text-3xl font-bold text-ink"><Tag class="h-7 w-7 text-brand-500" /> {{ tagName }}</h1>
    <p class="mt-1 text-ink-muted">Articles tagged with “{{ tagName }}”.</p>

    <div class="mt-8">
      <div v-if="status === 'pending'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><UiSkeleton v-for="i in 6" :key="i" variant="card" /></div>
      <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
      <template v-else-if="data?.items.length">
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><ArticleCard v-for="a in data.items" :key="a.id" :article="a" /></div>
        <UiPagination v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-8" />
      </template>
      <UiEmptyState v-else title="No articles with this tag" description="Try browsing all articles instead.">
        <UiButton to="/articles" variant="secondary" size="sm">Browse articles</UiButton>
      </UiEmptyState>
    </div>
  </div>
</template>
