/**
 * Two-way binding between a route query parameter and a computed string.
 * Changing any filter resets `page` (unless the param itself is `page`).
 */
export function useQueryParam(name: string, defaultValue = '') {
  const route = useRoute();
  const router = useRouter();
  return computed<string>({
    get: () => {
      const v = route.query[name];
      return typeof v === 'string' && v !== '' ? v : defaultValue;
    },
    set: (value) => {
      const query: Record<string, string> = {};
      for (const [k, v] of Object.entries(route.query as Record<string, string>)) {
        if (k === name || (name !== 'page' && k === 'page')) continue;
        query[k] = v;
      }
      if (value && value !== defaultValue) query[name] = value;
      router.replace({ query });
    },
  });
}

export function useQueryPage() {
  const route = useRoute();
  const router = useRouter();
  return computed<number>({
    get: () => {
      const v = Number(route.query.page);
      return Number.isInteger(v) && v > 0 ? v : 1;
    },
    set: (page) => {
      const query: Record<string, string> = {};
      for (const [k, v] of Object.entries(route.query as Record<string, string>)) if (k !== 'page') query[k] = v;
      if (page > 1) query.page = String(page);
      router.push({ query });
      if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });
}
