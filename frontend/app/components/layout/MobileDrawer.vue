<script setup lang="ts">
import { ChevronDown, X, LayoutDashboard, Bookmark, ListChecks, Settings, Shield, LogOut, User } from 'lucide-vue-next';
import { useScrollLock } from '@vueuse/core';

const ui = useUiStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { tree } = useNavigation();

const expanded = ref<string | null>(null);
const locked = useScrollLock(import.meta.client ? document.body : null);

watch(
  () => ui.mobileMenuOpen,
  (open) => (locked.value = open),
);
watch(() => route.fullPath, () => ui.closeMobileMenu());

const mainLinks = [
  { label: 'Practice', to: '/practice' },
  { label: 'Problems', to: '/problems' },
  { label: 'Courses', to: '/courses' },
  { label: 'Quizzes', to: '/quizzes' },
  { label: 'Articles', to: '/articles' },
  { label: 'Tutorials', to: '/tutorials' },
];

async function signOut() {
  await auth.logout();
  ui.closeMobileMenu();
  router.push('/');
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="ui.mobileMenuOpen" class="fixed inset-0 z-50 bg-black/50 lg:hidden" @click.self="ui.closeMobileMenu()">
        <Transition appear enter-active-class="transition duration-200 ease-out" enter-from-class="-translate-x-full" enter-to-class="translate-x-0">
          <aside class="flex h-full w-[86%] max-w-sm flex-col bg-surface shadow-2xl" role="dialog" aria-modal="true" aria-label="Menu">
            <div class="flex h-16 items-center justify-between border-b border-line px-4">
              <AppLogo />
              <div class="flex items-center gap-1">
                <ThemeToggle />
                <button type="button" class="rounded-md p-2 text-ink hover:bg-surface-strong" aria-label="Close menu" @click="ui.closeMobileMenu()">
                  <X class="h-5 w-5" />
                </button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto">
              <div v-if="auth.isAuthenticated" class="flex items-center gap-3 border-b border-line px-4 py-4">
                <UiAvatar :name="auth.displayName" :src="auth.user?.profile.avatarUrl" />
                <div class="min-w-0">
                  <p class="truncate font-semibold text-ink">{{ auth.displayName }}</p>
                  <p class="truncate text-xs text-ink-muted">@{{ auth.user?.username }}</p>
                </div>
              </div>
              <div v-else class="flex gap-2 border-b border-line px-4 py-4">
                <UiButton to="/login" block>Sign In</UiButton>
                <UiButton to="/register" variant="secondary" block>Register</UiButton>
              </div>

              <nav class="px-2 py-2" aria-label="Main">
                <NuxtLink v-for="l in mainLinks" :key="l.to" :to="l.to" class="block rounded-md px-3 py-2.5 font-heading text-[15px] font-semibold text-ink-heading hover:bg-surface-strong" active-class="bg-brand-50 text-brand-700">
                  {{ l.label }}
                </NuxtLink>
              </nav>

              <div class="border-t border-line px-2 py-2">
                <p class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Topics</p>
                <div v-for="cat in tree" :key="cat.id">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-ink hover:bg-surface-strong"
                    :aria-expanded="expanded === cat.id"
                    @click="expanded = expanded === cat.id ? null : cat.id"
                  >
                    {{ cat.name }}
                    <ChevronDown class="h-4 w-4 text-ink-muted transition-transform" :class="expanded === cat.id ? 'rotate-180' : ''" />
                  </button>
                  <div v-if="expanded === cat.id" class="mb-1 ml-3 border-l border-line pl-3">
                    <NuxtLink :to="`/categories/${cat.slug}`" class="block rounded-md px-3 py-2 text-sm font-medium text-brand-600 hover:bg-surface-strong">All {{ cat.name }}</NuxtLink>
                    <NuxtLink v-for="child in cat.children ?? []" :key="child.id" :to="`/categories/${child.slug}`" class="block rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-surface-strong hover:text-ink">
                      {{ child.name }}
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <div v-if="auth.isAuthenticated" class="border-t border-line px-2 py-2">
                <p class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Account</p>
                <NuxtLink to="/dashboard" class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] text-ink hover:bg-surface-strong"><LayoutDashboard class="h-4 w-4 text-ink-muted" /> Dashboard</NuxtLink>
                <NuxtLink to="/profile" class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] text-ink hover:bg-surface-strong"><User class="h-4 w-4 text-ink-muted" /> Profile</NuxtLink>
                <NuxtLink to="/bookmarks" class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] text-ink hover:bg-surface-strong"><Bookmark class="h-4 w-4 text-ink-muted" /> Bookmarks</NuxtLink>
                <NuxtLink to="/submissions" class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] text-ink hover:bg-surface-strong"><ListChecks class="h-4 w-4 text-ink-muted" /> Submissions</NuxtLink>
                <NuxtLink to="/settings" class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] text-ink hover:bg-surface-strong"><Settings class="h-4 w-4 text-ink-muted" /> Settings</NuxtLink>
                <NuxtLink v-if="auth.isEditor" to="/admin" class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] text-ink hover:bg-surface-strong"><Shield class="h-4 w-4 text-ink-muted" /> Admin panel</NuxtLink>
                <button type="button" class="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[15px] text-red-600 hover:bg-red-50" @click="signOut"><LogOut class="h-4 w-4" /> Sign out</button>
              </div>
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
