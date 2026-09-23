<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next';

/** Reference header control: a round icon button with a small red dot; moon in light mode, sun in dark mode. */
const { isDark, toggle } = useTheme();
</script>

<template>
  <button
    type="button"
    class="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-heading transition hover:bg-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
    @click="toggle()"
  >
    <ClientOnly>
      <Sun v-if="isDark" class="h-5 w-5" aria-hidden="true" />
      <Moon v-else class="h-5 w-5" aria-hidden="true" />
      <template #fallback><Moon class="h-5 w-5" aria-hidden="true" /></template>
    </ClientOnly>
    <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#e53935]" aria-hidden="true" />
  </button>
</template>
