<script setup lang="ts">
import { Bookmark, ChevronDown, LayoutDashboard, ListChecks, LogOut, Settings, Shield, User } from 'lucide-vue-next';

const auth = useAuthStore();
const ui = useUiStore();
const router = useRouter();

async function signOut() {
  try {
    await auth.logout();
    ui.success('Signed out', 'See you soon!');
    router.push('/');
  } catch {
    ui.error('Could not sign out', 'Please try again.');
  }
}
</script>

<template>
  <UiDropdown align="right" width="w-60">
    <template #trigger="{ open }">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        :aria-expanded="open"
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <UiAvatar :name="auth.displayName" :src="auth.user?.profile.avatarUrl" size="sm" />
        <span class="hidden max-w-[120px] truncate text-sm font-medium text-ink lg:inline">{{ auth.displayName }}</span>
        <ChevronDown class="hidden h-4 w-4 text-ink-muted lg:inline" aria-hidden="true" />
      </button>
    </template>

    <div class="border-b border-line px-3 py-2.5">
      <p class="truncate text-sm font-semibold text-ink">{{ auth.displayName }}</p>
      <p class="truncate text-xs text-ink-muted">@{{ auth.user?.username }}</p>
    </div>
    <div class="py-1">
      <UiMenuItem to="/dashboard"><LayoutDashboard class="h-4 w-4 text-ink-muted" /> Dashboard</UiMenuItem>
      <UiMenuItem to="/profile"><User class="h-4 w-4 text-ink-muted" /> My profile</UiMenuItem>
      <UiMenuItem to="/bookmarks"><Bookmark class="h-4 w-4 text-ink-muted" /> Bookmarks</UiMenuItem>
      <UiMenuItem to="/submissions"><ListChecks class="h-4 w-4 text-ink-muted" /> Submissions</UiMenuItem>
      <UiMenuItem to="/settings"><Settings class="h-4 w-4 text-ink-muted" /> Settings</UiMenuItem>
      <UiMenuItem v-if="auth.isEditor" to="/admin"><Shield class="h-4 w-4 text-ink-muted" /> Admin panel</UiMenuItem>
    </div>
    <div class="border-t border-line py-1">
      <UiMenuItem danger @click="signOut"><LogOut class="h-4 w-4" /> Sign out</UiMenuItem>
    </div>
  </UiDropdown>
</template>
