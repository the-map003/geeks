<script setup lang="ts">
/**
 * Small multi-series line chart (SVG). Follows the data-viz method: 2px lines, ≥8px end
 * markers with a surface ring, hairline solid grid, legend for ≥2 series, crosshair
 * tooltip on hover, and a table-view twin so no value is gated behind hover.
 */
export interface Series {
  name: string;
  values: number[];
  /** categorical slot colour (validated order: blue, orange, aqua …) */
  color: string;
}

const props = withDefaults(defineProps<{ title: string; subtitle?: string; labels: string[]; series: Series[]; height?: number; area?: boolean }>(), { height: 220, area: false });

const width = 640;
const pad = { top: 16, right: 24, bottom: 28, left: 40 };
const plotW = width - pad.left - pad.right;
const plotH = computed(() => props.height - pad.top - pad.bottom);

const max = computed(() => Math.max(1, ...props.series.flatMap((s) => s.values)));
const niceMax = computed(() => {
  const m = max.value;
  const p = 10 ** Math.floor(Math.log10(m));
  const n = Math.ceil(m / p);
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
});
const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax.value * f)));
const x = (i: number) => pad.left + (props.labels.length <= 1 ? plotW / 2 : (i / (props.labels.length - 1)) * plotW);
const y = (v: number) => pad.top + plotH.value - (v / niceMax.value) * plotH.value;
const path = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
const areaPath = (values: number[]) => `${path(values)} L${x(values.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

const hover = ref<number | null>(null);
const svg = ref<SVGSVGElement | null>(null);
function onMove(e: MouseEvent) {
  const el = svg.value;
  if (!el || props.labels.length === 0) return;
  const rect = el.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * width;
  const i = Math.round(((px - pad.left) / plotW) * (props.labels.length - 1));
  hover.value = Math.min(props.labels.length - 1, Math.max(0, i));
}
const table = ref(false);
const xLabelEvery = computed(() => Math.max(1, Math.ceil(props.labels.length / 6)));
const fmt = (n: number) => n.toLocaleString('en-US');
const shortDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
</script>

<template>
  <div class="rounded-lg border border-line bg-surface p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-ink">{{ title }}</h3>
        <p v-if="subtitle" class="text-xs text-ink-muted">{{ subtitle }}</p>
      </div>
      <button type="button" class="text-xs font-medium text-ink-muted hover:text-ink" @click="table = !table">{{ table ? 'Chart view' : 'Table view' }}</button>
    </div>

    <div v-if="series.length >= 2" class="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted">
      <span v-for="s in series" :key="s.name" class="inline-flex items-center gap-1.5"><span class="inline-block h-0.5 w-4 rounded" :style="{ backgroundColor: s.color }" /> {{ s.name }}</span>
    </div>

    <div v-if="table" class="mt-3 max-h-64 overflow-auto rounded border border-line">
      <table class="w-full text-xs tabular-nums">
        <thead class="sticky top-0 bg-surface-muted text-left text-ink-muted"><tr><th class="px-2 py-1">Date</th><th v-for="s in series" :key="s.name" class="px-2 py-1 text-right">{{ s.name }}</th></tr></thead>
        <tbody class="divide-y divide-line"><tr v-for="(l, i) in labels" :key="l"><td class="px-2 py-1 text-ink">{{ l }}</td><td v-for="s in series" :key="s.name" class="px-2 py-1 text-right text-ink">{{ fmt(s.values[i] ?? 0) }}</td></tr></tbody>
      </table>
    </div>

    <div v-else class="relative mt-2">
      <svg ref="svg" :viewBox="`0 0 ${width} ${height}`" class="h-auto w-full" role="img" :aria-label="title" @mousemove="onMove" @mouseleave="hover = null">
        <g v-for="t in ticks" :key="t">
          <line :x1="pad.left" :x2="width - pad.right" :y1="y(t)" :y2="y(t)" stroke="#e5e7eb" stroke-width="1" />
          <text :x="pad.left - 6" :y="y(t) + 3" text-anchor="end" font-size="10" fill="#898781" style="font-variant-numeric: tabular-nums">{{ fmt(t) }}</text>
        </g>
        <line :x1="pad.left" :x2="width - pad.right" :y1="y(0)" :y2="y(0)" stroke="#c3c2b7" stroke-width="1" />
        <g v-for="(l, i) in labels" :key="l">
          <text v-if="i % xLabelEvery === 0 || i === labels.length - 1" :x="x(i)" :y="height - 8" text-anchor="middle" font-size="10" fill="#898781">{{ shortDate(l) }}</text>
        </g>
        <g v-for="s in series" :key="s.name">
          <path v-if="area && series.length === 1" :d="areaPath(s.values)" :fill="s.color" fill-opacity="0.1" />
          <path :d="path(s.values)" fill="none" :stroke="s.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          <circle v-if="s.values.length" :cx="x(s.values.length - 1)" :cy="y(s.values[s.values.length - 1]!)" r="5" :fill="s.color" stroke="#ffffff" stroke-width="2" />
          <text v-if="s.values.length" :x="x(s.values.length - 1) + 8" :y="y(s.values[s.values.length - 1]!) + 3" font-size="10" fill="#52514e" style="font-variant-numeric: tabular-nums">{{ fmt(s.values[s.values.length - 1]!) }}</text>
        </g>
        <g v-if="hover !== null">
          <line :x1="x(hover)" :x2="x(hover)" :y1="pad.top" :y2="y(0)" stroke="#898781" stroke-width="1" />
          <circle v-for="s in series" :key="s.name" :cx="x(hover)" :cy="y(s.values[hover] ?? 0)" r="5" :fill="s.color" stroke="#ffffff" stroke-width="2" />
        </g>
      </svg>
      <div v-if="hover !== null" class="pointer-events-none absolute top-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs shadow" :style="{ left: `${Math.min(80, Math.max(0, (x(hover) / width) * 100))}%`, transform: 'translateX(-50%)' }">
        <p class="font-semibold text-ink">{{ shortDate(labels[hover]!) }}</p>
        <p v-for="s in series" :key="s.name" class="flex items-center gap-1.5 text-ink-muted"><span class="inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: s.color }" /> {{ s.name }}: <span class="font-medium text-ink tabular-nums">{{ fmt(s.values[hover] ?? 0) }}</span></p>
      </div>
    </div>
  </div>
</template>
