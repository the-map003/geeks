<script setup lang="ts">
import type { AuthorSummary, Paginated } from '~/types/api';
import { formatDateTime } from '~/utils/format';

definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Comments · Admin', robots: 'noindex' });

interface AdminComment {
  id: string;
  content: string;
  targetType: string;
  isHidden: boolean;
  isDeleted: boolean;
  hiddenReason: string | null;
  likeCount: number;
  openReports: number;
  createdAt: string;
  author: AuthorSummary;
  target: { title: string; url: string } | null;
}

const api = useApi();
const ui = useUiStore();
const state = useQueryParam('state', 'all');
const q = useQueryParam('q');
const page = useQueryPage();
const searchDraft = ref(q.value);
const query = computed(() => ({ state: state.value, q: q.value || undefined, page: page.value, pageSize: 20 }));
const { data, status, error, refresh } = await useAsyncData(() => `admin-comments:${JSON.stringify(query.value)}`, () => api.get<Paginated<AdminComment>>('/admin/comments', query.value), { watch: [query] });

const busy = ref<string | null>(null);
async function act(c: AdminComment, action: 'hide' | 'restore' | 'delete') {
  busy.value = c.id;
  try {
    await api.patch(`/admin/comments/${c.id}`, { action, reason: action === 'hide' ? 'Hidden by moderator' : undefined });
    ui.success(`Comment ${action === 'hide' ? 'hidden' : action === 'restore' ? 'restored' : 'deleted'}`);
    await refresh();
  } catch (err) {
    ui.error('Action failed', isApiError(err) ? err.message : undefined);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Comments" subtitle="Moderate discussion across articles, problems, lessons, courses and quizzes." />
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <UiTabs v-model="state" :tabs="[{ value: 'all', label: 'All' }, { value: 'reported', label: 'Reported' }, { value: 'hidden', label: 'Hidden' }, { value: 'deleted', label: 'Deleted' }]" variant="pills" size="sm" />
      <form class="flex gap-2" @submit.prevent="q = searchDraft"><UiInput v-model="searchDraft" placeholder="Search content…" class="w-56" /><UiButton type="submit" variant="secondary">Search</UiButton></form>
    </div>
    <div class="mt-4 space-y-3">
      <div v-if="status === 'pending'" class="space-y-3"><UiSkeleton v-for="i in 6" :key="i" variant="rect" class="h-24" /></div>
      <UiErrorState v-else-if="status === 'error'" :message="error?.message" compact @retry="refresh()" />
      <UiEmptyState v-else-if="!data?.items.length" title="No comments in this view" compact />
      <UiCard v-for="c in data?.items ?? []" v-else :key="c.id" class="flex flex-col gap-3 sm:flex-row sm:items-start">
        <UiAvatar :name="c.author.displayName" :src="c.author.avatarUrl" size="sm" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-semibold text-ink">{{ c.author.displayName }}</span>
            <span class="text-ink-muted">on</span>
            <NuxtLink v-if="c.target" :to="c.target.url" class="truncate font-medium text-brand-600 hover:underline">{{ c.target.title }}</NuxtLink>
            <span class="text-xs text-ink-muted">· {{ formatDateTime(c.createdAt) }}</span>
            <UiBadge v-if="c.isDeleted" tone="gray" size="xs">Deleted</UiBadge>
            <UiBadge v-else-if="c.isHidden" tone="amber" size="xs">Hidden</UiBadge>
            <UiBadge v-if="c.openReports" tone="red" size="xs">{{ c.openReports }} open report{{ c.openReports === 1 ? '' : 's' }}</UiBadge>
          </div>
          <p class="mt-1 whitespace-pre-line text-sm" :class="c.isDeleted ? 'italic text-ink-muted' : 'text-ink'">{{ c.isDeleted ? '[deleted]' : c.content }}</p>
          <p v-if="c.hiddenReason && c.isHidden" class="mt-1 text-xs text-amber-700">Reason: {{ c.hiddenReason }}</p>
        </div>
        <div v-if="!c.isDeleted" class="flex shrink-0 gap-2">
          <UiButton v-if="!c.isHidden" size="xs" variant="secondary" :loading="busy === c.id" @click="act(c, 'hide')">Hide</UiButton>
          <UiButton v-else size="xs" variant="secondary" :loading="busy === c.id" @click="act(c, 'restore')">Restore</UiButton>
          <UiButton size="xs" variant="danger" :loading="busy === c.id" @click="act(c, 'delete')">Delete</UiButton>
        </div>
      </UiCard>
    </div>
    <UiPagination v-if="data" v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-4" />
  </div>
</template>
