<script setup lang="ts">
import { Bookmark as BookmarkIcon, X } from 'lucide-vue-next';
import type { Bookmark, BookmarkType, Paginated } from '~/types/api';

definePageMeta({ middleware: 'auth' });
useSeoMeta({ title: 'Bookmarks', robots: 'noindex' });

const api = useApi();
const ui = useUiStore();
const type = useQueryParam('type');
const page = useQueryPage();

const { data, status, error, refresh } = await useAsyncData(
  () => `bookmarks:${type.value}:${page.value}`,
  () => api.get<Paginated<Bookmark> & { counts: Record<BookmarkType, number> }>('/bookmarks', { type: type.value || undefined, page: page.value, pageSize: 12 }),
  { watch: [type, page] },
);

const tabs = computed(() => {
  const c = data.value?.counts;
  const all = c ? Object.values(c).reduce((s, n) => s + n, 0) : undefined;
  return [
    { value: '', label: 'All', count: all },
    { value: 'ARTICLE', label: 'Articles', count: c?.ARTICLE },
    { value: 'PROBLEM', label: 'Problems', count: c?.PROBLEM },
    { value: 'TUTORIAL', label: 'Tutorials', count: c?.TUTORIAL },
    { value: 'COURSE', label: 'Courses', count: c?.COURSE },
  ];
});

async function remove(b: Bookmark) {
  try {
    await api.del(`/bookmarks/${b.id}`);
    ui.success('Bookmark removed');
    refresh();
  } catch (err) {
    ui.error('Could not remove bookmark', isApiError(err) ? err.message : undefined);
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 py-8">
    <h1 class="text-3xl font-bold tracking-tight text-ink">Bookmarks</h1>
    <p class="mt-1 text-ink-muted">Everything you saved, in one place.</p>
    <UiTabs v-model="type" :tabs="tabs" class="mt-6" />

    <div class="mt-6">
      <div v-if="status === 'pending'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><UiSkeleton v-for="i in 6" :key="i" variant="card" /></div>
      <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
      <template v-else-if="data?.items.length">
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="b in data.items" :key="b.id" class="relative">
            <button type="button" class="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-ink-muted shadow ring-1 ring-line hover:text-red-600" aria-label="Remove bookmark" @click="remove(b)"><X class="h-4 w-4" /></button>
            <ArticleCard v-if="b.target.type === 'ARTICLE'" :article="b.target.item" />
            <TutorialCard v-else-if="b.target.type === 'TUTORIAL'" :tutorial="b.target.item" />
            <CourseCard v-else-if="b.target.type === 'COURSE'" :course="b.target.item" />
            <div v-else class="overflow-hidden rounded-lg border border-line bg-surface"><ProblemRow :problem="b.target.item" /></div>
          </div>
        </div>
        <UiPagination v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-8" />
      </template>
      <UiEmptyState v-else title="No bookmarks yet" description="Use the Save button on articles, problems, tutorials and courses to collect them here." :icon="BookmarkIcon">
        <UiButton to="/articles" variant="secondary" size="sm">Browse articles</UiButton>
        <UiButton to="/problems" variant="secondary" size="sm">Browse problems</UiButton>
      </UiEmptyState>
    </div>
  </div>
</template>
