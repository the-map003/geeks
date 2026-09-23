<script setup lang="ts">
import { GraduationCap } from 'lucide-vue-next';
import type { CourseLevel, CourseSummary, Paginated } from '~/types/api';
import { LEVEL_LABEL } from '~/utils/format';

const api = useApi();
const { tree } = useNavigation();
const category = useQueryParam('category');
const level = useQueryParam('level');
const sort = useQueryParam('sort', 'popular');
const free = useQueryParam('free');
const q = useQueryParam('q');
const page = useQueryPage();

const query = computed(() => ({
  category: category.value || undefined,
  level: level.value || undefined,
  sort: sort.value,
  free: free.value || undefined,
  q: q.value || undefined,
  page: page.value,
  pageSize: 12,
}));

const { data, status, error, refresh } = await useAsyncData(() => `courses:${JSON.stringify(query.value)}`, () => api.get<Paginated<CourseSummary>>('/courses', query.value, { auth: false }), {
  watch: [query],
});

const tabs = computed(() => [{ value: '', label: 'All courses' }, ...tree.value.map((c) => ({ value: c.slug, label: c.name }))]);
const levelOptions = [{ value: '', label: 'All levels' }, ...(Object.keys(LEVEL_LABEL) as CourseLevel[]).map((value) => ({ value, label: LEVEL_LABEL[value] }))];
const sortOptions = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
];

useContentSeo({ title: 'Courses', description: 'Interactive self-paced courses with modules, lessons and progress tracking.', path: '/courses' });
</script>

<template>
  <div>
    <section class="bg-gradient-to-b from-[#e6f5ea] to-page dark:from-[#14261b]">
      <div class="mx-auto max-w-[1240px] px-4 py-10 text-center">
        <h1 class="font-heading text-[30px] font-semibold text-ink-heading sm:text-[36px]">GeeksforGeeks Courses</h1>
        <p class="mt-1 font-heading text-[16px] text-ink-muted">Interactive Self-Paced Courses</p>
      </div>
    </section>

    <div class="mx-auto max-w-[1240px] px-4 py-8">
      <UiTabs v-model="category" :tabs="tabs" />
      <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiInput v-model="q" placeholder="Search courses…" />
        <UiSelect v-model="level" :options="levelOptions" />
        <UiSelect v-model="sort" :options="sortOptions" />
        <label class="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-ink">
          <input type="checkbox" class="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500" :checked="free === 'true'" @change="free = ($event.target as HTMLInputElement).checked ? 'true' : ''" />
          Free courses only
        </label>
      </div>

      <div class="mt-8">
        <div v-if="status === 'pending'" class="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"><UiSkeleton v-for="i in 6" :key="i" variant="card" /></div>
        <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
        <template v-else-if="data?.items.length">
          <p class="mb-3 text-sm text-ink-muted">{{ data.total }} course{{ data.total === 1 ? '' : 's' }}</p>
          <!-- Reference course listing: three 10px-radius cards per row with the homepage card design -->
          <div class="grid items-start gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"><CourseCard v-for="(c, i) in data.items" :key="c.id" :course="c" :index="i" /></div>
          <UiPagination v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-8" />
        </template>
        <UiEmptyState v-else title="No courses match your filters" description="Try removing a filter or searching for something else." :icon="GraduationCap">
          <UiButton variant="secondary" size="sm" @click="navigateTo('/courses')">Clear filters</UiButton>
        </UiEmptyState>
      </div>
    </div>
  </div>
</template>
