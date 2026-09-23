<script setup lang="ts">
import { Code2, FileText, Flag, MessageSquare, Users, GraduationCap, BookOpen, HelpCircle } from 'lucide-vue-next';
import type { AuthorSummary } from '~/types/api';
import { formatDateTime } from '~/utils/format';

definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Admin dashboard', robots: 'noindex' });

interface StatusCounts { DRAFT: number; PUBLISHED: number; ARCHIVED: number; total: number }
interface Stats {
  content: Record<'articles' | 'tutorials' | 'courses' | 'problems' | 'quizzes', StatusCounts>;
  comments: number;
  submissionsToday: number;
  recentAudit: Array<{ id: string; action: string; entityType: string; entityId: string | null; createdAt: string; actor: AuthorSummary | null }>;
  users?: { total: number; newThisWeek: number };
  openReports?: number;
  hiddenComments?: number;
  submissions?: { total: number; accepted: number };
}

const api = useApi();
const auth = useAuthStore();
const { data, status, error, refresh } = await useAsyncData('admin-stats', () => api.get<Stats>('/admin/stats'));
const s = computed(() => data.value);

const contentRows = computed(() =>
  s.value
    ? [
        { key: 'articles', label: 'Articles', icon: FileText, to: '/admin/articles', ...s.value.content.articles },
        { key: 'tutorials', label: 'Tutorials', icon: BookOpen, to: '/admin/tutorials', ...s.value.content.tutorials },
        { key: 'courses', label: 'Courses', icon: GraduationCap, to: '/admin/courses', ...s.value.content.courses },
        { key: 'problems', label: 'Problems', icon: Code2, to: '/admin/problems', ...s.value.content.problems },
        { key: 'quizzes', label: 'Quizzes', icon: HelpCircle, to: '/admin/quizzes', ...s.value.content.quizzes },
      ]
    : [],
);
</script>

<template>
  <div>
    <AdminPageHeader title="Dashboard" :subtitle="`Welcome back, ${auth.displayName}.`" />
    <div v-if="status === 'pending' && !s" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><UiSkeleton v-for="i in 4" :key="i" variant="rect" class="h-24" /></div>
    <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
    <template v-else-if="s">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiStatTile v-if="s.users" label="Users" :value="s.users.total" :hint="`+${s.users.newThisWeek} this week`" :icon="Users" tone="brand" />
        <UiStatTile label="Submissions today" :value="s.submissionsToday" :hint="s.submissions ? `${s.submissions.accepted}/${s.submissions.total} accepted overall` : undefined" :icon="Code2" tone="blue" />
        <UiStatTile label="Comments" :value="s.comments" :hint="s.hiddenComments !== undefined ? `${s.hiddenComments} hidden` : undefined" :icon="MessageSquare" tone="purple" />
        <UiStatTile v-if="s.openReports !== undefined" label="Open reports" :value="s.openReports" hint="Awaiting moderation" :icon="Flag" tone="amber" />
        <UiStatTile v-else label="Published articles" :value="s.content.articles.PUBLISHED" :hint="`${s.content.articles.DRAFT} drafts`" :icon="FileText" tone="amber" />
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <UiCard padding="none">
          <div class="border-b border-line px-5 py-3"><h2 class="font-semibold text-ink">Content overview</h2></div>
          <table class="w-full text-sm">
            <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr><th class="px-5 py-2">Type</th><th class="px-3 py-2 text-right">Draft</th><th class="px-3 py-2 text-right">Published</th><th class="px-3 py-2 text-right">Archived</th><th class="px-5 py-2 text-right">Total</th></tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="r in contentRows" :key="r.key" class="hover:bg-surface-muted">
                <td class="px-5 py-2.5"><NuxtLink :to="r.to" class="inline-flex items-center gap-2 font-medium text-ink hover:text-brand-700"><component :is="r.icon" class="h-4 w-4 text-ink-muted" /> {{ r.label }}</NuxtLink></td>
                <td class="px-3 py-2.5 text-right text-amber-700">{{ r.DRAFT }}</td>
                <td class="px-3 py-2.5 text-right text-green-700">{{ r.PUBLISHED }}</td>
                <td class="px-3 py-2.5 text-right text-ink-muted">{{ r.ARCHIVED }}</td>
                <td class="px-5 py-2.5 text-right font-semibold text-ink">{{ r.total }}</td>
              </tr>
            </tbody>
          </table>
        </UiCard>

        <UiCard padding="none">
          <div class="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 class="font-semibold text-ink">Recent activity</h2>
            <NuxtLink v-if="auth.isSuperAdmin" to="/admin/settings#audit" class="text-xs font-medium text-brand-600 hover:underline">Full audit log</NuxtLink>
          </div>
          <ul v-if="s.recentAudit.length" class="divide-y divide-line">
            <li v-for="a in s.recentAudit" :key="a.id" class="flex items-start gap-3 px-5 py-2.5 text-sm">
              <UiAvatar :name="a.actor?.displayName ?? 'System'" :src="a.actor?.avatarUrl" size="xs" class="mt-0.5" />
              <div class="min-w-0 flex-1">
                <p class="text-ink"><span class="font-medium">{{ a.actor?.displayName ?? 'System' }}</span> <span class="text-ink-muted">·</span> <code class="rounded bg-surface-muted px-1 text-xs">{{ a.action }}</code></p>
                <p class="text-xs text-ink-muted">{{ a.entityType }}<span v-if="a.entityId"> · {{ a.entityId.slice(0, 10) }}…</span> · {{ formatDateTime(a.createdAt) }}</p>
              </div>
            </li>
          </ul>
          <UiEmptyState v-else title="No activity yet" compact />
        </UiCard>
      </div>
    </template>
  </div>
</template>
