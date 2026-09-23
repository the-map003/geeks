<script setup lang="ts">
withDefaults(defineProps<{ value: number; size?: 'xs' | 'sm' | 'md'; tone?: 'brand' | 'blue' | 'amber'; showLabel?: boolean }>(), {
  size: 'sm',
  tone: 'brand',
  showLabel: false,
});
const heights = { xs: 'h-1', sm: 'h-2', md: 'h-3' };
const tones = { brand: 'bg-brand-500', blue: 'bg-sky-500', amber: 'bg-amber-500' };
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="w-full overflow-hidden rounded-full bg-surface-strong" :class="heights[size]" role="progressbar" :aria-valuenow="Math.round(value)" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full transition-all duration-300" :class="tones[tone]" :style="{ width: `${Math.min(100, Math.max(0, value))}%` }" />
    </div>
    <span v-if="showLabel" class="shrink-0 text-xs font-medium text-ink-muted">{{ Math.round(value) }}%</span>
  </div>
</template>
