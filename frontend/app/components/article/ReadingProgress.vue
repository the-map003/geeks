<script setup lang="ts">
import { useEventListener } from '@vueuse/core';

const props = defineProps<{ target?: HTMLElement | null }>();
const progress = ref(0);

function update() {
  const el = props.target;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const viewport = window.innerHeight;
  const total = rect.height - viewport;
  if (total <= 0) {
    progress.value = 100;
    return;
  }
  const scrolled = Math.min(Math.max(-rect.top, 0), total);
  progress.value = Math.round((scrolled / total) * 100);
}

useEventListener(window, 'scroll', update, { passive: true });
useEventListener(window, 'resize', update, { passive: true });
watch(() => props.target, update);
onMounted(update);
</script>

<template>
  <div class="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent" aria-hidden="true">
    <div class="h-full bg-brand-500 transition-[width] duration-150" :style="{ width: `${progress}%` }" />
  </div>
</template>
