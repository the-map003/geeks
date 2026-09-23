import type { AuthorSummary } from '~/types/api';

interface AdminMeta {
  categories: Array<{ id: string; name: string; slug: string; parentId: string | null }>;
  staff: AuthorSummary[];
}

/** Categories and staff list used by the admin editors' select inputs. */
export function useAdminMeta() {
  const api = useApi();
  const { data, status } = useAsyncData('admin-meta', () => api.get<AdminMeta>('/admin/meta'), { dedupe: 'defer' });
  const categoryOptions = computed(() => {
    const cats = data.value?.categories ?? [];
    const parents = cats.filter((c) => !c.parentId);
    const opts: Array<{ value: string; label: string }> = [{ value: '', label: 'No category' }];
    for (const p of parents) {
      opts.push({ value: p.id, label: p.name });
      for (const c of cats.filter((x) => x.parentId === p.id)) opts.push({ value: c.id, label: `  ${c.name}` });
    }
    return opts;
  });
  const staffOptions = computed(() => (data.value?.staff ?? []).map((s) => ({ value: s.id, label: `${s.displayName} (@${s.username})` })));
  return { meta: data, status, categoryOptions, staffOptions };
}

/** Collects Zod field errors from an ApiRequestError into a reactive map. */
export function useFormErrors() {
  const errors = reactive<Record<string, string | undefined>>({});
  function clear() {
    for (const k of Object.keys(errors)) errors[k] = undefined;
  }
  function apply(err: unknown) {
    clear();
    if (isApiError(err)) for (const e of err.errors) errors[e.path] = e.message;
  }
  return { errors, clear, apply };
}
