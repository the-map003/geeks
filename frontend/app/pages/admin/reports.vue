<script setup lang="ts">
import type { AuthorSummary, Paginated } from '~/types/api';
import { formatDateTime } from '~/utils/format';

definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Reports · Admin', robots: 'noindex' });

interface AdminReport {
  id: string;
  targetType: string;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  reporter: AuthorSummary;
  resolvedBy: AuthorSummary | null;
  comment: { id: string; content: string; isHidden: boolean; isDeleted: boolean; author: AuthorSummary } | null;
  article: { title: string; slug: string } | null;
  problem: { title: string; slug: string } | null;
  reportedUser: AuthorSummary | null;
}

const api = useApi();
const ui = useUiStore();
const status = useQueryParam('status', 'OPEN');
const page = useQueryPage();
const query = computed(() => ({ status: status.value || undefined, page: page.value, pageSize: 20 }));
const { data, status: loadStatus, error, refresh } = await useAsyncData(() => `admin-reports:${JSON.stringify(query.value)}`, () => api.get<Paginated<AdminReport> & { openCount: number }>('/admin/reports', query.value), { watch: [query] });

const acting = ref<AdminReport | null>(null);
const action = ref<'resolve' | 'dismiss'>('resolve');
const note = ref('');
const hideComment = ref(true);
const busy = ref(false);

function openModal(r: AdminReport, a: 'resolve' | 'dismiss') {
  acting.value = r;
  action.value = a;
  note.value = '';
  hideComment.value = a === 'resolve';
}
async function submit() {
  if (!acting.value) return;
  busy.value = true;
  try {
    await api.patch(`/admin/reports/${acting.value.id}`, { action: action.value, note: note.value || undefined, hideComment: acting.value.comment ? hideComment.value : undefined });
    ui.success(`Report ${action.value}d`);
    acting.value = null;
    await refresh();
  } catch (err) {
    ui.error('Action failed', isApiError(err) ? err.message : undefined);
  } finally {
    busy.value = false;
  }
}
const tone = { OPEN: 'amber', RESOLVED: 'green', DISMISSED: 'gray' } as const;
</script>

<template>
  <div>
    <AdminPageHeader title="Reports" :subtitle="data ? `${data.openCount} open report${data.openCount === 1 ? '' : 's'} awaiting review.` : undefined" />
    <UiTabs v-model="status" :tabs="[{ value: 'OPEN', label: 'Open', count: data?.openCount }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'DISMISSED', label: 'Dismissed' }, { value: '', label: 'All' }]" variant="pills" size="sm" />
    <div class="mt-4 space-y-3">
      <div v-if="loadStatus === 'pending'" class="space-y-3"><UiSkeleton v-for="i in 5" :key="i" variant="rect" class="h-28" /></div>
      <UiErrorState v-else-if="loadStatus === 'error'" :message="error?.message" compact @retry="refresh()" />
      <UiEmptyState v-else-if="!data?.items.length" title="No reports" description="Nothing to review right now." compact />
      <UiCard v-for="r in data?.items ?? []" v-else :key="r.id">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <UiBadge :tone="tone[r.status]" size="xs">{{ r.status.toLowerCase() }}</UiBadge>
          <UiBadge tone="red" size="xs">{{ r.reason.replace('_', ' ') }}</UiBadge>
          <span class="text-ink-muted">{{ r.targetType.toLowerCase() }} reported by</span>
          <span class="font-medium text-ink">{{ r.reporter.displayName }}</span>
          <span class="text-xs text-ink-muted">· {{ formatDateTime(r.createdAt) }}</span>
        </div>
        <p v-if="r.details" class="mt-2 text-sm text-ink">“{{ r.details }}”</p>
        <div v-if="r.comment" class="mt-3 rounded-md border border-line bg-surface-muted p-3 text-sm">
          <p class="text-xs text-ink-muted">Comment by <span class="font-medium text-ink">{{ r.comment.author.displayName }}</span> <UiBadge v-if="r.comment.isHidden" tone="amber" size="xs">hidden</UiBadge><UiBadge v-if="r.comment.isDeleted" tone="gray" size="xs">deleted</UiBadge></p>
          <p class="mt-1 whitespace-pre-line text-ink">{{ r.comment.isDeleted ? '[deleted]' : r.comment.content }}</p>
        </div>
        <p v-else-if="r.article" class="mt-2 text-sm">Article: <NuxtLink :to="`/articles/${r.article.slug}`" class="font-medium text-brand-600 hover:underline">{{ r.article.title }}</NuxtLink></p>
        <p v-else-if="r.problem" class="mt-2 text-sm">Problem: <NuxtLink :to="`/problems/${r.problem.slug}`" class="font-medium text-brand-600 hover:underline">{{ r.problem.title }}</NuxtLink></p>
        <p v-else-if="r.reportedUser" class="mt-2 text-sm">User: <NuxtLink :to="`/u/${r.reportedUser.username}`" class="font-medium text-brand-600 hover:underline">@{{ r.reportedUser.username }}</NuxtLink></p>
        <p v-if="r.status !== 'OPEN'" class="mt-2 text-xs text-ink-muted">{{ r.status === 'RESOLVED' ? 'Resolved' : 'Dismissed' }} by {{ r.resolvedBy?.displayName ?? 'system' }} · {{ formatDateTime(r.resolvedAt) }}<span v-if="r.resolutionNote"> · “{{ r.resolutionNote }}”</span></p>
        <div v-if="r.status === 'OPEN'" class="mt-3 flex gap-2">
          <UiButton size="sm" @click="openModal(r, 'resolve')">Resolve</UiButton>
          <UiButton size="sm" variant="secondary" @click="openModal(r, 'dismiss')">Dismiss</UiButton>
        </div>
      </UiCard>
    </div>
    <UiPagination v-if="data" v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-4" />

    <UiModal :model-value="!!acting" :title="action === 'resolve' ? 'Resolve report' : 'Dismiss report'" size="sm" @update:model-value="acting = null">
      <div class="space-y-3">
        <label v-if="action === 'resolve' && acting?.comment" class="flex items-center gap-2 text-sm text-ink"><input v-model="hideComment" type="checkbox" class="h-4 w-4 rounded border-line-strong text-brand-600" /> Hide the reported comment</label>
        <UiTextarea v-model="note" label="Note (optional)" :rows="3" :maxlength="500" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="acting = null">Cancel</UiButton>
        <UiButton :variant="action === 'resolve' ? 'primary' : 'secondary'" :loading="busy" @click="submit">{{ action === 'resolve' ? 'Resolve' : 'Dismiss' }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
