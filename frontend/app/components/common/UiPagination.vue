<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = withDefaults(defineProps<{ page: number; totalPages: number; total?: number; pageSize?: number; siblings?: number }>(), {
  siblings: 1,
});
const emit = defineEmits<{ 'update:page': [page: number] }>();

const pages = computed<(number | 'dots')[]>(() => {
  const { page, totalPages, siblings } = props;
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const range: (number | 'dots')[] = [1];
  const start = Math.max(2, page - siblings);
  const end = Math.min(totalPages - 1, page + siblings);
  if (start > 2) range.push('dots');
  for (let i = start; i <= end; i++) range.push(i);
  if (end < totalPages - 1) range.push('dots');
  range.push(totalPages);
  return range;
});

const rangeText = computed(() => {
  if (!props.total || !props.pageSize) return '';
  const from = (props.page - 1) * props.pageSize + 1;
  const to = Math.min(props.total, props.page * props.pageSize);
  return `${from}–${to} of ${props.total}`;
});

function go(p: number) {
  if (p < 1 || p > props.totalPages || p === props.page) return;
  emit('update:page', p);
}
</script>

<template>
  <nav v-if="totalPages > 1" class="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
    <p v-if="rangeText" class="text-sm text-ink-muted">{{ rangeText }}</p>
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="go(page - 1)"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === 'dots'" class="px-1 text-ink-muted">…</span>
        <button
          v-else
          type="button"
          class="inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium"
          :class="p === page ? 'border-brand-500 bg-brand-500 text-white' : 'border-line text-ink hover:bg-surface-muted'"
          :aria-current="p === page ? 'page' : undefined"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page >= totalPages"
        aria-label="Next page"
        @click="go(page + 1)"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </nav>
</template>
