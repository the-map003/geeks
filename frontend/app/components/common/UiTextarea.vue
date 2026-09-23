<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string | null | undefined;
    label?: string;
    placeholder?: string;
    hint?: string;
    error?: string | null;
    required?: boolean;
    disabled?: boolean;
    rows?: number;
    maxlength?: number;
    mono?: boolean;
    showCount?: boolean;
  }>(),
  { rows: 4, required: false, disabled: false, mono: false, showCount: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const id = useId();
const length = computed(() => (props.modelValue ?? '').length);
</script>

<template>
  <div>
    <div v-if="label || (showCount && maxlength)" class="mb-1.5 flex items-baseline justify-between">
      <label v-if="label" :for="id" class="block text-sm font-medium text-ink">
        {{ label }}<span v-if="required" class="text-red-500"> *</span>
      </label>
      <span v-if="showCount && maxlength" class="text-xs" :class="length > maxlength * 0.9 ? 'text-amber-600' : 'text-ink-muted'">
        {{ length }}/{{ maxlength }}
      </span>
    </div>
    <textarea
      :id="id"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      :maxlength="maxlength"
      :aria-invalid="!!error || undefined"
      class="block w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink shadow-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:bg-surface-muted"
      :class="[error ? 'border-red-400 focus:border-red-500' : 'border-line focus:border-brand-500', mono ? 'font-mono text-[13px] leading-relaxed' : '']"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" class="mt-1.5 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-ink-muted">{{ hint }}</p>
  </div>
</template>
