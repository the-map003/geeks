<script setup lang="ts">
import * as icons from 'lucide-vue-next';
import type { Component } from 'vue';

const props = withDefaults(defineProps<{ name: string | null | undefined; class?: string }>(), { class: 'h-5 w-5' });

function toPascal(s: string) {
  return s
    .split(/[-_\s]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

const icon = computed<Component>(() => {
  const key = props.name ? toPascal(props.name) : '';
  const lib = icons as unknown as Record<string, Component>;
  return lib[key] ?? lib.BookOpen!;
});
</script>

<template>
  <component :is="icon" :class="$props.class" aria-hidden="true" />
</template>
