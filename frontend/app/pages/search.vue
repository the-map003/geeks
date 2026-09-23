<script setup lang="ts">
import { BookOpen, Code2, FileText, GraduationCap, HelpCircle, Search as SearchIcon } from 'lucide-vue-next';
import type { Difficulty, SearchItem, SearchResponse } from '~/types/api';
import { compactNumber, LEVEL_LABEL } from '~/utils/format';

const api = useApi();
const route = useRoute();
const { tree } = useNavigation();

const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''));
const type = useQueryParam('type', 'all');
const category = useQueryParam('category');
const difficulty = useQueryParam('difficulty');
const page = useQueryPage();

const query = computed(() => ({ q: q.value, type: type.value, category: category.value || undefined, difficulty: difficulty.value || undefined, page: page.value, pageSize: 10 }));
const enabled = computed(() => q.value.length >= 2);

const { data, status, error, refresh } = await useAsyncData(
  () => `search:${JSON.stringify(query.value)}`,
  () => (enabled.value ? api.get<SearchResponse & { fuzzy: boolean }>('/search', query.value, { auth: false }) : Promise.resolve(null)),
  { watch: [query] },
);

const tabs = computed(() => {
  const c = data.value?.counts;
  return [
    { value: 'all', label: 'All', count: c?.all },
    { value: 'articles', label: 'Articles', count: c?.articles },
    { value: 'tutorials', label: 'Tutorials', count: c?.tutorials },
    { value: 'courses', label: 'Courses', count: c?.courses },
    { value: 'problems', label: 'Problems', count: c?.problems },
    { value: 'quizzes', label: 'Quizzes', count: c?.quizzes },
  ];
});

const icons = { article: FileText, tutorial: BookOpen, course: GraduationCap, problem: Code2, quiz: HelpCircle };
const typeLabel = { article: 'Article', tutorial: 'Tutorial', course: 'Course', problem: 'Problem', quiz: 'Quiz' };

function highlight(text: string): string {
  if (!q.value) return escape(text);
  const words = q.value.split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return escape(text);
  return escape(text).replace(new RegExp(`(${words.join('|')})`, 'gi'), '<mark class="rounded bg-amber-100 px-0.5">$1</mark>');
}
function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function metaLine(item: SearchItem): string[] {
  const m = item.meta;
  switch (item.type) {
    case 'article':
      return [m.readingTimeMin ? `${m.readingTimeMin} min read` : '', m.viewCount ? `${compactNumber(Number(m.viewCount))} views` : ''].filter(Boolean);
    case 'tutorial':
      return [`${m.lessonCount} lessons`];
    case 'course':
      return [LEVEL_LABEL[m.level as keyof typeof LEVEL_LABEL] ?? '', m.isFree ? 'Free' : `$${Number(m.price).toFixed(0)}`, `${compactNumber(Number(m.enrollmentCount))} learners`].filter(Boolean);
    case 'problem':
      return [`${m.points} points`, m.submissionCount ? `${Math.round((Number(m.acceptedCount) / Number(m.submissionCount)) * 100)}% accuracy` : ''].filter(Boolean);
    case 'quiz':
      return [`${m.questionCount} questions`, m.timeLimitMin ? `${m.timeLimitMin} min` : ''].filter(Boolean);
  }
}

const categoryOptions = computed(() => [{ value: '', label: 'All categories' }, ...tree.value.flatMap((c) => [{ value: c.slug, label: c.name }, ...(c.children ?? []).map((ch) => ({ value: ch.slug, label: `  ${ch.name}` }))])]);
const difficultyOptions = [{ value: '', label: 'Any difficulty' }, { value: 'SCHOOL', label: 'School' }, { value: 'BASIC', label: 'Basic' }, { value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }];

useContentSeo(() => ({ title: q.value ? `Search: ${q.value}` : 'Search', description: 'Search articles, tutorials, courses, problems and quizzes.', path: '/search', noindex: true }));
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <h1 class="text-2xl font-bold text-ink">Search</h1>
    <div class="mt-3"><SearchBox size="lg" placeholder="Search everything…" :autofocus="!q" /></div>

    <template v-if="enabled">
      <UiTabs v-model="type" :tabs="tabs" class="mt-6" />
      <div class="mt-4 flex flex-wrap gap-3">
        <UiSelect v-model="category" :options="categoryOptions" size="sm" class="w-56" />
        <UiSelect v-model="difficulty" :options="difficultyOptions" size="sm" class="w-44" />
      </div>

      <div class="mt-6">
        <div v-if="status === 'pending'" class="space-y-3"><UiSkeleton v-for="i in 6" :key="i" variant="rect" class="h-24" /></div>
        <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
        <template v-else-if="data?.items.length">
          <p class="mb-3 text-sm text-ink-muted">
            {{ data.total }} result{{ data.total === 1 ? '' : 's' }} for “<strong class="text-ink">{{ q }}</strong>”
            <span v-if="data.fuzzy"> · showing title matches</span>
          </p>
          <ul class="divide-y divide-line rounded-lg border border-line bg-surface">
            <li v-for="item in data.items" :key="`${item.type}-${item.id}`">
              <NuxtLink :to="item.url" class="flex gap-4 px-4 py-4 transition hover:bg-surface-muted">
                <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><component :is="icons[item.type]" class="h-4 w-4" /></span>
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-center gap-2">
                    <UiBadge tone="gray" size="xs">{{ typeLabel[item.type] }}</UiBadge>
                    <DifficultyBadge v-if="item.meta.difficulty" :difficulty="item.meta.difficulty as Difficulty" size="xs" />
                  </span>
                  <!-- eslint-disable-next-line vue/no-v-html -- escaped then highlighted -->
                  <span class="mt-1 block text-base font-semibold text-ink" v-html="highlight(item.title)" />
                  <!-- eslint-disable-next-line vue/no-v-html -- escaped then highlighted -->
                  <span class="mt-0.5 line-clamp-2 block text-sm text-ink-muted" v-html="highlight(item.excerpt)" />
                  <span class="mt-1 block text-xs text-ink-muted">{{ metaLine(item).join(' · ') }}</span>
                </span>
              </NuxtLink>
            </li>
          </ul>
          <UiPagination v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-6" />
        </template>
        <UiEmptyState v-else :title="`No results for “${q}”`" description="Check the spelling, try fewer or more general words, or browse by topic." :icon="SearchIcon">
          <UiButton to="/articles" variant="secondary" size="sm">Articles</UiButton>
          <UiButton to="/problems" variant="secondary" size="sm">Problems</UiButton>
          <UiButton to="/courses" variant="secondary" size="sm">Courses</UiButton>
        </UiEmptyState>
      </div>
    </template>

    <div v-else class="mt-10">
      <p class="text-sm text-ink-muted">Type at least two characters to search across articles, tutorials, courses, problems and quizzes.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <NuxtLink v-for="s in ['binary search', 'python', 'sql joins', 'dynamic programming', 'docker', 'system design']" :key="s" :to="{ path: '/search', query: { q: s } }" class="rounded-full border border-line px-3 py-1 text-sm text-ink hover:border-brand-400 hover:text-brand-700">{{ s }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
