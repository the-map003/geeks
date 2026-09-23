<script setup lang="ts">
import type { Paginated, Role } from '~/types/api';
import { formatDate } from '~/utils/format';

definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'ADMIN' });
useSeoMeta({ title: 'Users · Admin', robots: 'noindex' });

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  profile: { displayName: string; avatarUrl: string | null } | null;
  _count: { submissions: number; comments: number; articles: number };
}

const api = useApi();
const ui = useUiStore();
const auth = useAuthStore();
const q = useQueryParam('q');
const role = useQueryParam('role');
const active = useQueryParam('active');
const page = useQueryPage();
const searchDraft = ref(q.value);

const query = computed(() => ({ q: q.value || undefined, role: role.value || undefined, active: active.value || undefined, page: page.value, pageSize: 20 }));
const { data, status, error, refresh } = await useAsyncData(() => `admin-users:${JSON.stringify(query.value)}`, () => api.get<Paginated<AdminUser>>('/admin/users', query.value), { watch: [query] });

const roles: Role[] = ['USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];
const rank: Record<Role, number> = { USER: 0, EDITOR: 1, ADMIN: 2, SUPER_ADMIN: 3 };
const myRank = computed(() => rank[auth.role ?? 'USER']);
const busy = ref<string | null>(null);

function canManage(u: AdminUser) {
  return u.id !== auth.user?.id && rank[u.role] < myRank.value;
}
function roleOptionsFor(_u: AdminUser) {
  return roles.filter((r) => auth.isSuperAdmin || rank[r] < myRank.value).map((r) => ({ value: r, label: r.replace('_', ' ') }));
}
async function patch(u: AdminUser, body: { role?: Role; isActive?: boolean }) {
  busy.value = u.id;
  try {
    await api.patch(`/admin/users/${u.id}`, body);
    ui.success('User updated');
    await refresh();
  } catch (err) {
    ui.error('Could not update user', isApiError(err) ? err.message : undefined);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Users" subtitle="Manage roles and account status. You can only manage users below your own role." />
    <div class="flex flex-wrap gap-2">
      <form class="flex gap-2" @submit.prevent="q = searchDraft">
        <UiInput v-model="searchDraft" placeholder="Search email, username or name…" class="w-72" />
        <UiButton type="submit" variant="secondary">Search</UiButton>
      </form>
      <UiSelect v-model="role" :options="[{ value: '', label: 'All roles' }, ...roles.map((r) => ({ value: r, label: r.replace('_', ' ') }))]" class="w-44" />
      <UiSelect v-model="active" :options="[{ value: '', label: 'Any status' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated' }]" class="w-40" />
    </div>

    <div class="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
      <div v-if="status === 'pending'"><UiSkeleton v-for="i in 8" :key="i" variant="row" /></div>
      <UiErrorState v-else-if="status === 'error'" :message="error?.message" compact @retry="refresh()" />
      <UiEmptyState v-else-if="!data?.items.length" title="No users match" compact />
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[800px] text-sm">
          <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr><th class="px-4 py-2.5">User</th><th class="px-4 py-2.5">Role</th><th class="px-4 py-2.5">Activity</th><th class="px-4 py-2.5">Joined</th><th class="px-4 py-2.5">Status</th></tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="u in data.items" :key="u.id" :class="u.isActive ? '' : 'opacity-60'">
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-3">
                  <UiAvatar :name="u.profile?.displayName ?? u.username" :src="u.profile?.avatarUrl" size="sm" />
                  <div class="min-w-0"><p class="truncate font-medium text-ink">{{ u.profile?.displayName ?? u.username }} <span class="text-ink-muted">@{{ u.username }}</span></p><p class="truncate text-xs text-ink-muted">{{ u.email }}</p></div>
                </div>
              </td>
              <td class="px-4 py-2.5">
                <UiSelect v-if="canManage(u)" :model-value="u.role" :options="roleOptionsFor(u)" size="sm" class="w-40" :disabled="busy === u.id" @update:model-value="patch(u, { role: $event as Role })" />
                <UiBadge v-else tone="brand" size="xs">{{ u.role.replace('_', ' ') }}</UiBadge>
              </td>
              <td class="px-4 py-2.5 text-xs text-ink-muted">{{ u._count.submissions }} submissions · {{ u._count.comments }} comments · {{ u._count.articles }} articles</td>
              <td class="whitespace-nowrap px-4 py-2.5 text-ink-muted">{{ formatDate(u.createdAt) }}</td>
              <td class="px-4 py-2.5">
                <UiButton v-if="canManage(u)" size="xs" :variant="u.isActive ? 'secondary' : 'primary'" :loading="busy === u.id" @click="patch(u, { isActive: !u.isActive })">{{ u.isActive ? 'Deactivate' : 'Reactivate' }}</UiButton>
                <UiBadge v-else :tone="u.isActive ? 'green' : 'red'" size="xs">{{ u.isActive ? 'Active' : 'Deactivated' }}</UiBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <UiPagination v-if="data" v-model:page="page" :total-pages="data.totalPages" :total="data.total" :page-size="data.pageSize" class="mt-4" />
  </div>
</template>
