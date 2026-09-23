<script setup lang="ts">
import type { AuthorSummary, Paginated } from '~/types/api';
import { formatDateTime } from '~/utils/format';

definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'SUPER_ADMIN' });
useSeoMeta({ title: 'Settings · Admin', robots: 'noindex' });

interface Setting { key: string; value: unknown; description: string | null; updatedAt: string; updatedBy: AuthorSummary | null }
interface AuditRow { id: string; action: string; entityType: string; entityId: string | null; metadata: unknown; ip: string | null; createdAt: string; actor: AuthorSummary | null }

const api = useApi();
const ui = useUiStore();
const { data, status, error, refresh } = await useAsyncData('admin-settings', () => api.get<{ settings: Setting[] }>('/admin/settings'));

const drafts = ref<Record<string, string>>({});
watch(data, (d) => { if (d) drafts.value = Object.fromEntries(d.settings.map((s) => [s.key, JSON.stringify(s.value)])); }, { immediate: true });
const newKey = ref('');
const newValue = ref('');
const newDesc = ref('');
const saving = ref(false);

function parse(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
async function save() {
  saving.value = true;
  try {
    const settings = Object.entries(drafts.value).map(([key, value]) => ({ key, value: parse(value) }));
    if (newKey.value.trim()) settings.push({ key: newKey.value.trim(), value: parse(newValue.value), ...(newDesc.value ? { description: newDesc.value } : {}) } as never);
    await api.put('/admin/settings', { settings });
    ui.success('Settings saved');
    newKey.value = newValue.value = newDesc.value = '';
    await refresh();
  } catch (err) {
    ui.error('Could not save settings', isApiError(err) ? err.message : undefined);
  } finally {
    saving.value = false;
  }
}

const auditPage = ref(1);
const { data: audit, status: auditStatus } = useAsyncData(() => `audit:${auditPage.value}`, () => api.get<Paginated<AuditRow>>('/admin/audit-logs', { page: auditPage.value, pageSize: 25 }), { watch: [auditPage], lazy: true });
</script>

<template>
  <div>
    <AdminPageHeader title="System settings" subtitle="Feature flags and site-wide values. Values are stored as JSON (true/false, numbers, strings)." />
    <UiCard>
      <div v-if="status === 'pending'"><UiSkeleton :lines="5" /></div>
      <UiErrorState v-else-if="status === 'error'" :message="error?.message" compact @retry="refresh()" />
      <form v-else class="space-y-4" @submit.prevent="save">
        <div v-for="s in data?.settings ?? []" :key="s.key" class="grid gap-2 border-b border-line pb-4 sm:grid-cols-[240px_1fr]">
          <div><p class="font-mono text-sm font-semibold text-ink">{{ s.key }}</p><p class="text-xs text-ink-muted">{{ s.description }}</p><p class="text-[11px] text-ink-muted">Updated {{ formatDateTime(s.updatedAt) }}<span v-if="s.updatedBy"> by {{ s.updatedBy.displayName }}</span></p></div>
          <UiInput v-model="drafts[s.key]" :label="undefined" />
        </div>
        <div class="grid gap-2 sm:grid-cols-3">
          <UiInput v-model="newKey" label="New setting key" placeholder="features.something" />
          <UiInput v-model="newValue" label="Value (JSON)" placeholder="true" />
          <UiInput v-model="newDesc" label="Description" />
        </div>
        <div class="flex justify-end"><UiButton type="submit" :loading="saving">Save settings</UiButton></div>
      </form>
    </UiCard>

    <h2 id="audit" class="mt-10 text-lg font-bold text-ink">Audit log</h2>
    <div class="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
      <div v-if="auditStatus === 'pending'"><UiSkeleton v-for="i in 8" :key="i" variant="row" /></div>
      <div v-else-if="audit?.items.length" class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-muted"><tr><th class="px-4 py-2">When</th><th class="px-4 py-2">Actor</th><th class="px-4 py-2">Action</th><th class="px-4 py-2">Entity</th><th class="px-4 py-2">Metadata</th></tr></thead>
          <tbody class="divide-y divide-line">
            <tr v-for="a in audit.items" :key="a.id">
              <td class="whitespace-nowrap px-4 py-2 text-ink-muted">{{ formatDateTime(a.createdAt) }}</td>
              <td class="px-4 py-2">{{ a.actor?.displayName ?? 'System' }}</td>
              <td class="px-4 py-2"><code class="rounded bg-surface-muted px-1 text-xs">{{ a.action }}</code></td>
              <td class="px-4 py-2 text-ink-muted">{{ a.entityType }}<span v-if="a.entityId" class="text-xs"> · {{ a.entityId }}</span></td>
              <td class="max-w-xs truncate px-4 py-2 font-mono text-xs text-ink-muted">{{ a.metadata ? JSON.stringify(a.metadata) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <UiEmptyState v-else title="No audit entries" compact />
    </div>
    <UiPagination v-if="audit" v-model:page="auditPage" :total-pages="audit.totalPages" :total="audit.total" :page-size="audit.pageSize" class="mt-4" />
  </div>
</template>
