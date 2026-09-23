<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    options: SelectOption[];
    label?: string;
    placeholder?: string;
    error?: string | null;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
  }>(),
  { required: false, disabled: false, size: 'md' },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const id = useId();
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="mb-1.5 block text-sm font-medium text-ink">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </label>
    <div class="relative">
      <select
        :id="id"
        :value="modelValue ?? ''"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error || undefined"
        class="block w-full appearance-none rounded-md border bg-surface pr-9 text-sm text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:bg-surface-muted"
        :class="[error ? 'border-red-400' : 'border-line focus:border-brand-500', size === 'sm' ? 'py-1.5 pl-2.5' : 'py-2 pl-3']"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled">{{ opt.label }}</option>
      </select>
      <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
    </div>
    <p v-if="error" class="mt-1.5 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-ink-muted">{{ hint }}</p>
  </div>
</template>
