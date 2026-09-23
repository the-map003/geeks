<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';

/** Reference `.btn.btn-green`: full-width #2bbe60→#0f9d58 gradient, 3px radius, 16px/500. */
defineProps<{ loading?: boolean }>();
</script>

<template>
  <button
    type="submit"
    :disabled="loading"
    :aria-busy="loading || undefined"
    class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[3px] border border-[#0f9d58] bg-gradient-to-b from-[#2bbe60] to-[#0f9d58] text-[16px] font-medium text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_-1px_4px_rgba(151,159,175,0.2)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-80"
  >
    <Loader2 v-if="loading" class="h-4 w-4 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
