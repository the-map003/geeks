<script setup lang="ts">
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-vue-next';

const ui = useUiStore();
const icons = { success: CheckCircle2, error: AlertCircle, info: Info, warning: AlertTriangle };
const toneClass = {
  success: 'border-green-200 text-green-700',
  error: 'border-red-200 text-red-700',
  info: 'border-sky-200 text-sky-700',
  warning: 'border-amber-200 text-amber-700',
};
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6" aria-live="polite">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface p-3.5 shadow-lg"
          :class="toneClass[toast.type]"
          role="status"
        >
          <component :is="icons[toast.type]" class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div class="min-w-0 flex-1 text-sm">
            <p class="font-semibold text-ink">{{ toast.title }}</p>
            <p v-if="toast.message" class="mt-0.5 text-ink-muted">{{ toast.message }}</p>
          </div>
          <button type="button" class="-mr-1 rounded p-0.5 text-ink-muted hover:text-ink" aria-label="Dismiss" @click="ui.dismiss(toast.id)">
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
