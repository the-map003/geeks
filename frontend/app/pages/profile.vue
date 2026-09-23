<script setup lang="ts">
import type { AuthUser, UserStats } from '~/types/api';

definePageMeta({ middleware: 'auth' });
useSeoMeta({ title: 'My profile', robots: 'noindex' });

const api = useApi();
const { data, status, error, refresh } = await useAsyncData('me-profile', () => api.get<{ user: AuthUser & { stats: UserStats } }>('/users/me'));
const user = computed(() => data.value?.user);
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div v-if="status === 'pending' && !user" class="space-y-4"><UiSkeleton variant="rect" class="h-40" /><UiSkeleton variant="rect" class="h-48" /></div>
    <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />
    <template v-else-if="user">
      <ProfileHeader :username="user.username" :role="user.role" :created-at="user.createdAt" :profile="user.profile" is-owner />
      <p class="mt-3 text-sm text-ink-muted">Your public profile is at <NuxtLink :to="`/u/${user.username}`" class="font-medium text-brand-600 hover:underline">/u/{{ user.username }}</NuxtLink>. Email: <span class="font-medium text-ink">{{ user.email }}</span> (private).</p>
      <div class="mt-6"><SolvedStats :stats="user.stats" /></div>
      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <UiCard hover to="/submissions"><p class="font-semibold text-ink">Submissions</p><p class="text-sm text-ink-muted">Review every solution you submitted.</p></UiCard>
        <UiCard hover to="/bookmarks"><p class="font-semibold text-ink">Bookmarks</p><p class="text-sm text-ink-muted">Articles, problems, tutorials and courses you saved.</p></UiCard>
        <UiCard hover to="/settings"><p class="font-semibold text-ink">Settings</p><p class="text-sm text-ink-muted">Update profile details and password.</p></UiCard>
      </div>
    </template>
  </div>
</template>
