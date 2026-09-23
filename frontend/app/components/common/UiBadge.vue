<script setup lang="ts">
type Tone = 'gray' | 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'brand' | 'dark';

withDefaults(defineProps<{ tone?: Tone; size?: 'xs' | 'sm' | 'md'; outline?: boolean }>(), {
  tone: 'gray',
  size: 'sm',
  outline: false,
});

const toneClass: Record<Tone, string> = {
  gray: 'bg-surface-muted text-ink ring-line',
  green: 'bg-green-50 text-green-700 ring-green-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  dark: 'bg-ink text-page ring-ink',
};

const sizeClass = {
  xs: 'px-1.5 py-0.5 text-[11px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full font-medium leading-none whitespace-nowrap"
    :class="[toneClass[tone], sizeClass[size], outline ? 'ring-1 ring-inset' : '']"
  >
    <slot />
  </span>
</template>
