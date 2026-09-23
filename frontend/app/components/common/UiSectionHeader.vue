<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';

withDefaults(defineProps<{ title: string; subtitle?: string; to?: string; linkLabel?: string; as?: 'h1' | 'h2' | 'h3' }>(), {
  linkLabel: 'View all',
  as: 'h2',
});
</script>

<template>
  <div class="mb-5 flex items-end justify-between gap-4">
    <div class="min-w-0">
      <component :is="as" class="text-xl font-bold tracking-tight text-ink sm:text-2xl">{{ title }}</component>
      <p v-if="subtitle" class="mt-1 text-sm text-ink-muted">{{ subtitle }}</p>
    </div>
    <NuxtLink v-if="to" :to="to" class="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
      {{ linkLabel }}
      <ArrowRight class="h-4 w-4" />
    </NuxtLink>
  </div>
</template>
