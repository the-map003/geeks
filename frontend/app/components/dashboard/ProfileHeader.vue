<script setup lang="ts">
import { Calendar, Github, Globe, Linkedin, MapPin, School, Settings } from 'lucide-vue-next';
import type { Profile, Role } from '~/types/api';
import { formatDate } from '~/utils/format';

defineProps<{ username: string; role: Role; createdAt: string; profile: Profile; isOwner?: boolean }>();

const roleLabel: Record<Role, string> = { USER: 'Learner', EDITOR: 'Editor', ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin' };
</script>

<template>
  <div class="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 sm:flex-row sm:items-start">
    <UiAvatar :name="profile.displayName" :src="profile.avatarUrl" size="xl" />
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="text-2xl font-bold text-ink">{{ profile.displayName }}</h1>
        <UiBadge v-if="role !== 'USER'" tone="brand" size="xs">{{ roleLabel[role] }}</UiBadge>
      </div>
      <p class="text-sm text-ink-muted">@{{ username }}</p>
      <p v-if="profile.bio" class="mt-3 max-w-2xl text-[15px] text-ink">{{ profile.bio }}</p>
      <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-muted">
        <span v-if="profile.institution" class="inline-flex items-center gap-1.5"><School class="h-4 w-4" /> {{ profile.institution }}</span>
        <span v-if="profile.location" class="inline-flex items-center gap-1.5"><MapPin class="h-4 w-4" /> {{ profile.location }}</span>
        <span class="inline-flex items-center gap-1.5"><Calendar class="h-4 w-4" /> Joined {{ formatDate(createdAt, { month: 'long' }) }}</span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <a v-if="profile.websiteUrl" :href="profile.websiteUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink hover:border-line-strong"><Globe class="h-3.5 w-3.5" /> Website</a>
        <a v-if="profile.githubUrl" :href="profile.githubUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink hover:border-line-strong"><Github class="h-3.5 w-3.5" /> GitHub</a>
        <a v-if="profile.linkedinUrl" :href="profile.linkedinUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink hover:border-line-strong"><Linkedin class="h-3.5 w-3.5" /> LinkedIn</a>
      </div>
    </div>
    <UiButton v-if="isOwner" to="/settings" variant="secondary" size="sm"><Settings class="h-4 w-4" /> Edit profile</UiButton>
  </div>
</template>
