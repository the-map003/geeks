import { defineStore } from 'pinia';
import { FetchError } from 'ofetch';
import type { ApiSuccess, AuthUser, Role } from '~/types/api';

const ROLE_RANK: Record<Role, number> = { USER: 0, EDITOR: 1, ADMIN: 2, SUPER_ADMIN: 3 };

interface SessionPayload {
  user: AuthUser;
  accessToken: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    accessToken: null as string | null,
    /** True once the initial silent refresh has been attempted in the browser. */
    ready: false,
    refreshing: null as Promise<boolean> | null,
  }),

  getters: {
    isAuthenticated: (s) => !!s.user && !!s.accessToken,
    role: (s): Role | null => s.user?.role ?? null,
    hasRole:
      (s) =>
      (minimum: Role): boolean =>
        !!s.user && ROLE_RANK[s.user.role] >= ROLE_RANK[minimum],
    isEditor(): boolean {
      return this.hasRole('EDITOR');
    },
    isAdmin(): boolean {
      return this.hasRole('ADMIN');
    },
    isSuperAdmin(): boolean {
      return this.hasRole('SUPER_ADMIN');
    },
    displayName: (s) => s.user?.profile.displayName ?? s.user?.username ?? '',
  },

  actions: {
    setSession(payload: SessionPayload) {
      this.user = payload.user;
      this.accessToken = payload.accessToken;
    },

    clearSession() {
      this.user = null;
      this.accessToken = null;
    },

    async login(emailOrUsername: string, password: string) {
      const api = useApi();
      const data = await api.post<SessionPayload>('/auth/login', { emailOrUsername, password }, { auth: false });
      this.setSession(data);
      return data.user;
    },

    async register(input: { email: string; username: string; password: string; displayName?: string }) {
      const api = useApi();
      const data = await api.post<SessionPayload>('/auth/register', input, { auth: false });
      this.setSession(data);
      return data.user;
    },

    async logout() {
      const api = useApi();
      try {
        await api.post('/auth/logout', undefined, { auth: false });
      } finally {
        this.clearSession();
      }
    },

    /**
     * Exchanges the HttpOnly refresh cookie for a new access token.
     * De-duplicates concurrent calls. Returns false when no valid session exists.
     */
    async refresh(): Promise<boolean> {
      if (this.refreshing) return this.refreshing;
      const config = useRuntimeConfig();
      this.refreshing = (async () => {
        try {
          const res = await $fetch<ApiSuccess<SessionPayload>>('/auth/refresh', {
            baseURL: config.public.apiBase,
            method: 'POST',
            credentials: 'include',
          });
          this.setSession(res.data);
          return true;
        } catch (err) {
          if (err instanceof FetchError && err.status && err.status >= 500) {
            // Keep the current session on transient server errors.
            return !!this.accessToken;
          }
          this.clearSession();
          return false;
        } finally {
          this.refreshing = null;
        }
      })();
      return this.refreshing;
    },

    async fetchMe() {
      const api = useApi();
      const data = await api.get<{ user: AuthUser }>('/auth/me');
      this.user = data.user;
      return data.user;
    },

    updateUser(user: AuthUser) {
      this.user = user;
    },
  },
});
