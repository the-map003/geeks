<script setup lang="ts">
import { CircleUserRound, Lock } from 'lucide-vue-next';

definePageMeta({ layout: 'auth', middleware: 'guest' });
useSeoMeta({ title: 'Sign in', description: 'Sign in to track your progress, save bookmarks and submit solutions.', robots: 'noindex' });

const auth = useAuthStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ emailOrUsername: '', password: '', remember: true });
const errors = reactive<{ emailOrUsername?: string; password?: string }>({});
const formError = ref('');
const loading = ref(false);

const redirectTo = computed(() => {
  const r = route.query.redirect;
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/dashboard';
});

async function submit() {
  formError.value = '';
  errors.emailOrUsername = undefined;
  errors.password = undefined;
  if (!form.emailOrUsername.trim()) errors.emailOrUsername = 'Enter your username or email';
  if (!form.password) errors.password = 'Enter your password';
  if (errors.emailOrUsername || errors.password) return;

  loading.value = true;
  try {
    const user = await auth.login(form.emailOrUsername.trim(), form.password);
    ui.success(`Welcome back, ${user.profile.displayName}!`);
    await router.push(redirectTo.value);
  } catch (err) {
    if (isApiError(err)) {
      formError.value = err.message;
      errors.emailOrUsername = err.fieldError('emailOrUsername');
      errors.password = err.fieldError('password');
    } else {
      formError.value = 'Unable to sign in right now. Please try again.';
    }
  } finally {
    loading.value = false;
  }
}

function forgot() {
  ui.info('Password reset is not available', 'This reproduction has no e-mail delivery. Use one of the demo accounts listed below the card.');
}
</script>

<template>
  <div>
    <AuthCard active="signin">
      <form novalidate @submit.prevent="submit">
        <p v-if="formError" class="mb-2 rounded border border-[#f65039] px-4 py-3 text-left text-[14px] font-normal text-[#f1270b]" role="alert">{{ formError }}</p>

        <AuthField v-model="form.emailOrUsername" :icon="CircleUserRound" placeholder="Username or email" autocomplete="username" name="user" :error="errors.emailOrUsername" required />
        <AuthField v-model="form.password" :icon="Lock" placeholder="Password" type="password" autocomplete="current-password" name="pass" :error="errors.password" required />

        <div class="my-[15px] flex items-center justify-between text-left text-[14px]">
          <label class="inline-flex cursor-pointer items-center gap-2 text-[#39424e]">
            <input v-model="form.remember" type="checkbox" class="h-4 w-4 accent-[#0f9d58]" />
            Remember me
          </label>
          <button type="button" class="py-2.5 font-medium text-[#979faf] hover:text-[#0f9d58] hover:underline" @click="forgot">Forgot Password</button>
        </div>

        <AuthSubmit :loading="loading">Sign In</AuthSubmit>
      </form>
    </AuthCard>

    <div class="mx-auto mt-4 w-full max-w-[550px] rounded-[5px] border border-dashed border-[#c2c7d0] bg-white/70 p-4 text-xs text-ink-muted">
      <p class="font-semibold text-[#39424e]">Demo accounts (development seed)</p>
      <ul class="mt-1 grid gap-0.5 sm:grid-cols-2">
        <li><code>student@example.com</code> / <code>Student@123</code></li>
        <li><code>editor@example.com</code> / <code>Editor@123</code></li>
        <li><code>admin@example.com</code> / <code>Admin@123</code></li>
        <li><code>superadmin@example.com</code> / <code>SuperAdmin@123</code></li>
      </ul>
    </div>
  </div>
</template>
