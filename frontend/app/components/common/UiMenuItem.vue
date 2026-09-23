<script setup lang="ts">
withDefaults(defineProps<{ to?: string; danger?: boolean; disabled?: boolean }>(), { danger: false, disabled: false });
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    role="menuitem"
    class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-strong focus:bg-surface-muted focus:outline-none"
    :class="danger ? 'text-red-600' : 'text-ink'"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    type="button"
    role="menuitem"
    :disabled="disabled"
    class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-surface-strong focus:bg-surface-muted focus:outline-none disabled:opacity-50"
    :class="danger ? 'text-red-600' : 'text-ink'"
  >
    <slot />
  </button>
</template>
