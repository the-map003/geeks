import { defineStore } from 'pinia';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

let nextId = 1;

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [] as Toast[],
    mobileMenuOpen: false,
    authModalOpen: false,
  }),

  actions: {
    notify(type: ToastType, title: string, message?: string, timeoutMs = 4000) {
      const id = nextId++;
      this.toasts.push({ id, type, title, message });
      if (timeoutMs > 0 && import.meta.client) {
        setTimeout(() => this.dismiss(id), timeoutMs);
      }
      return id;
    },
    success(title: string, message?: string) {
      return this.notify('success', title, message);
    },
    error(title: string, message?: string) {
      return this.notify('error', title, message, 6000);
    },
    info(title: string, message?: string) {
      return this.notify('info', title, message);
    },
    dismiss(id: number) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    },
    openMobileMenu() {
      this.mobileMenuOpen = true;
    },
    closeMobileMenu() {
      this.mobileMenuOpen = false;
    },
  },
});
