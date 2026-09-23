<script setup lang="ts">
import type { Component } from 'vue';
import { BookOpen } from 'lucide-vue-next';

/**
 * Cover art for articles, tutorials and quizzes without an image: the same pastel family as the
 * course thumbnails (soft gradient, a lighter disc, a small white "document" card and a coloured
 * icon badge) so every card on the site shares one visual language. Deterministic per `seed`.
 */
const props = withDefaults(defineProps<{ seed: string; src?: string | null; alt?: string; icon?: Component; aspect?: string; label?: string | null }>(), {
  src: null,
  alt: '',
  aspect: 'aspect-[16/9]',
  label: null,
});

const palettes = [
  { bg: 'linear-gradient(160deg,#ece7ff 0%,#d4c9ff 100%)', disc: '#c7b9ff', accent: '#6b46ff', ink: '#141a33' },
  { bg: 'linear-gradient(160deg,#dcf3ff 0%,#bfe2ff 100%)', disc: '#a9d3fb', accent: '#1e6fd9', ink: '#0f2f4f' },
  { bg: 'linear-gradient(160deg,#e3f6ea 0%,#c6ead6 100%)', disc: '#a7ddc0', accent: '#1f8a4f', ink: '#0f3b28' },
  { bg: 'linear-gradient(160deg,#ffe6ee 0%,#ffcbdb 100%)', disc: '#f9b3c9', accent: '#d63a6a', ink: '#4a1630' },
  { bg: 'linear-gradient(160deg,#fff0dc 0%,#ffd9b0 100%)', disc: '#f7c896', accent: '#d9791e', ink: '#4a2e0c' },
  { bg: 'linear-gradient(160deg,#f5e2ff 0%,#e2c6ff 100%)', disc: '#d3b0f7', accent: '#8a3ffc', ink: '#341a57' },
  { bg: 'linear-gradient(160deg,#e0f7f5 0%,#bfeae6 100%)', disc: '#9fdcd6', accent: '#0f8b83', ink: '#0d3b38' },
];
const palette = computed(() => {
  let h = 0;
  for (const ch of props.seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length]!;
});
</script>

<template>
  <div class="relative w-full overflow-hidden bg-surface-muted" :class="aspect">
    <img v-if="src" :src="src" :alt="alt" class="h-full w-full object-cover" loading="lazy" />
    <div v-else class="relative h-full w-full" :style="{ background: palette.bg }" aria-hidden="true">
      <div class="absolute -right-[12%] -top-[18%] aspect-square w-[62%] rounded-full opacity-70" :style="{ background: palette.disc }" />
      <span v-if="label" class="absolute left-[6%] top-[9%] max-w-[55%] truncate rounded-[4px] bg-[#fff]/70 px-2 py-[3px] font-heading text-[10px] font-bold" :style="{ color: palette.ink }">{{ label }}</span>
      <!-- document card -->
      <div class="absolute right-[12%] top-[16%] h-[62%] w-[38%] rotate-[-5deg] overflow-hidden rounded-[7px] bg-[#fff] shadow-[0_10px_24px_rgba(20,26,51,0.18)]">
        <div class="flex h-[16%] items-center gap-1 px-[8%]" :style="{ background: palette.disc }">
          <span class="h-1.5 w-1.5 rounded-full bg-[#fff]/90" /><span class="h-1.5 w-1.5 rounded-full bg-[#fff]/60" />
        </div>
        <div class="space-y-[7%] p-[9%]">
          <span class="block h-[5px] w-[60%] rounded-full" :style="{ background: palette.disc }" />
          <span class="block h-[5px] w-[88%] rounded-full bg-[#e6e6ee]" />
          <span class="block h-[5px] w-[48%] rounded-full" :style="{ background: palette.accent, opacity: 0.55 }" />
          <span class="block h-[5px] w-[72%] rounded-full bg-[#e6e6ee]" />
        </div>
      </div>
      <!-- icon badge -->
      <div class="absolute bottom-[12%] right-[8%] flex h-[26%] min-h-9 w-auto aspect-square items-center justify-center rounded-[10px] shadow-[0_8px_18px_rgba(20,26,51,0.22)]" :style="{ background: palette.accent }">
        <component :is="icon ?? BookOpen" class="h-[55%] w-[55%] text-[#fff]" />
      </div>
    </div>
  </div>
</template>
