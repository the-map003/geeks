<script setup lang="ts">
import type { Component } from 'vue';
import { Binary, Brain, Cloud, Coffee, Code2, Database, GraduationCap, Network, Server, Globe, Cpu } from 'lucide-vue-next';

/**
 * Course header in the style of the reference course thumbnails: a soft pastel panel with a large
 * lighter disc behind an illustration, a red "LIVE COURSE" pill, the course's short name in heavy
 * uppercase type and a chip listing the technologies from the title's suffix. The illustration is a
 * small "window" card and a floating icon badge chosen from the course category.
 * A real cover image replaces all of this when one is set.
 */
const props = withDefaults(defineProps<{ title: string; src?: string | null; category?: string | null; icon?: Component; index?: number; rounded?: string }>(), {
  src: null,
  category: null,
  index: 0,
  rounded: 'rounded-t-[10px]',
});

const palettes = [
  { bg: 'linear-gradient(160deg,#ece7ff 0%,#d4c9ff 100%)', disc: '#c7b9ff', ink: '#141a33', chip: 'rgba(255,255,255,.7)', accent: '#6b46ff' }, // lavender
  { bg: 'linear-gradient(160deg,#dcf3ff 0%,#bfe2ff 100%)', disc: '#a9d3fb', ink: '#0f2f4f', chip: 'rgba(255,255,255,.7)', accent: '#1e6fd9' }, // sky
  { bg: 'linear-gradient(160deg,#e3f6ea 0%,#c6ead6 100%)', disc: '#a7ddc0', ink: '#0f3b28', chip: 'rgba(255,255,255,.7)', accent: '#1f8a4f' }, // mint
  { bg: 'linear-gradient(160deg,#ffe6ee 0%,#ffcbdb 100%)', disc: '#f9b3c9', ink: '#4a1630', chip: 'rgba(255,255,255,.7)', accent: '#d63a6a' }, // rose
  { bg: 'linear-gradient(160deg,#fff0dc 0%,#ffd9b0 100%)', disc: '#f7c896', ink: '#4a2e0c', chip: 'rgba(255,255,255,.7)', accent: '#d9791e' }, // peach
  { bg: 'linear-gradient(160deg,#f5e2ff 0%,#e2c6ff 100%)', disc: '#d3b0f7', ink: '#341a57', chip: 'rgba(255,255,255,.7)', accent: '#8a3ffc' }, // lilac
];
const palette = computed(() => palettes[props.index % palettes.length]!);

const categoryIcons: Record<string, Component> = {
  dsa: Binary,
  'web-development': Globe,
  'ai-ml': Brain,
  'machine-learning': Brain,
  'data-science': Brain,
  'system-design': Network,
  devops: Cloud,
  java: Coffee,
  python: Code2,
  javascript: Code2,
  'programming-languages': Code2,
  databases: Database,
  'cs-subjects': Cpu,
  linux: Server,
};
const badgeIcon = computed(() => props.icon ?? (props.category ? categoryIcons[props.category] : undefined) ?? GraduationCap);

/** "DSA & System Design Course - SDE Interview Prep" -> head "DSA & System Design", chip "SDE Interview Prep". */
const parts = computed(() => {
  const [left = props.title, right = ''] = props.title.split(/\s+-\s+/, 2);
  const head = left.replace(/\s+Course\b.*$/i, '').trim();
  const chip = right
    .replace(/\s*(,|&|\band\b|\bwith\b)\s*/gi, ' • ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^•\s*|\s*•$/g, '')
    .trim();
  return { head, chip };
});
</script>

<template>
  <div class="relative h-[162px] w-full overflow-hidden bg-surface-muted" :class="rounded">
    <img v-if="src" :src="src" alt="course-img" class="h-full w-full object-cover" loading="lazy" />
    <div v-else class="relative h-full w-full" :style="{ background: palette.bg }" aria-hidden="true">
      <!-- large disc behind the illustration -->
      <div class="absolute -right-10 -top-6 h-[210px] w-[210px] rounded-full opacity-70" :style="{ background: palette.disc }" />

      <!-- live pill -->
      <span class="absolute left-3.5 top-3.5 inline-flex h-[18px] items-center gap-1 rounded-[3px] bg-[#e0132d] px-1.5 text-[9px] font-extrabold uppercase tracking-wide text-[#fff]">
        <span class="inline-block h-[7px] w-[9px] rounded-[1px] border border-[#fff]" /><span class="-ml-1 inline-block h-[3px] w-[3px] rounded-full bg-[#fff]" />Live course
      </span>

      <!-- short name + technology chip -->
      <div class="absolute bottom-4 left-3.5 top-10 flex w-[58%] flex-col justify-center">
        <span class="font-heading text-[22px] font-black uppercase leading-[24px] tracking-tight" :style="{ color: palette.ink }">{{ parts.head }}</span>
        <span v-if="parts.chip" class="mt-2 w-max max-w-full truncate rounded-[4px] px-2 py-[3px] text-[9.5px] font-bold" :style="{ background: palette.chip, color: palette.ink }">{{ parts.chip }}</span>
      </div>

      <!-- illustration: a small app window and a floating icon badge -->
      <div class="absolute right-[18px] top-[34px] h-[96px] w-[112px] rotate-[-4deg] overflow-hidden rounded-[7px] bg-[#fff] shadow-[0_10px_24px_rgba(20,26,51,0.18)]">
        <div class="flex h-[14px] items-center gap-1 px-1.5" :style="{ background: palette.disc }">
          <span class="h-1.5 w-1.5 rounded-full bg-[#fff]/90" /><span class="h-1.5 w-1.5 rounded-full bg-[#fff]/70" /><span class="h-1.5 w-1.5 rounded-full bg-[#fff]/50" />
        </div>
        <div class="space-y-[5px] p-2">
          <span class="block h-[5px] w-[60%] rounded-full" :style="{ background: palette.disc }" />
          <span class="block h-[5px] w-[85%] rounded-full bg-[#e6e6ee]" />
          <span class="block h-[5px] w-[45%] rounded-full" :style="{ background: palette.accent, opacity: 0.55 }" />
          <span class="block h-[5px] w-[70%] rounded-full bg-[#e6e6ee]" />
          <span class="block h-[5px] w-[55%] rounded-full bg-[#e6e6ee]" />
        </div>
      </div>
      <div class="absolute bottom-[14px] right-[8px] flex h-11 w-11 items-center justify-center rounded-[10px] shadow-[0_8px_18px_rgba(20,26,51,0.22)]" :style="{ background: palette.accent }">
        <component :is="badgeIcon" class="h-6 w-6 text-[#fff]" />
      </div>
      <div class="absolute right-[124px] top-[22px] h-6 w-6 rounded-[6px] bg-[#fff]/80 shadow-sm" />
    </div>
  </div>
</template>
