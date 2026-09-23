<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';

withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; label?: string }>(), { size: 'md' });
const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
</script>

<template>
  <div class="inline-flex items-center gap-2 text-ink-muted" role="status">
    <Loader2 class="animate-spin" :class="sizeClass[size]" aria-hidden="true" />
    <span v-if="label" class="text-sm">{{ label }}</span>
    <span v-else class="sr-only">Loading</span>
  </div>
</template>
