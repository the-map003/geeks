<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { onKeyStroke, useScrollLock } from '@vueuse/core';

const props = withDefaults(
  defineProps<{ modelValue: boolean; title?: string; description?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; closable?: boolean }>(),
  { size: 'md', closable: true },
);
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; close: [] }>();

const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
const panel = ref<HTMLElement | null>(null);

const body = import.meta.client ? document.body : null;
const locked = useScrollLock(body);

function close() {
  if (!props.closable) return;
  emit('update:modelValue', false);
  emit('close');
}

onKeyStroke('Escape', () => {
  if (props.modelValue) close();
});

watch(
  () => props.modelValue,
  (open) => {
    locked.value = open;
    if (open) nextTick(() => panel.value?.focus());
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  locked.value = false;
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" @click.self="close">
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          class="w-full rounded-t-2xl bg-surface shadow-xl focus:outline-none sm:rounded-xl"
          :class="sizeClass[size]"
        >
          <div v-if="title || closable" class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 v-if="title" class="text-lg font-semibold text-ink">{{ title }}</h2>
              <p v-if="description" class="mt-0.5 text-sm text-ink-muted">{{ description }}</p>
            </div>
            <button
              v-if="closable"
              type="button"
              class="-mr-1 rounded-md p-1 text-ink-muted hover:bg-surface-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Close"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="px-5 py-4">
            <slot />
          </div>
          <div v-if="$slots.footer" class="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
