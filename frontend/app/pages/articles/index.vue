<script setup lang="ts">
import { FileText, SlidersHorizontal } from 'lucide-vue-next';
import type { ArticleSummary, Paginated } from '~/types/api';

const api = useApi();
const route = useRoute();
const { tree } = useNavigation();

const category = useQueryParam('category');
const difficulty = useQueryParam('difficulty');
const sort = useQueryParam('sort', 'latest');
const q = useQueryParam('q');
const page = useQueryPage();
const showFilters = ref(false);

const query = computed(() => ({
  page: page.value,
  pageSize: 12,
  category: category.value || undefined,
  difficulty: difficulty.value || undefined,
  sort: sort.value,
  q: q.value || undefined,
}));

const { data, status, error, refresh } = await useAsyncData(
  () => `articles:${JSON.stringify(query.value)}`,
  () => api.get<Paginated<ArticleSummary>>('/articles', query.value, { auth: false }),
  { watch: [query] },
);

const categoryOptions = computed(() => [
  { value: '', label: 'All categories' },
  ...tree.value.flatMap((c) => [{ value: c.slug, label: c.name }, ...(c.children ?? []).map((ch) => ({ value: ch.slug, label: `  ${ch.name}` }))]),
]);
const difficultyOptions = [
  { value: '', label: 'Any difficulty' },
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];
const sortOptions = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'trending', label: 'Trending this week' },
  { value: 'oldest', label: 'Oldest' },
];

const activeCategory = computed(() => {
  for (const c of tree.value) {
    if (c.slug === category.value) return c;
    const child = c.children?.find((ch) => ch.slug === category.value);
    if (child) return child;
  }
  return null;
});

function clearFilters() {
  navigateTo({ path: '/articles' });
}

useContentSeo(() => ({
  title: activeCategory.value ? `${activeCategory.value.name} Articles` : 'Articles',
  description: 'Browse in-depth programming articles on data structures, algorithms, languages, web development and computer science.',
  path: route.fullPath.split('?')[0]!,
}));
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 py-8">
    <UiBreadcrumbs :items="[{ label: 'Articles', to: '/articles' }]" class="mb-4" />
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-ink">{{ activeCategory ? `${activeCategory.name} Articles` : 'Articles' }}</h1>
        <p class="mt-1 text-ink-muted">{{ activeCategory?.description ?? 'Clear explanations, worked examples and multi-language code for every topic.' }}</p>
      </div>
      <UiButton variant="secondary" size="sm" class="lg:hidden" @click="showFilters = !showFilters"><SlidersHorizontal class="h-4 w-4" /> Filters</UiButton>
    </div>

    <div class="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
      <!-- Sidebar -->
      <aside :class="showFilters ? 'block' : 'hidden lg:block'">
        <div class="sticky top-32 space-y-5">
          <UiCard padding="sm">
            <p class="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Filter</p>
            <div class="space-y-3 px-1">
              <UiSelect v-model="category" :options="categoryOptions" label="Category" size="sm" />
              <UiSelect v-model="difficulty" :options="difficultyOptions" label="Difficulty" size="sm" />
              <UiSelect v-model="sort" :options="sortOptions" label="Sort by" size="sm" />
              <UiInput v-model="q" label="Search in articles" placeholder="e.g. binary search" />
              <UiButton v-if="category || difficulty || q || sort !== 'latest'" variant="ghost" size="sm" block @click="clearFilters">Clear filters</UiButton>
            </div>
          </UiCard>
          <UiCard padding="sm" class="hidden lg:block">
            <p class="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Browse by topic</p>
            <ul class="max-h-[50vh] space-y-0.5 overflow-y-auto px-1">
              <li v-for="c in tree" :key="c.id">
                <button type="button" class="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-surface-muted" :class="category === c.slug ? 'bg-brand-50 text-brand-700' : 'text-ink'" @click="category = c.slug">
                  {{ c.name }}
                </button>
                <ul v-if="c.children?.length" class="ml-3 border-l border-line pl-2">
                  <li v-for="ch in c.children" :key="ch.id">
                    <button type="button" class="w-full rounded-md px-2 py-1 text-left text-[13px] hover:bg-surface-muted" :class="category === ch.slug ? 'bg-brand-50 text-brand-700' : 'text-ink-muted'" @click="category = ch.slug">
                      {{ ch.name }}
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </UiCard>
        </div>
      </aside>

      <!-- Results -->
      <section>
        <div v-if="status === 'pending'" class="space-y-4">
          <UiSkeleton v-for="i in 6" :key="i" variant="rect" class="h-36" />
        </div>
        <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
        <template v-else-if="data && data.items.length">
          <p class="mb-3 text-sm text-ink-muted">{{ data.total }} article{{ data.total === 1 ? '' : 's' }}</p>
          <div class="space-y-4">
            <ArticleCard v-for="a in data.items" :key="a.id" :article="a" variant="row" />
          </div>
          <UiPagination v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-8" />
        </template>
        <UiEmptyState v-else title="No articles found" description="Try a different category, difficulty or search term." :icon="FileText">
          <UiButton variant="secondary" size="sm" @click="clearFilters">Clear filters</UiButton>
        </UiEmptyState>
      </section>
    </div>
  </div>
</template>
