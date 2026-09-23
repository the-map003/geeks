import type { ContentStatus, Paginated } from '~/types/api';

export type AdminResource = 'articles' | 'tutorials' | 'courses' | 'problems' | 'quizzes';

export interface AdminContentRow {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  updatedAt: string;
  createdAt: string;
  publishedAt: string | null;
  [key: string]: unknown;
}

/** Shared list/status/delete actions for admin content resources. */
export function useAdminContent(resource: AdminResource) {
  const api = useApi();
  const ui = useUiStore();
  const auth = useAuthStore();

  const status = useQueryParam('status');
  const q = useQueryParam('q');
  const page = useQueryPage();
  const query = computed(() => ({ status: status.value || undefined, q: q.value || undefined, page: page.value, pageSize: 20 }));

  const { data, status: loadStatus, error, refresh } = useAsyncData(
    () => `admin:${resource}:${JSON.stringify(query.value)}`,
    () => api.get<Paginated<AdminContentRow> & { counts: Record<ContentStatus, number> }>(`/admin/${resource}`, query.value),
    { watch: [query] },
  );

  const busy = ref<string | null>(null);

  async function setStatus(row: AdminContentRow, action: 'publish' | 'unpublish' | 'archive') {
    busy.value = row.id;
    try {
      await api.post(`/admin/${resource}/${row.id}/${action}`);
      ui.success(`${row.title} ${action === 'publish' ? 'published' : action === 'unpublish' ? 'moved to drafts' : 'archived'}`);
      await refresh();
    } catch (err) {
      ui.error(`Could not ${action}`, isApiError(err) ? err.message : undefined);
    } finally {
      busy.value = null;
    }
  }

  async function remove(row: AdminContentRow) {
    busy.value = row.id;
    try {
      await api.del(`/admin/${resource}/${row.id}`);
      ui.success(`Deleted “${row.title}”`);
      await refresh();
    } catch (err) {
      ui.error('Could not delete', isApiError(err) ? err.message : undefined);
    } finally {
      busy.value = null;
    }
  }

  return { data, loadStatus, error, refresh, status, q, page, busy, setStatus, remove, canPublish: computed(() => auth.isAdmin) };
}
