<script setup lang="ts">
import type { TocItem } from '~/utils/markdown';
import { ChevronDown, List } from 'lucide-vue-next';

const props = withDefaults(defineProps<{ items: TocItem[]; collapsible?: boolean }>(), { collapsible: false });

const activeId = ref<string | null>(null);
const open = ref(!props.collapsible);
let observer: IntersectionObserver | null = null;

function observe() {
  observer?.disconnect();
  if (!import.meta.client || !props.items.length) return;
  const headings = props.items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) activeId.value = visible[0].target.id;
    },
    { rootMargin: '-96px 0px -70% 0px', threshold: [0, 1] },
  );
  headings.forEach((h) => observer!.observe(h));
}

onMounted(() => nextTick(observe));
watch(() => props.items, () => nextTick(observe), { deep: true });
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <nav v-if="items.length" aria-label="Table of contents" class="rounded-lg border border-line bg-surface">
    <button
      v-if="collapsible"
      type="button"
      class="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-ink"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="inline-flex items-center gap-2"><List class="h-4 w-4 text-ink-muted" /> Table of contents</span>
      <ChevronDown class="h-4 w-4 text-ink-muted transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>
    <p v-else class="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">On this page</p>
    <ul v-show="open" class="space-y-0.5 px-2 pb-3 pt-2 text-sm">
      <li v-for="item in items" :key="item.id">
        <a
          :href="`#${item.id}`"
          class="block truncate rounded-md py-1 pr-2 transition"
          :class="[
            item.level === 3 ? 'pl-6 text-[13px]' : 'pl-3',
            activeId === item.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
          ]"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
