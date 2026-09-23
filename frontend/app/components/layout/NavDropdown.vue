<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';

defineProps<{ label: string; width?: string }>();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
function show() {
  if (timer) clearTimeout(timer);
  open.value = true;
}
function hideSoon() {
  timer = setTimeout(() => (open.value = false), 120);
}
onClickOutside(root, () => (open.value = false));
const route = useRoute();
watch(() => route.fullPath, () => (open.value = false));
</script>

<template>
  <div ref="root" class="relative" @mouseenter="show" @mouseleave="hideSoon">
    <button
      type="button"
      class="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[16px] font-semibold text-ink-heading transition hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="open = !open"
    >
      {{ label }}
      <ChevronDown class="h-4 w-4 transition-transform" :class="open ? 'rotate-180' : ''" aria-hidden="true" />
    </button>
    <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="translate-y-1 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="open" class="absolute left-0 top-full z-40 mt-1 rounded-xl border border-line bg-surface p-2 shadow-xl" :class="width ?? 'w-64'">
        <slot />
      </div>
    </Transition>
  </div>
</template>
