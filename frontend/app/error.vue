<script setup lang="ts">
import type { NuxtError } from '#app';
import { Compass, Lock, ServerCrash } from 'lucide-vue-next';

const props = defineProps<{ error: NuxtError }>();

const status = computed(() => props.error.statusCode ?? 500);
const title = computed(() => {
  if (status.value === 404) return 'Page not found';
  if (status.value === 403) return 'Access denied';
  if (status.value === 401) return 'Sign in required';
  return 'Something went wrong';
});
const description = computed(() => {
  if (status.value === 404) return 'The page you are looking for does not exist or may have been moved.';
  if (status.value === 403) return props.error.statusMessage || 'You do not have permission to view this page.';
  if (status.value === 401) return 'Please sign in to continue.';
  return 'An unexpected error occurred. Please try again in a moment.';
});
const icon = computed(() => (status.value === 404 ? Compass : status.value === 403 || status.value === 401 ? Lock : ServerCrash));

useSeoMeta({ title: title.value, robots: 'noindex' });

function goHome() {
  clearError({ redirect: '/' });
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppHeader />
    <main class="flex flex-1 items-center justify-center px-4 py-20">
      <div class="max-w-md text-center">
        <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <component :is="icon" class="h-10 w-10" aria-hidden="true" />
        </div>
        <p class="text-sm font-semibold uppercase tracking-widest text-brand-600">Error {{ status }}</p>
        <h1 class="mt-2 text-3xl font-bold text-ink">{{ title }}</h1>
        <p class="mt-3 text-ink-muted">{{ description }}</p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <UiButton @click="goHome">Go to homepage</UiButton>
          <UiButton v-if="status === 401 || status === 403" variant="secondary" @click="clearError({ redirect: '/login' })">Sign in</UiButton>
          <UiButton v-else variant="secondary" to="/search">Search the site</UiButton>
        </div>
      </div>
    </main>
    <AppFooter />
    <ClientOnly>
      <MobileDrawer />
      <UiToastContainer />
    </ClientOnly>
  </div>
</template>
