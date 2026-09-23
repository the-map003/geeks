<script setup lang="ts">
export interface TabItem {
  value: string;
  label: string;
  count?: number | null;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{ tabs: TabItem[]; modelValue: string; variant?: 'underline' | 'pills'; size?: 'sm' | 'md'; scrollable?: boolean }>(),
  { variant: 'underline', size: 'md', scrollable: true },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const listRef = ref<HTMLElement | null>(null);

function select(tab: TabItem) {
  if (tab.disabled) return;
  emit('update:modelValue', tab.value);
}

function onKeydown(e: KeyboardEvent) {
  const enabled = props.tabs.filter((t) => !t.disabled);
  const idx = enabled.findIndex((t) => t.value === props.modelValue);
  if (idx === -1) return;
  let next = idx;
  if (e.key === 'ArrowRight') next = (idx + 1) % enabled.length;
  else if (e.key === 'ArrowLeft') next = (idx - 1 + enabled.length) % enabled.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = enabled.length - 1;
  else return;
  e.preventDefault();
  const target = enabled[next];
  if (target) {
    emit('update:modelValue', target.value);
    nextTick(() => {
      const el = listRef.value?.querySelector<HTMLElement>(`[data-tab="${target.value}"]`);
      el?.focus();
    });
  }
}
</script>

<template>
  <div
    ref="listRef"
    role="tablist"
    class="flex"
    :class="[
      variant === 'underline' ? 'border-b border-line gap-1' : 'gap-2',
      scrollable ? 'no-scrollbar overflow-x-auto' : 'flex-wrap',
    ]"
    @keydown="onKeydown"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :data-tab="tab.value"
      :aria-selected="tab.value === modelValue"
      :tabindex="tab.value === modelValue ? 0 : -1"
      :disabled="tab.disabled"
      class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
      :class="[
        size === 'sm' ? 'text-sm' : 'text-sm sm:text-[15px]',
        variant === 'underline'
          ? [
              '-mb-px border-b-2 px-3 py-2.5',
              tab.value === modelValue ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
            ]
          : [
              'rounded-full px-3.5 py-1.5 ring-1 ring-inset',
              tab.value === modelValue ? 'bg-ink text-page ring-ink' : 'bg-surface text-ink ring-line hover:bg-surface-muted',
            ],
      ]"
      @click="select(tab)"
    >
      {{ tab.label }}
      <span
        v-if="tab.count !== undefined && tab.count !== null"
        class="rounded-full px-1.5 py-0.5 text-[11px] leading-none"
        :class="tab.value === modelValue && variant === 'pills' ? 'bg-white/20 text-white' : 'bg-surface-muted text-ink-muted'"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
