/** Redirects signed-in users away from guest-only pages such as /login. */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;
  const auth = useAuthStore();
  if (auth.isAuthenticated) {
    const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/') ? to.query.redirect : '/dashboard';
    return navigateTo(redirect);
  }
});
