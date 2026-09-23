<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'text' | 'title' | 'rect' | 'circle' | 'card' | 'row'; lines?: number; class?: string }>(), {
  variant: 'text',
  lines: 1,
});
</script>

<template>
  <div v-if="variant === 'card'" class="rounded-lg border border-line bg-surface p-4" :class="$props.class" aria-hidden="true">
    <div class="mb-4 h-32 w-full animate-pulse rounded-md bg-surface-strong" />
    <div class="mb-2 h-4 w-1/3 animate-pulse rounded bg-surface-strong" />
    <div class="mb-2 h-5 w-5/6 animate-pulse rounded bg-surface-strong" />
    <div class="h-4 w-full animate-pulse rounded bg-surface-muted" />
    <div class="mt-1 h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
  </div>
  <div v-else-if="variant === 'row'" class="flex items-center gap-4 border-b border-line px-4 py-3" :class="$props.class" aria-hidden="true">
    <div class="h-5 w-5 animate-pulse rounded-full bg-surface-strong" />
    <div class="h-4 flex-1 animate-pulse rounded bg-surface-strong" />
    <div class="hidden h-4 w-16 animate-pulse rounded bg-surface-muted sm:block" />
    <div class="h-5 w-14 animate-pulse rounded-full bg-surface-strong" />
  </div>
  <div v-else-if="variant === 'circle'" class="animate-pulse rounded-full bg-surface-strong" :class="$props.class || 'h-10 w-10'" aria-hidden="true" />
  <div v-else-if="variant === 'rect'" class="animate-pulse rounded-md bg-surface-strong" :class="$props.class || 'h-24 w-full'" aria-hidden="true" />
  <div v-else-if="variant === 'title'" class="h-7 animate-pulse rounded bg-surface-strong" :class="$props.class || 'w-2/3'" aria-hidden="true" />
  <div v-else class="space-y-2" :class="$props.class" aria-hidden="true">
    <div v-for="i in lines" :key="i" class="h-4 animate-pulse rounded bg-surface-strong" :class="i === lines && lines > 1 ? 'w-3/4' : 'w-full'" />
  </div>
</template>
