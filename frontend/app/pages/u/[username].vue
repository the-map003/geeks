<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next';
import type { Difficulty, PublicUser, UserStats } from '~/types/api';
import { formatDate } from '~/utils/format';

interface PublicProfile extends PublicUser {
  stats: UserStats;
  recentSolved: Array<{ title: string; slug: string; difficulty: Difficulty; solvedAt: string | null }>;
}

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const username = computed(() => route.params.username as string);

const { data, status, error } = await useAsyncData(() => `user:${username.value}`, () => api.get<{ user: PublicProfile }>(`/users/${username.value}`, undefined, { auth: false }), { watch: [username] });
if (status.value === 'error' && error.value) {
  const e = error.value as unknown as { status?: number };
  throw createError({ statusCode: e.status === 404 ? 404 : 500, statusMessage: e.status === 404 ? 'User not found' : 'Failed to load profile', fatal: true });
}
const user = computed(() => data.value?.user);
const isOwner = computed(() => auth.user?.username === user.value?.username);

useContentSeo(() => ({ title: user.value ? `${user.value.profile.displayName} (@${user.value.username})` : 'Profile', description: user.value?.profile.bio ?? `Profile of ${username.value} on GeeksforGeeks`, path: `/u/${username.value}` }));
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div v-if="status === 'pending' && !user" class="space-y-4"><UiSkeleton variant="rect" class="h-40" /><UiSkeleton variant="rect" class="h-48" /></div>
    <template v-else-if="user">
      <ProfileHeader :username="user.username" :role="user.role" :created-at="user.createdAt" :profile="user.profile" :is-owner="isOwner" />
      <div class="mt-6"><SolvedStats :stats="user.stats" /></div>
      <section class="mt-8">
        <h2 class="mb-3 text-lg font-bold text-ink">Recently solved</h2>
        <div v-if="user.recentSolved.length" class="overflow-hidden rounded-lg border border-line">
          <NuxtLink v-for="p in user.recentSolved" :key="p.slug" :to="`/problems/${p.slug}`" class="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-surface-muted">
            <CheckCircle2 class="h-4 w-4 text-green-600" />
            <span class="flex-1 text-sm font-medium text-ink">{{ p.title }}</span>
            <DifficultyBadge :difficulty="p.difficulty" size="xs" />
            <span class="hidden text-xs text-ink-muted sm:inline">{{ formatDate(p.solvedAt) }}</span>
          </NuxtLink>
        </div>
        <UiEmptyState v-else title="No solved problems yet" compact />
      </section>
    </template>
  </div>
</template>
