<script setup lang="ts">
withDefaults(defineProps<{ to?: string; hover?: boolean; padding?: 'none' | 'sm' | 'md' | 'lg'; as?: string }>(), {
  hover: false,
  padding: 'md',
  as: 'div',
});

const paddingClass = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-6 sm:p-8' };
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="block rounded-lg border border-line bg-surface transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    :class="[paddingClass[padding], hover ? 'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md' : '']"
  >
    <slot />
  </NuxtLink>
  <component
    :is="as"
    v-else
    class="rounded-lg border border-line bg-surface transition-all duration-150"
    :class="[paddingClass[padding], hover ? 'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md' : '']"
  >
    <slot />
  </component>
</template>
