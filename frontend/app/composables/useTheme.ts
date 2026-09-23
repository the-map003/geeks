export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gfg-theme';

/**
 * Light / dark theme, like the reference's header toggle. The choice is stored in localStorage and
 * applied as a `dark` class on <html>; an inline script in nuxt.config applies it before first paint
 * so there is no flash. Without a stored choice the OS preference is used.
 */
export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light');
  const isDark = computed(() => theme.value === 'dark');

  function apply(t: Theme) {
    if (!import.meta.client) return;
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.style.colorScheme = t;
  }

  function set(t: Theme) {
    theme.value = t;
    apply(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable */
    }
  }

  function toggle() {
    set(theme.value === 'dark' ? 'light' : 'dark');
  }

  /** Reads the stored or OS preference. Called once from the client plugin. */
  function init() {
    if (!import.meta.client) return;
    let t: Theme = 'light';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') t = stored;
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) t = 'dark';
    } catch {
      /* ignore */
    }
    theme.value = t;
    apply(t);
  }

  return { theme, isDark, set, toggle, init };
}
