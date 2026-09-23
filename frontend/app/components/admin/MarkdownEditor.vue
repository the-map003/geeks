<script setup lang="ts">
import { Code2, Eye } from 'lucide-vue-next';

const props = withDefaults(defineProps<{ modelValue: string; label?: string; rows?: number; error?: string | null; hint?: string; required?: boolean }>(), { rows: 16, required: false });
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();
const mode = ref<'write' | 'preview'>('write');
const id = useId();

function insert(before: string, after = '') {
  const el = document.getElementById(id) as HTMLTextAreaElement | null;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = props.modelValue.slice(start, end);
  const next = props.modelValue.slice(0, start) + before + selected + after + props.modelValue.slice(end);
  emit('update:modelValue', next);
  nextTick(() => {
    el.focus();
    el.setSelectionRange(start + before.length, start + before.length + selected.length);
  });
}
</script>

<template>
  <div>
    <div class="mb-1.5 flex items-center justify-between">
      <label v-if="label" :for="id" class="text-sm font-medium text-ink">{{ label }}<span v-if="required" class="text-red-500"> *</span></label>
      <div class="flex items-center gap-1">
        <button type="button" class="rounded px-2 py-1 text-xs font-medium" :class="mode === 'write' ? 'bg-ink text-page' : 'text-ink-muted hover:bg-surface-strong'" @click="mode = 'write'"><Code2 class="mr-1 inline h-3.5 w-3.5" /> Write</button>
        <button type="button" class="rounded px-2 py-1 text-xs font-medium" :class="mode === 'preview' ? 'bg-ink text-page' : 'text-ink-muted hover:bg-surface-strong'" @click="mode = 'preview'"><Eye class="mr-1 inline h-3.5 w-3.5" /> Preview</button>
      </div>
    </div>
    <div v-if="mode === 'write'" class="overflow-hidden rounded-md border" :class="error ? 'border-red-400' : 'border-line'">
      <div class="flex flex-wrap gap-1 border-b border-line bg-surface-muted px-2 py-1 text-xs">
        <button v-for="b in [['## ', '', 'H2'], ['### ', '', 'H3'], ['**', '**', 'Bold'], ['_', '_', 'Italic'], ['`', '`', 'Code'], ['\n```python\n', '\n```\n', 'Code block'], ['\n::: tabs\n```python\n\n```\n```javascript\n\n```\n:::\n', '', 'Code tabs'], ['- ', '', 'List'], ['> ', '', 'Quote'], ['[', '](https://)', 'Link']]" :key="b[2]" type="button" class="rounded px-2 py-1 font-medium text-ink-muted hover:bg-surface hover:text-ink" @click="insert(b[0]!, b[1]!)">{{ b[2] }}</button>
      </div>
      <textarea :id="id" :value="modelValue" :rows="rows" class="block w-full resize-y border-0 p-3 font-mono text-[13px] leading-relaxed focus:outline-none" spellcheck="false" @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" />
    </div>
    <div v-else class="min-h-[200px] rounded-md border border-line bg-surface p-4">
      <MarkdownContent v-if="modelValue.trim()" :source="modelValue" compact />
      <p v-else class="text-sm text-ink-muted">Nothing to preview yet.</p>
    </div>
    <p v-if="error" class="mt-1.5 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-ink-muted">{{ hint }}</p>
  </div>
</template>
