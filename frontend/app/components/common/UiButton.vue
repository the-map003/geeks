<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'link';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    type?: 'button' | 'submit' | 'reset';
    to?: string;
    href?: string;
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    icon?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false, icon: false },
);

const variantClass: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 focus-visible:ring-brand-500 shadow-sm disabled:bg-brand-300',
  secondary:
    'bg-surface text-ink ring-1 ring-inset ring-line hover:bg-surface-muted active:bg-surface-muted focus-visible:ring-brand-500 disabled:text-ink-faint',
  ghost: 'bg-transparent text-ink hover:bg-surface-strong active:bg-surface-strong focus-visible:ring-brand-500 disabled:text-ink-faint',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-sm disabled:bg-red-300',
  dark: 'bg-[#1f2a37] text-white hover:bg-black active:bg-black focus-visible:ring-ink-faint shadow-sm disabled:bg-ink-faint',
  link: 'bg-transparent text-brand-600 hover:text-brand-700 hover:underline focus-visible:ring-brand-500 px-0',
};

const sizeClass: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg',
};

const iconSizeClass: Record<Size, string> = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const classes = computed(() => [
  'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 select-none',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80',
  variantClass[props.variant],
  props.icon ? `${iconSizeClass[props.size]} rounded-md p-0` : sizeClass[props.size],
  props.block ? 'w-full' : '',
]);

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
  <NuxtLink v-if="to && !isDisabled" :to="to" :class="classes">
    <Loader2 v-if="loading" class="h-4 w-4 animate-spin" aria-hidden="true" />
    <slot />
  </NuxtLink>
  <a v-else-if="href && !isDisabled" :href="href" :class="classes" target="_blank" rel="noopener noreferrer">
    <slot />
  </a>
  <button v-else :type="type" :disabled="isDisabled" :class="classes" :aria-busy="loading || undefined">
    <Loader2 v-if="loading" class="h-4 w-4 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
