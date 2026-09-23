<script setup lang="ts">
import { BarChart3, BookOpen, Code2, ExternalLink, FileText, Flag, GraduationCap, HelpCircle, LayoutDashboard, Menu, MessageSquare, Settings, Users, X } from 'lucide-vue-next';

const auth = useAuthStore();
const route = useRoute();
const open = ref(false);
watch(() => route.fullPath, () => (open.value = false));

const nav = computed(() => [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Articles', to: '/admin/articles', icon: FileText },
  { label: 'Tutorials', to: '/admin/tutorials', icon: BookOpen },
  { label: 'Courses', to: '/admin/courses', icon: GraduationCap },
  { label: 'Problems', to: '/admin/problems', icon: Code2 },
  { label: 'Quizzes', to: '/admin/quizzes', icon: HelpCircle },
  { label: 'Comments', to: '/admin/comments', icon: MessageSquare },
  { label: 'Reports', to: '/admin/reports', icon: Flag },
  ...(auth.isAdmin ? [{ label: 'Users', to: '/admin/users', icon: Users }, { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 }] : []),
  ...(auth.isSuperAdmin ? [{ label: 'Settings', to: '/admin/settings', icon: Settings }] : []),
]);

function isActive(item: { to: string; exact?: boolean }) {
  return item.exact ? route.path === item.to : route.path === item.to || route.path.startsWith(`${item.to}/`);
}
</script>

<template>
  <div class="flex min-h-screen bg-surface-muted">
    <!-- Sidebar -->
    <aside class="fixed inset-y-0 left-0 z-40 w-64 -translate-x-full transform border-r border-line bg-surface transition-transform lg:static lg:translate-x-0" :class="open ? 'translate-x-0' : ''">
      <div class="flex h-16 items-center justify-between border-b border-line px-4">
        <AppLogo />
        <button type="button" class="rounded-md p-2 text-ink hover:bg-surface-strong lg:hidden" aria-label="Close menu" @click="open = false"><X class="h-5 w-5" /></button>
      </div>
      <p class="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Admin panel</p>
      <nav class="space-y-0.5 px-2" aria-label="Admin">
        <NuxtLink v-for="item in nav" :key="item.to" :to="item.to" class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition" :class="isActive(item) ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-surface-strong'">
          <component :is="item.icon" class="h-4 w-4" :class="isActive(item) ? 'text-brand-600' : 'text-ink-muted'" /> {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="absolute inset-x-0 bottom-0 border-t border-line p-4">
        <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"><ExternalLink class="h-4 w-4" /> View site</NuxtLink>
      </div>
    </aside>
    <div v-if="open" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="open = false" />

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface px-4">
        <button type="button" class="rounded-md p-2 text-ink hover:bg-surface-strong lg:hidden" aria-label="Open menu" @click="open = true"><Menu class="h-5 w-5" /></button>
        <p class="text-sm text-ink-muted">Signed in as <span class="font-medium text-ink">{{ auth.displayName }}</span> · <UiBadge tone="brand" size="xs">{{ auth.role?.replace('_', ' ') }}</UiBadge></p>
        <div class="flex-1" />
        <ClientOnly><UserMenu /></ClientOnly>
      </header>
      <main class="flex-1 p-4 sm:p-6 lg:p-8"><slot /></main>
    </div>
    <ClientOnly><UiToastContainer /></ClientOnly>
  </div>
</template>
