<script setup lang="ts">
import { Menu, Search, X } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';

const auth = useAuthStore();
const ui = useUiStore();
const route = useRoute();
const { tree } = useNavigation();

const searchOpen = ref(false);
const searchWrap = ref<HTMLElement | null>(null);
onClickOutside(searchWrap, () => (searchOpen.value = false));
watch(() => route.fullPath, () => (searchOpen.value = false));

const interviewPrep = computed(() => {
  const flat = tree.value.flatMap((c) => [c, ...(c.children ?? [])]);
  const find = (slug: string) => flat.find((c) => c.slug === slug);
  return [
    { label: 'Practice Problems', to: '/problems' },
    { label: 'Problem of the Day', to: '/practice' },
    { label: 'Quizzes', to: '/quizzes' },
    ...(find('interview-prep') ? [{ label: 'Interview Preparation', to: '/categories/interview-prep' }] : []),
    ...(find('aptitude') ? [{ label: 'Aptitude', to: '/categories/aptitude' }] : []),
    ...(find('puzzles') ? [{ label: 'Puzzles', to: '/categories/puzzles' }] : []),
    ...(find('company-prep') ? [{ label: 'Company Preparation', to: '/categories/company-prep' }] : []),
    ...(find('system-design') ? [{ label: 'System Design', to: '/categories/system-design' }] : []),
  ];
});

const courseLinks = computed(() => [
  { label: 'All Courses', to: '/courses' },
  ...tree.value.slice(0, 6).map((c) => ({ label: c.name, to: `/courses?category=${c.slug}` })),
]);

const loginHref = computed(() => (route.path !== '/' && !route.path.startsWith('/login') ? `/login?redirect=${encodeURIComponent(route.fullPath)}` : '/login'));
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-surface">
    <div class="mx-auto flex h-[50px] max-w-[1366px] items-center gap-2 px-3 sm:px-6">
      <button type="button" class="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-heading hover:bg-surface-strong lg:hidden" aria-label="Open menu" @click="ui.openMobileMenu()">
        <Menu class="h-6 w-6" />
      </button>

      <!-- Reference: 304px left block holding the 48×24 mark and a 32px round search toggle -->
      <div class="flex flex-1 items-center gap-3 lg:w-[304px] lg:flex-none">
        <div class="mx-auto lg:mx-0"><AppLogo size="sm" /></div>
        <div ref="searchWrap" class="hidden items-center lg:flex">
          <button v-if="!searchOpen" type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-ink-heading hover:bg-surface-strong" aria-label="Open search" @click="searchOpen = true">
            <Search class="h-4 w-4" />
          </button>
          <div v-else class="w-64"><SearchBox autofocus @submitted="searchOpen = false" /></div>
        </div>
      </div>

      <nav class="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Primary">
        <NavDropdown label="Courses" width="w-64">
          <NuxtLink v-for="l in courseLinks" :key="l.to" :to="l.to" class="block rounded-md px-3 py-2 text-[15px] text-ink hover:bg-surface-strong">{{ l.label }}</NuxtLink>
        </NavDropdown>
        <TutorialsMegaMenu :tree="tree" />
        <NavDropdown label="Interview Prep" width="w-64">
          <NuxtLink v-for="l in interviewPrep" :key="l.to" :to="l.to" class="block rounded-md px-3 py-2 text-[15px] text-ink hover:bg-surface-strong">{{ l.label }}</NuxtLink>
        </NavDropdown>
      </nav>

      <div class="flex items-center gap-2 lg:flex-none">
        <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-heading hover:bg-surface-strong lg:hidden" :aria-label="searchOpen ? 'Close search' : 'Open search'" @click="searchOpen = !searchOpen">
          <X v-if="searchOpen" class="h-5 w-5" />
          <Search v-else class="h-5 w-5" />
        </button>
        <!-- Reference: dark-mode switch sits between the nav and the Sign In button -->
        <ThemeToggle class="hidden sm:inline-flex" />
        <ClientOnly>
          <UserMenu v-if="auth.isAuthenticated" />
          <NuxtLink v-else :to="loginHref" class="hidden h-9 items-center rounded-lg bg-navy px-4 text-[15px] font-semibold text-white transition hover:bg-navy-dark sm:inline-flex">Sign In</NuxtLink>
          <template #fallback><div class="hidden h-9 w-20 animate-pulse rounded-lg bg-surface-strong sm:block" aria-hidden="true" /></template>
        </ClientOnly>
      </div>
    </div>

    <div v-if="searchOpen" class="border-t border-line px-4 py-3 lg:hidden">
      <SearchBox autofocus @submitted="searchOpen = false" />
    </div>

    <AppTopicBar :tree="tree" />
  </header>
</template>
