<script setup lang="ts">
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-vue-next';

type Tone = 'info' | 'success' | 'warning' | 'error';

withDefaults(defineProps<{ tone?: Tone; title?: string; dismissible?: boolean }>(), { tone: 'info', dismissible: false });
const emit = defineEmits<{ dismiss: [] }>();

const toneClass: Record<Tone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-green-200 bg-green-50 text-green-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};
const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: AlertCircle };
</script>

<template>
  <div role="alert" class="flex gap-3 rounded-lg border p-3.5 text-sm" :class="toneClass[tone]">
    <component :is="icons[tone]" class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <div :class="title ? 'mt-0.5 opacity-90' : ''"><slot /></div>
    </div>
    <button v-if="dismissible" type="button" class="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss" @click="emit('dismiss')">
      <X class="h-4 w-4" />
    </button>
  </div>
</template>
