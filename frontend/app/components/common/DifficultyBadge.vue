<script setup lang="ts">
import type { Difficulty } from '~/types/api';
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL } from '~/utils/format';

withDefaults(defineProps<{ difficulty: Difficulty; size?: 'xs' | 'sm' | 'md' }>(), { size: 'sm' });

const sizeClass = { xs: 'px-1.5 py-0.5 text-[11px]', sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
</script>

<template>
  <span
    class="inline-flex items-center rounded-full font-semibold leading-none ring-1 ring-inset"
    :class="[DIFFICULTY_CLASS[difficulty], sizeClass[size]]"
  >
    {{ DIFFICULTY_LABEL[difficulty] }}
  </span>
</template>
