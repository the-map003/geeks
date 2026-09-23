/**
 * Restores the session in the browser on first load. The refresh token lives in an
 * HttpOnly cookie; a readable hint cookie tells us whether a refresh is worth attempting.
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  const hasSessionHint = document.cookie.split(';').some((c) => c.trim().startsWith('gfg_session='));
  if (hasSessionHint) {
    await auth.refresh();
  }
  auth.ready = true;
});
