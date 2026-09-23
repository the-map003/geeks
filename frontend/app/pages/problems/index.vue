<script setup lang="ts">
import { ArrowRight, BarChart3, Building2, ChevronDown, ChevronRight, Code2, GraduationCap, LayoutGrid, List, Search, Tag, ArrowUpDown, CheckCircle2, Flame } from 'lucide-vue-next';
import type { CourseSummary, Difficulty, Paginated, ProblemSummary, Topic } from '~/types/api';
import { DIFFICULTY_LABEL } from '~/utils/format';

const api = useApi();
const auth = useAuthStore();

const difficulty = useQueryParam('difficulty');
const topic = useQueryParam('topic');
const status = useQueryParam('status');
const sort = useQueryParam('sort', 'popular');
const q = useQueryParam('q');
const company = useQueryParam('company');
const page = useQueryPage();
const searchDraft = ref(q.value);
watch(q, (v) => (searchDraft.value = v));

const hasFilters = computed(() => !!(difficulty.value || topic.value || status.value || q.value || company.value || sort.value !== 'popular'));

const query = computed(() => ({
  difficulty: difficulty.value || undefined,
  topic: topic.value || undefined,
  status: status.value || undefined,
  company: company.value || undefined,
  sort: sort.value,
  q: q.value || undefined,
  page: page.value,
  pageSize: 20,
}));

// Flat list (used when any filter is active) …
const { data, status: loadStatus, error, refresh } = await useAsyncData(
  () => `problems:${JSON.stringify(query.value)}:${auth.isAuthenticated}`,
  () => (hasFilters.value ? api.get<Paginated<ProblemSummary>>('/problems', query.value) : Promise.resolve(null)),
  { watch: [query, hasFilters, () => auth.isAuthenticated] },
);

// … otherwise the reference-style grouped-by-topic view.
const { data: overview } = await useAsyncData('problems-overview', () => api.get<{ total: number; topics: Topic[]; problemOfTheDay: ProblemSummary | null }>('/problems/overview', undefined, { auth: false }));
const { data: topicsData } = await useAsyncData('topics', () => api.get<{ topics: Topic[] }>('/topics', undefined, { auth: false }));
const topics = computed(() => (topicsData.value?.topics ?? []).filter((t) => (t.problemCount ?? 0) > 0).sort((a, b) => (b.problemCount ?? 0) - (a.problemCount ?? 0)));
const { data: featured } = useAsyncData('problems-featured-course', () => api.get<Paginated<CourseSummary>>('/courses', { pageSize: 1, sort: 'popular' }, { auth: false }), { lazy: true, server: false });

const expanded = ref<Set<string>>(new Set());
const groupRows = ref<Record<string, ProblemSummary[] | 'loading' | 'error'>>({});
async function toggleGroup(t: Topic) {
  const next = new Set(expanded.value);
  if (next.has(t.slug)) {
    next.delete(t.slug);
    expanded.value = next;
    return;
  }
  next.add(t.slug);
  expanded.value = next;
  if (!groupRows.value[t.slug]) {
    groupRows.value[t.slug] = 'loading';
    try {
      const res = await api.get<Paginated<ProblemSummary>>('/problems', { topic: t.slug, pageSize: 50, sort: 'difficulty' });
      groupRows.value[t.slug] = res.items;
    } catch {
      groupRows.value[t.slug] = 'error';
    }
  }
}
watch(() => auth.isAuthenticated, () => { groupRows.value = {}; expanded.value = new Set(); });

const difficulties: Difficulty[] = ['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD'];
const companies = ['Tech Startup', 'Fintech Corp', 'E-commerce Co', 'Cloud Inc', 'Data Systems Ltd', 'Mobile Apps Inc', 'Search Labs', 'Social Network Co'];
const sortOptions = [
  { value: 'popular', label: 'Most submitted' },
  { value: 'newest', label: 'Newest' },
  { value: 'accuracy', label: 'Highest accuracy' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'title', label: 'Title A–Z' },
];
const view = ref<'list' | 'grid'>('list');
function clearFilters() {
  navigateTo('/problems');
}

useContentSeo({ title: 'Practice Problems', description: 'Solve coding problems by topic and difficulty with an online judge supporting Python, JavaScript, C++ and Java.', path: '/problems' });
</script>

<template>
  <div class="bg-surface">
    <div class="mx-auto grid max-w-[1260px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div class="min-w-0">
        <!-- Banner -->
        <section class="rounded-xl bg-navy-dark p-4 text-white">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex items-center gap-3 rounded-lg bg-white/10 p-3">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2f7bd6]/40 text-white"><Flame class="h-5 w-5" /></span>
              <div class="min-w-0 flex-1">
                <p class="font-heading text-[15px] font-bold">Problem of the Day</p>
                <p class="truncate text-[12px] text-gray-300">{{ overview?.problemOfTheDay?.title ?? 'A fresh challenge every day' }}</p>
              </div>
              <NuxtLink :to="overview?.problemOfTheDay ? `/problems/${overview.problemOfTheDay.slug}` : '/practice'" class="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 text-[13px] font-semibold hover:bg-white/20">Start Now <ArrowRight class="h-3.5 w-3.5" /></NuxtLink>
            </div>
            <div class="flex items-center gap-3 rounded-lg bg-white/10 p-3">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2f8d46]/50 text-white"><GraduationCap class="h-5 w-5" /></span>
              <div class="min-w-0 flex-1">
                <p class="font-heading text-[15px] font-bold">Step by Step DSA</p>
                <p class="truncate text-[12px] text-gray-300">Learn DSA chapter by chapter</p>
              </div>
              <NuxtLink to="/tutorials/dsa-tutorial" class="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 text-[13px] font-semibold hover:bg-white/20">Start Now <ArrowRight class="h-3.5 w-3.5" /></NuxtLink>
            </div>
          </div>
        </section>

        <!-- Filter card -->
        <section class="mt-5 rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="font-heading text-[18px] font-bold text-ink-heading">All Problems</h1>
            <div class="inline-flex rounded-lg bg-surface-muted p-0.5">
              <button type="button" class="rounded-md p-1.5" :class="view === 'grid' ? 'bg-surface text-brand-600 shadow' : 'text-ink-muted'" aria-label="Grid view" @click="view = 'grid'"><LayoutGrid class="h-4 w-4" /></button>
              <button type="button" class="rounded-md p-1.5" :class="view === 'list' ? 'bg-surface text-brand-600 shadow' : 'text-ink-muted'" aria-label="List view" @click="view = 'list'"><List class="h-4 w-4" /></button>
            </div>
            <span class="ml-auto rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-heading">{{ hasFilters && data ? data.total : overview?.total ?? '—' }} problems</span>
          </div>
          <div class="mt-4 flex flex-wrap gap-2.5">
            <form class="relative" @submit.prevent="q = searchDraft">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input v-model="searchDraft" type="search" placeholder="Search problems..." class="h-9 w-52 rounded-md border border-line bg-surface pl-9 pr-3 text-[14px] focus:border-brand-500 focus:outline-none" />
            </form>
            <div class="relative"><Tag class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /><select v-model="topic" class="h-9 appearance-none rounded-md border border-line bg-surface pl-9 pr-8 text-[14px] text-ink-heading focus:border-brand-500 focus:outline-none"><option value="">Topic</option><option v-for="t in topics" :key="t.id" :value="t.slug">{{ t.name }} ({{ t.problemCount }})</option></select><ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /></div>
            <div class="relative"><BarChart3 class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /><select v-model="difficulty" class="h-9 appearance-none rounded-md border border-line bg-surface pl-9 pr-8 text-[14px] text-ink-heading focus:border-brand-500 focus:outline-none"><option value="">Difficulty</option><option v-for="d in difficulties" :key="d" :value="d">{{ DIFFICULTY_LABEL[d] }}</option></select><ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /></div>
            <div class="relative"><Building2 class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /><select v-model="company" class="h-9 appearance-none rounded-md border border-line bg-surface pl-9 pr-8 text-[14px] text-ink-heading focus:border-brand-500 focus:outline-none"><option value="">Company</option><option v-for="c in companies" :key="c" :value="c">{{ c }}</option></select><ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /></div>
            <div class="relative"><ArrowUpDown class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /><select v-model="sort" class="h-9 appearance-none rounded-md border border-line bg-surface pl-9 pr-8 text-[14px] text-ink-heading focus:border-brand-500 focus:outline-none"><option v-for="s in sortOptions" :key="s.value" :value="s.value">{{ s.label }}</option></select><ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /></div>
            <ClientOnly><div v-if="auth.isAuthenticated" class="relative"><CheckCircle2 class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /><select v-model="status" class="h-9 appearance-none rounded-md border border-line bg-surface pl-9 pr-8 text-[14px] text-ink-heading focus:border-brand-500 focus:outline-none"><option value="">Status</option><option value="unsolved">Unsolved</option><option value="attempted">Attempted</option><option value="solved">Solved</option></select><ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /></div></ClientOnly>
            <UiButton v-if="hasFilters" variant="ghost" size="sm" @click="clearFilters">Clear</UiButton>
          </div>
        </section>

        <!-- Table -->
        <section class="mt-4">
          <div class="hidden grid-cols-[70px_minmax(0,1fr)_180px_120px_100px] gap-3 px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted sm:grid">
            <span>Status</span><span>Problem</span><span>Companies</span><span class="text-right">Submissions</span><span class="text-right">Accuracy</span>
          </div>

          <!-- Grouped view -->
          <div v-if="!hasFilters" class="overflow-hidden rounded-xl border border-line">
            <template v-if="topics.length">
              <div v-for="t in topics" :key="t.id" class="border-b border-line last:border-b-0">
                <button type="button" class="flex w-full items-center gap-3 bg-surface-muted/60 px-5 py-3 text-left hover:bg-surface-muted" :aria-expanded="expanded.has(t.slug)" @click="toggleGroup(t)">
                  <ChevronDown v-if="expanded.has(t.slug)" class="h-4 w-4 text-ink-muted" /><ChevronRight v-else class="h-4 w-4 text-ink-muted" />
                  <span class="flex-1 font-heading text-[16px] font-bold text-navy">{{ t.name }}</span>
                  <span class="text-[13px] text-[#4a6fa5]">{{ t.problemCount }} Problems</span>
                </button>
                <div v-if="expanded.has(t.slug)" :class="view === 'grid' ? 'grid gap-3 p-3 sm:grid-cols-2' : ''">
                  <template v-if="groupRows[t.slug] === 'loading'"><UiSkeleton v-for="i in 4" :key="i" variant="row" /></template>
                  <UiErrorState v-else-if="groupRows[t.slug] === 'error'" message="Could not load this topic." compact @retry="toggleGroup(t); toggleGroup(t)" />
                  <template v-else-if="Array.isArray(groupRows[t.slug])">
                    <ProblemRow v-for="p in groupRows[t.slug] as ProblemSummary[]" :key="p.id" :problem="p" :dense="view === 'grid'" :class="view === 'grid' ? 'rounded-lg border border-line' : ''" />
                  </template>
                </div>
              </div>
            </template>
            <UiEmptyState v-else title="No problems yet" compact :icon="Code2" />
          </div>

          <!-- Flat filtered view -->
          <div v-else class="overflow-hidden rounded-xl border border-line">
            <template v-if="loadStatus === 'pending'"><UiSkeleton v-for="i in 10" :key="i" variant="row" /></template>
            <UiErrorState v-else-if="loadStatus === 'error'" :message="error?.message" compact @retry="refresh()" />
            <template v-else-if="data?.items.length">
              <div :class="view === 'grid' ? 'grid gap-3 p-3 sm:grid-cols-2' : ''">
                <ProblemRow v-for="p in data.items" :key="p.id" :problem="p" :dense="view === 'grid'" :class="view === 'grid' ? 'rounded-lg border border-line' : ''" />
              </div>
            </template>
            <UiEmptyState v-else title="No problems match these filters" description="Try removing a filter or changing your search." :icon="Code2" compact>
              <UiButton variant="secondary" size="sm" @click="clearFilters">Clear filters</UiButton>
            </UiEmptyState>
          </div>
          <UiPagination v-if="hasFilters && data" v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-6" />
        </section>
      </div>

      <!-- Right column -->
      <aside class="space-y-5">
        <div v-if="featured?.items[0]" class="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div class="h-1.5 bg-gradient-to-r from-brand-500 to-brand-300" />
          <div class="p-5">
            <span class="inline-block rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">Featured course</span>
            <p class="mt-3 font-heading text-[24px] font-bold leading-tight text-ink-heading">{{ featured.items[0].title }}</p>
            <ul class="mt-4 space-y-2.5 text-[14px] text-ink">
              <li class="flex items-start gap-2"><CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {{ featured.items[0].lessonCount }} lessons · {{ featured.items[0].durationHours }} hours</li>
              <li class="flex items-start gap-2"><CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> Progress tracking and completion</li>
              <li class="flex items-start gap-2"><CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {{ featured.items[0].isFree ? 'Free to enrol' : 'Free to enrol in this build' }}</li>
            </ul>
            <NuxtLink :to="`/courses/${featured.items[0].slug}`" class="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 font-heading text-[16px] font-bold text-white hover:bg-brand-600">Enroll Now <ArrowRight class="h-4 w-4" /></NuxtLink>
          </div>
        </div>
        <div class="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <p class="font-heading text-[16px] font-bold text-ink-heading">Practice by difficulty</p>
          <ul class="mt-3 space-y-1.5">
            <li v-for="d in difficulties" :key="d"><NuxtLink :to="{ path: '/problems', query: { difficulty: d } }" class="flex items-center justify-between rounded-md px-2 py-1.5 text-[14px] text-ink hover:bg-surface-muted"><span>{{ DIFFICULTY_LABEL[d] }}</span><DifficultyBadge :difficulty="d" size="xs" /></NuxtLink></li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>
