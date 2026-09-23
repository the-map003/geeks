<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    label?: string;
    type?: string;
    placeholder?: string;
    hint?: string;
    error?: string | null;
    required?: boolean;
    disabled?: boolean;
    autocomplete?: string;
    name?: string;
    maxlength?: number;
    min?: number | string;
    max?: number | string;
    step?: number | string;
  }>(),
  { type: 'text', required: false, disabled: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const id = useId();
const reveal = ref(false);
const inputType = computed(() => (props.type === 'password' && reveal.value ? 'text' : props.type));
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="mb-1.5 block text-sm font-medium text-ink">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        :name="name"
        :type="inputType"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :step="step"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
        class="block w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink shadow-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:bg-surface-muted disabled:text-ink-muted"
        :class="[error ? 'border-red-400 focus:border-red-500' : 'border-line focus:border-brand-500', type === 'password' ? 'pr-10' : '']"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink"
        :aria-label="reveal ? 'Hide password' : 'Show password'"
        @click="reveal = !reveal"
      >
        <EyeOff v-if="reveal" class="h-4 w-4" />
        <Eye v-else class="h-4 w-4" />
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="mt-1.5 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="mt-1.5 text-xs text-ink-muted">{{ hint }}</p>
  </div>
</template>
