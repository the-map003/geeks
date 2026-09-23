<script setup lang="ts">
import { Facebook, Github, Linkedin } from 'lucide-vue-next';

/**
 * The reference login modal: grey card, 250px logo, two half-width tabs (Sign In / Sign Up),
 * the form section, then an "or" divider with four social buttons, "Why Create an Account?"
 * and the policy line. Social sign-in and the reset flow do not exist in this reproduction,
 * so those controls explain themselves with a toast instead of navigating.
 */
defineProps<{ active: 'signin' | 'signup' }>();

const route = useRoute();
const ui = useUiStore();

const tabs = [
  { key: 'signin', label: 'Sign In', path: '/login' },
  { key: 'signup', label: 'Sign Up', path: '/register' },
] as const;

const socials = [
  { label: 'Google', classes: 'border-[#c9453a] bg-gradient-to-b from-[#dd4e41] to-[#c9453a]', icon: null },
  { label: 'Facebook', classes: 'border-[#3b5998] bg-gradient-to-b from-[#4b66a0] to-[#3b5998]', icon: Facebook },
  { label: 'LinkedIn', classes: 'border-[#075b8c] bg-gradient-to-b from-[#0073b1] to-[#075b8c]', icon: Linkedin },
  { label: 'GitHub', classes: 'border-[#191717] bg-gradient-to-b from-[#4a4646] to-[#191717]', icon: Github },
];

function social(label: string) {
  ui.info(`${label} sign-in is not available`, 'This academic reproduction supports email and password accounts only.');
}
</script>

<template>
  <div class="mx-auto w-full max-w-[550px] rounded-[5px] bg-[#eff1f3] pt-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
    <div class="flex justify-center px-4">
      <AppLogo wordmark size="xl" class="gap-2.5" />
    </div>

    <div class="mt-4 rounded-[5px] bg-white p-3 sm:p-5">
      <!-- Tabs -->
      <div class="flex" role="tablist" aria-label="Account">
        <NuxtLink
          v-for="t in tabs"
          :key="t.key"
          :to="{ path: t.path, query: route.query }"
          role="tab"
          :aria-selected="active === t.key"
          class="-mb-px w-1/2 border px-[15px] pb-3 pt-[15px] text-center font-sans text-[20px] font-semibold leading-6 transition-colors"
          :class="active === t.key ? 'relative z-[1] border-[#ddd] border-b-white border-t-2 border-t-[#0f9d58] bg-white text-[#555]' : 'border-transparent bg-[#e9ebee] text-[#888] hover:text-[#666]'"
        >
          {{ t.label }}
        </NuxtLink>
      </div>

      <!-- Form section -->
      <section class="border border-b-0 border-[#ddd] px-4 pb-[30px] pt-5 sm:px-[30px]" role="tabpanel">
        <slot />
      </section>

      <!-- Social sign-in block -->
      <div class="border border-t-0 border-[#ddd] px-4 pb-5 text-center sm:px-[30px]">
        <div class="relative mx-[10%] mb-5 border-b border-[#979faf]">
          <span class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-white px-2.5 text-[14px] text-[#39424e]">or</span>
        </div>
        <div class="grid grid-cols-2 gap-x-2 gap-y-2">
          <button
            v-for="s in socials"
            :key="s.label"
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[3px] border text-[16px] font-medium text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:brightness-110"
            :class="s.classes"
            @click="social(s.label)"
          >
            <component :is="s.icon" v-if="s.icon" class="h-4 w-4" aria-hidden="true" />
            <span v-else class="font-heading text-[17px] font-bold leading-none" aria-hidden="true">G</span>
            {{ s.label }}
          </button>
        </div>

        <p class="pt-12 text-[14px] font-medium">
          <NuxtLink to="/about" class="text-[#0f9d58] hover:underline">Why Create an Account?</NuxtLink>
        </p>
        <p class="mt-2.5 px-[15px] text-[10px] leading-4 text-[#999]">
          By creating this account, you agree to our
          <NuxtLink to="/about#privacy" class="text-[#0f9d58] hover:underline">Privacy Policy</NuxtLink>
          &amp;
          <NuxtLink to="/about#terms" class="text-[#0f9d58] hover:underline">Cookie Policy</NuxtLink>.
        </p>
      </div>
    </div>
  </div>
</template>
