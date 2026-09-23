<script setup lang="ts">
import { AlertTriangle, RefreshCw } from 'lucide-vue-next';

withDefaults(defineProps<{ title?: string; message?: string; retryLabel?: string; compact?: boolean }>(), {
  title: 'Something went wrong',
  message: 'We could not load this content. Please try again.',
  retryLabel: 'Try again',
  compact: false,
});
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/60 text-center" :class="compact ? 'px-4 py-8' : 'px-6 py-14'">
    <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-red-600 shadow-sm ring-1 ring-red-200">
      <AlertTriangle class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="text-base font-semibold text-ink">{{ title }}</h3>
    <p class="mt-1 max-w-sm text-sm text-ink-muted">{{ message }}</p>
    <UiButton variant="secondary" size="sm" class="mt-4" @click="emit('retry')">
      <RefreshCw class="h-4 w-4" />
      {{ retryLabel }}
    </UiButton>
  </div>
</template>
