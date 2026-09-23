<script setup lang="ts">
import { Archive, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Trash2, Upload } from 'lucide-vue-next';
import type { AdminResource, AdminContentRow } from '~/composables/useAdminContent';
import { formatDate } from '~/utils/format';

const props = defineProps<{ resource: AdminResource; title: string; subtitle?: string; publicPath: string; columns?: Array<{ key: string; label: string }> }>();

const { data, loadStatus, error, refresh, status, q, page, busy, setStatus, remove, canPublish } = useAdminContent(props.resource);
const searchDraft = ref(q.value);
watch(q, (v) => (searchDraft.value = v));
const confirmDelete = ref<AdminContentRow | null>(null);

const tabs = computed(() => {
  const c = data.value?.counts;
  const total = c ? Object.values(c).reduce((s, n) => s + n, 0) : undefined;
  return [
    { value: '', label: 'All', count: total },
    { value: 'DRAFT', label: 'Drafts', count: c?.DRAFT },
    { value: 'PUBLISHED', label: 'Published', count: c?.PUBLISHED },
    { value: 'ARCHIVED', label: 'Archived', count: c?.ARCHIVED },
  ];
});
const tone = { DRAFT: 'amber', PUBLISHED: 'green', ARCHIVED: 'gray' } as const;

function publicUrl(row: AdminContentRow) {
  return `${props.publicPath}/${row.slug}`;
}
</script>

<template>
  <div>
    <AdminPageHeader :title="title" :subtitle="subtitle">
      <UiButton :to="`/admin/${resource}/new`"><Plus class="h-4 w-4" /> New</UiButton>
    </AdminPageHeader>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <UiTabs v-model="status" :tabs="tabs" variant="pills" size="sm" />
      <form class="flex gap-2" @submit.prevent="q = searchDraft">
        <UiInput v-model="searchDraft" placeholder="Search title…" class="w-56" />
        <UiButton type="submit" variant="secondary">Search</UiButton>
      </form>
    </div>

    <div class="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
      <div v-if="loadStatus === 'pending'"><UiSkeleton v-for="i in 8" :key="i" variant="row" /></div>
      <UiErrorState v-else-if="loadStatus === 'error'" :message="error?.message" compact @retry="refresh()" />
      <UiEmptyState v-else-if="!data?.items.length" title="Nothing here" description="Create your first item to get started." compact>
        <UiButton :to="`/admin/${resource}/new`" size="sm"><Plus class="h-4 w-4" /> New</UiButton>
      </UiEmptyState>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th class="px-4 py-2.5">Title</th>
              <th class="px-4 py-2.5">Status</th>
              <th v-for="col in columns" :key="col.key" class="px-4 py-2.5">{{ col.label }}</th>
              <th class="px-4 py-2.5">Updated</th>
              <th class="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="row in data.items" :key="row.id" class="hover:bg-surface-muted">
              <td class="max-w-md px-4 py-2.5">
                <NuxtLink :to="`/admin/${resource}/${row.id}`" class="block truncate font-medium text-ink hover:text-brand-700">{{ row.title }}</NuxtLink>
                <span class="block truncate text-xs text-ink-muted">/{{ row.slug }}</span>
              </td>
              <td class="px-4 py-2.5"><UiBadge :tone="tone[row.status]" size="xs">{{ row.status.toLowerCase() }}</UiBadge></td>
              <td v-for="col in columns" :key="col.key" class="px-4 py-2.5 text-ink-muted"><slot :name="`cell-${col.key}`" :row="row">{{ row[col.key] }}</slot></td>
              <td class="whitespace-nowrap px-4 py-2.5 text-ink-muted">{{ formatDate(row.updatedAt) }}</td>
              <td class="px-4 py-2.5">
                <div class="flex items-center justify-end gap-1">
                  <UiButton :to="`/admin/${resource}/${row.id}`" variant="ghost" size="sm" icon aria-label="Edit"><Pencil class="h-4 w-4" /></UiButton>
                  <UiButton :to="publicUrl(row)" variant="ghost" size="sm" icon aria-label="View"><Eye class="h-4 w-4" /></UiButton>
                  <UiDropdown v-if="canPublish" align="right" width="w-48">
                    <template #trigger><UiButton variant="ghost" size="sm" icon aria-label="More actions" :loading="busy === row.id"><MoreHorizontal class="h-4 w-4" /></UiButton></template>
                    <UiMenuItem v-if="row.status !== 'PUBLISHED'" @click="setStatus(row, 'publish')"><Upload class="h-4 w-4 text-ink-muted" /> Publish</UiMenuItem>
                    <UiMenuItem v-if="row.status === 'PUBLISHED'" @click="setStatus(row, 'unpublish')"><EyeOff class="h-4 w-4 text-ink-muted" /> Unpublish</UiMenuItem>
                    <UiMenuItem v-if="row.status !== 'ARCHIVED'" @click="setStatus(row, 'archive')"><Archive class="h-4 w-4 text-ink-muted" /> Archive</UiMenuItem>
                    <UiMenuItem danger @click="confirmDelete = row"><Trash2 class="h-4 w-4" /> Delete</UiMenuItem>
                  </UiDropdown>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <UiPagination v-if="data" v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-4" />

    <UiModal :model-value="!!confirmDelete" title="Delete permanently?" size="sm" @update:model-value="confirmDelete = null">
      <p class="text-sm text-ink-muted">“{{ confirmDelete?.title }}” and all of its related data (comments, bookmarks, progress) will be removed. This cannot be undone.</p>
      <template #footer>
        <UiButton variant="ghost" @click="confirmDelete = null">Cancel</UiButton>
        <UiButton variant="danger" @click="confirmDelete && remove(confirmDelete); confirmDelete = null">Delete</UiButton>
      </template>
    </UiModal>
  </div>
</template>
