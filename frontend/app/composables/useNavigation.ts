import type { Category } from '~/types/api';

/** Category tree shared by the header mega menu, topic bar, mobile drawer and footer. */
export function useNavigation() {
  const api = useApi();
  const { data, status, error, refresh } = useAsyncData(
    'nav-categories',
    () => api.get<{ categories: Category[] }>('/categories', { tree: 'true' }, { auth: false }),
    { default: () => ({ categories: [] as Category[] }), dedupe: 'defer' },
  );

  const tree = computed(() => data.value?.categories ?? []);
  const navChips = computed(() => tree.value.filter((c) => c.showInNav));
  const featured = computed(() => tree.value.filter((c) => c.isFeatured));

  return { tree, navChips, featured, status, error, refresh };
}
