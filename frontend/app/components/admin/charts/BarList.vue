<script setup lang="ts">
/** Horizontal single-series bar list: ≤24px bars, rounded data-end, square baseline, value at the tip. */
withDefaults(defineProps<{ title: string; subtitle?: string; items: Array<{ label: string; value: number; to?: string; hint?: string }>; color?: string }>(), { color: '#2a78d6' });
const fmt = (n: number) => n.toLocaleString('en-US');
</script>

<template>
  <div class="rounded-lg border border-line bg-surface p-4">
    <h3 class="text-sm font-semibold text-ink">{{ title }}</h3>
    <p v-if="subtitle" class="text-xs text-ink-muted">{{ subtitle }}</p>
    <ul v-if="items.length" class="mt-3 space-y-2.5">
      <li v-for="it in items" :key="it.label" class="text-xs">
        <div class="mb-1 flex items-baseline justify-between gap-2">
          <component :is="it.to ? 'NuxtLink' : 'span'" :to="it.to" class="truncate font-medium text-ink" :class="it.to ? 'hover:text-brand-700' : ''">{{ it.label }}</component>
          <span class="shrink-0 text-ink-muted tabular-nums">{{ fmt(it.value) }}<span v-if="it.hint"> · {{ it.hint }}</span></span>
        </div>
        <div class="h-2.5 w-full rounded-r bg-transparent" :title="`${it.label}: ${fmt(it.value)}`">
          <div class="h-full rounded-r" :style="{ width: `${Math.max(2, (it.value / Math.max(1, Math.max(...items.map((x) => x.value)))) * 100)}%`, backgroundColor: color }" />
        </div>
      </li>
    </ul>
    <p v-else class="mt-3 text-xs text-ink-muted">No data yet.</p>
  </div>
</template>
