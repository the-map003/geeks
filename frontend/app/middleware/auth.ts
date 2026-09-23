import type { Role } from '~/types/api';

/**
 * Protects routes. Usage in a page:
 *   definePageMeta({ middleware: 'auth' })
 *   definePageMeta({ middleware: 'auth', requiredRole: 'EDITOR' })
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Protected pages render client-side only (see nuxt.config routeRules).
  if (import.meta.server) return;

  const auth = useAuthStore();
  if (!auth.ready) {
    await auth.refresh();
    auth.ready = true;
  }

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }

  const required = to.meta.requiredRole as Role | undefined;
  if (required && !auth.hasRole(required)) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to view this page.' });
  }
});
