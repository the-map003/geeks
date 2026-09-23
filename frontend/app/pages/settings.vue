<script setup lang="ts">
import type { AuthUser } from '~/types/api';

definePageMeta({ middleware: 'auth' });
useSeoMeta({ title: 'Settings', robots: 'noindex' });

const api = useApi();
const auth = useAuthStore();
const ui = useUiStore();

const form = reactive({ username: '', displayName: '', bio: '', avatarUrl: '', institution: '', location: '', websiteUrl: '', githubUrl: '', linkedinUrl: '' });
const errors = reactive<Record<string, string | undefined>>({});
const saving = ref(false);

function fill(u: AuthUser) {
  form.username = u.username;
  form.displayName = u.profile.displayName;
  form.bio = u.profile.bio ?? '';
  form.avatarUrl = u.profile.avatarUrl ?? '';
  form.institution = u.profile.institution ?? '';
  form.location = u.profile.location ?? '';
  form.websiteUrl = u.profile.websiteUrl ?? '';
  form.githubUrl = u.profile.githubUrl ?? '';
  form.linkedinUrl = u.profile.linkedinUrl ?? '';
}
watch(() => auth.user, (u) => u && fill(u), { immediate: true });

async function saveProfile() {
  for (const k of Object.keys(errors)) errors[k] = undefined;
  saving.value = true;
  try {
    const payload: Record<string, string> = { ...form };
    if (payload.username === auth.user?.username) delete payload.username;
    const res = await api.patch<{ user: AuthUser }>('/users/me', payload);
    auth.updateUser(res.user);
    ui.success('Profile updated');
  } catch (err) {
    if (isApiError(err)) {
      for (const e of err.errors) errors[e.path] = e.message;
      ui.error('Could not save profile', err.errors.length ? undefined : err.message);
    } else ui.error('Could not save profile');
  } finally {
    saving.value = false;
  }
}

const pw = reactive({ currentPassword: '', newPassword: '', confirm: '' });
const pwErrors = reactive<Record<string, string | undefined>>({});
const changing = ref(false);
async function changePassword() {
  for (const k of Object.keys(pwErrors)) pwErrors[k] = undefined;
  if (pw.newPassword !== pw.confirm) {
    pwErrors.confirm = 'Passwords do not match';
    return;
  }
  changing.value = true;
  try {
    await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
    ui.success('Password changed', 'Other sessions have been signed out.');
    pw.currentPassword = pw.newPassword = pw.confirm = '';
  } catch (err) {
    if (isApiError(err)) {
      for (const e of err.errors) pwErrors[e.path] = e.message;
      if (!err.errors.length) pwErrors.currentPassword = err.message;
    }
  } finally {
    changing.value = false;
  }
}

const signingOutAll = ref(false);
async function signOutEverywhere() {
  signingOutAll.value = true;
  try {
    await api.post('/auth/logout-all');
    auth.clearSession();
    ui.success('Signed out of all devices');
    navigateTo('/login');
  } catch (err) {
    ui.error('Could not sign out everywhere', isApiError(err) ? err.message : undefined);
  } finally {
    signingOutAll.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <h1 class="text-3xl font-bold tracking-tight text-ink">Settings</h1>
    <p class="mt-1 text-ink-muted">Manage your public profile and account security.</p>

    <UiCard class="mt-8">
      <h2 class="text-lg font-semibold text-ink">Profile</h2>
      <form class="mt-4 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="saveProfile">
        <div class="flex items-center gap-4 sm:col-span-2">
          <UiAvatar :name="form.displayName || form.username" :src="form.avatarUrl || null" size="lg" />
          <UiInput v-model="form.avatarUrl" label="Avatar URL" placeholder="https://…" :error="errors.avatarUrl" class="flex-1" hint="Link to a public image (no uploads in this build)." />
        </div>
        <UiInput v-model="form.displayName" label="Display name" :error="errors.displayName" required />
        <UiInput v-model="form.username" label="Username" :error="errors.username" required hint="Changes your public profile URL." />
        <UiTextarea v-model="form.bio" label="Bio" :rows="3" :maxlength="500" show-count :error="errors.bio" class="sm:col-span-2" />
        <UiInput v-model="form.institution" label="Institution / company" :error="errors.institution" />
        <UiInput v-model="form.location" label="Location" :error="errors.location" />
        <UiInput v-model="form.websiteUrl" label="Website" placeholder="https://" :error="errors.websiteUrl" />
        <UiInput v-model="form.githubUrl" label="GitHub" placeholder="https://github.com/…" :error="errors.githubUrl" />
        <UiInput v-model="form.linkedinUrl" label="LinkedIn" placeholder="https://linkedin.com/in/…" :error="errors.linkedinUrl" />
        <div class="flex justify-end sm:col-span-2"><UiButton type="submit" :loading="saving">Save changes</UiButton></div>
      </form>
    </UiCard>

    <UiCard class="mt-6">
      <h2 class="text-lg font-semibold text-ink">Change password</h2>
      <form class="mt-4 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="changePassword">
        <UiInput v-model="pw.currentPassword" label="Current password" type="password" autocomplete="current-password" :error="pwErrors.currentPassword" required class="sm:col-span-2" />
        <UiInput v-model="pw.newPassword" label="New password" type="password" autocomplete="new-password" :error="pwErrors.newPassword" hint="At least 8 characters with a letter and a number." required />
        <UiInput v-model="pw.confirm" label="Confirm new password" type="password" autocomplete="new-password" :error="pwErrors.confirm" required />
        <div class="flex justify-end sm:col-span-2"><UiButton type="submit" variant="secondary" :loading="changing">Update password</UiButton></div>
      </form>
    </UiCard>

    <UiCard class="mt-6 border-red-200">
      <h2 class="text-lg font-semibold text-red-700">Sessions</h2>
      <p class="mt-1 text-sm text-ink-muted">Sign out of every device, including this one. You will need to sign in again.</p>
      <UiButton variant="danger" size="sm" class="mt-3" :loading="signingOutAll" @click="signOutEverywhere">Sign out everywhere</UiButton>
    </UiCard>
  </div>
</template>
