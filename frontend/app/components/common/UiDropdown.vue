<script setup lang="ts">
import { onClickOutside, onKeyStroke } from '@vueuse/core';

withDefaults(defineProps<{ align?: 'left' | 'right'; width?: string }>(), { align: 'right', width: 'w-56' });

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function toggle() {
  open.value = !open.value;
}
function close() {
  open.value = false;
}

onClickOutside(root, close);
onKeyStroke('Escape', () => {
  if (open.value) close();
});

defineExpose({ close, open: () => (open.value = true) });
</script>

<template>
  <div ref="root" class="relative inline-block text-left">
    <div @click="toggle">
      <slot name="trigger" :open="open" />
    </div>
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="open"
        class="absolute z-40 mt-2 origin-top rounded-lg border border-line bg-surface p-1 shadow-lg focus:outline-none"
        :class="[width, align === 'right' ? 'right-0' : 'left-0']"
        role="menu"
        @click="close"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
