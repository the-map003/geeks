<script setup lang="ts">
import type { Component } from 'vue';

withDefaults(defineProps<{ label: string; value: string | number; hint?: string; icon?: Component; tone?: 'brand' | 'blue' | 'amber' | 'purple' | 'gray' }>(), {
  tone: 'brand',
});
const toneClass = {
  brand: 'bg-brand-50 text-brand-600',
  blue: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
  gray: 'bg-surface-muted text-ink-muted',
};
</script>

<template>
  <div class="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
    <div v-if="icon" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" :class="toneClass[tone]">
      <component :is="icon" class="h-5 w-5" aria-hidden="true" />
    </div>
    <div class="min-w-0">
      <p class="truncate text-sm text-ink-muted">{{ label }}</p>
      <p class="text-2xl font-bold leading-tight text-ink">{{ value }}</p>
      <p v-if="hint" class="truncate text-xs text-ink-muted">{{ hint }}</p>
    </div>
  </div>
</template>
