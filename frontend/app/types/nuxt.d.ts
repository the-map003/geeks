import type { Role } from './api';

declare module '#app' {
  interface PageMeta {
    requiredRole?: Role;
    /** Hide the global footer (used by the focused practice layout). */
    hideFooter?: boolean;
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    requiredRole?: Role;
    hideFooter?: boolean;
  }
}

export {};
