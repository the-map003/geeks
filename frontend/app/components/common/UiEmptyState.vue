<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import type { Component } from 'vue';

withDefaults(defineProps<{ title: string; description?: string; icon?: Component; compact?: boolean }>(), { compact: false });
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface-muted text-center" :class="compact ? 'px-4 py-8' : 'px-6 py-14'">
    <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-muted shadow-sm ring-1 ring-line">
      <component :is="icon ?? Inbox" class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="text-base font-semibold text-ink">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-ink-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
