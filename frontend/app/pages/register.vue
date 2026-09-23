<script setup lang="ts">
import { AtSign, Lock, Mail, UserRound } from 'lucide-vue-next';

definePageMeta({ layout: 'auth', middleware: 'guest' });
useSeoMeta({ title: 'Sign up', description: 'Create a free account to practice coding, take quizzes and track progress.', robots: 'noindex' });

const auth = useAuthStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ email: '', password: '', displayName: '', username: '' });
const errors = reactive<Record<string, string | undefined>>({});
const formError = ref('');
const loading = ref(false);

const redirectTo = computed(() => {
  const r = route.query.redirect;
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/dashboard';
});

function validate() {
  for (const k of Object.keys(errors)) errors[k] = undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid e-mail address';
  if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
    errors.password = 'At least 8 characters with a letter and a number';
  if (form.displayName.trim().length < 2) errors.displayName = 'Enter your name (at least 2 characters)';
  if (!/^[a-z0-9_]{3,30}$/i.test(form.username.trim())) errors.username = '3–30 letters, numbers or underscores';
  return Object.values(errors).every((v) => !v);
}

async function submit() {
  formError.value = '';
  if (!validate()) return;
  loading.value = true;
  try {
    await auth.register({
      email: form.email.trim(),
      username: form.username.trim(),
      password: form.password,
      displayName: form.displayName.trim(),
    });
    ui.success('Account created', 'Welcome to GeeksforGeeks!');
    await router.push(redirectTo.value);
  } catch (err) {
    if (isApiError(err)) {
      formError.value = err.message;
      for (const e of err.errors) errors[e.path] = e.message;
    } else {
      formError.value = 'Unable to create your account right now. Please try again.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthCard active="signup">
    <form novalidate @submit.prevent="submit">
      <p v-if="formError" class="mb-2 rounded border border-[#f65039] px-4 py-3 text-left text-[14px] text-[#f1270b]" role="alert">{{ formError }}</p>

      <AuthField v-model="form.email" :icon="Mail" placeholder="E-mail" type="email" autocomplete="email" name="email" :error="errors.email" required />
      <AuthField v-model="form.password" :icon="Lock" placeholder="Password" type="password" autocomplete="new-password" name="pass" :error="errors.password" required />
      <AuthField v-model="form.displayName" :icon="UserRound" placeholder="Full name" autocomplete="name" name="displayName" :error="errors.displayName" required />
      <AuthField v-model="form.username" :icon="AtSign" placeholder="Username" autocomplete="username" name="username" :error="errors.username" required />

      <AuthSubmit :loading="loading">Sign Up</AuthSubmit>
    </form>
  </AuthCard>
</template>
