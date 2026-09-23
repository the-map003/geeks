<script setup lang="ts">
import { initials } from '~/utils/format';

const props = withDefaults(defineProps<{ name: string; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }>(), { size: 'md', src: null });

const sizeClass = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

const failed = ref(false);
const palette = ['bg-brand-500', 'bg-sky-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600', 'bg-teal-600'];
const color = computed(() => {
  let h = 0;
  for (const ch of props.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
});
</script>

<template>
  <span class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-black/5" :class="[sizeClass[size], src && !failed ? 'bg-surface-muted' : color]">
    <img v-if="src && !failed" :src="src" :alt="name" class="h-full w-full object-cover" loading="lazy" @error="failed = true" />
    <span v-else aria-hidden="true">{{ initials(name) }}</span>
  </span>
</template>
