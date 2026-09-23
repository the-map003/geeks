<script setup lang="ts">
import type * as Monaco from 'monaco-editor';
import type { Language } from '~/types/api';
import { LANGUAGE_MONACO } from '~/utils/format';

const props = withDefaults(defineProps<{ modelValue: string; language: Language; theme?: 'light' | 'dark'; fontSize?: number; readOnly?: boolean }>(), {
  theme: 'dark',
  fontSize: 14,
  readOnly: false,
});
const emit = defineEmits<{ 'update:modelValue': [value: string]; ready: [] }>();

const container = ref<HTMLElement | null>(null);
let monaco: typeof Monaco | null = null;
let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
let suppress = false;
const loading = ref(true);
const failed = ref(false);

async function loadMonaco(): Promise<typeof Monaco> {
  // Monaco 0.56 ESM layout: `monaco-editor/<path>` maps to esm/vs/<path>.js (see package exports).
  const [{ default: EditorWorker }, m] = await Promise.all([
    import('monaco-editor/editor/editor.worker?worker'),
    import('monaco-editor/editor/editor.api'),
  ]);
  await Promise.all([
    import('monaco-editor/languages/definitions/python/register'),
    import('monaco-editor/languages/definitions/javascript/register'),
    import('monaco-editor/languages/definitions/cpp/register'),
    import('monaco-editor/languages/definitions/java/register'),
  ]);
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
  };
  return m as unknown as typeof Monaco;
}

onMounted(async () => {
  try {
    const m = await loadMonaco();
    monaco = m;
    if (!container.value) return;
    m.editor.defineTheme('gfg-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#0f172a', 'editorLineNumber.foreground': '#475569', 'editor.lineHighlightBackground': '#1e293b' },
    });
    editor = m.editor.create(container.value, {
      value: props.modelValue,
      language: LANGUAGE_MONACO[props.language],
      theme: props.theme === 'dark' ? 'gfg-dark' : 'vs',
      fontSize: props.fontSize,
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      tabSize: 4,
      insertSpaces: true,
      wordWrap: 'off',
      readOnly: props.readOnly,
      padding: { top: 12, bottom: 12 },
      renderLineHighlight: 'line',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      bracketPairColorization: { enabled: true },
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    });
    editor.onDidChangeModelContent(() => {
      if (suppress) return;
      emit('update:modelValue', editor!.getValue());
    });
    loading.value = false;
    emit('ready');
  } catch (err) {
    console.error('Failed to load Monaco editor', err);
    failed.value = true;
    loading.value = false;
  }
});

watch(
  () => props.modelValue,
  (v) => {
    if (editor && editor.getValue() !== v) {
      suppress = true;
      const pos = editor.getPosition();
      editor.setValue(v);
      if (pos) editor.setPosition(pos);
      suppress = false;
    }
  },
);
watch(
  () => props.language,
  (lang) => {
    const model = editor?.getModel();
    if (monaco && model) monaco.editor.setModelLanguage(model, LANGUAGE_MONACO[lang]);
  },
);
watch(() => props.theme, (t) => monaco?.editor.setTheme(t === 'dark' ? 'gfg-dark' : 'vs'));
watch(() => props.fontSize, (size) => editor?.updateOptions({ fontSize: size }));
watch(() => props.readOnly, (ro) => editor?.updateOptions({ readOnly: ro }));

onBeforeUnmount(() => {
  editor?.dispose();
  editor = null;
});

defineExpose({ focus: () => editor?.focus() });
</script>

<template>
  <div class="relative h-full w-full" :class="theme === 'dark' ? 'bg-[#0f172a]' : 'bg-surface'">
    <div ref="container" class="h-full w-full" />
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center" :class="theme === 'dark' ? 'text-ink-faint' : 'text-ink-muted'">
      <UiSpinner label="Loading editor…" />
    </div>
    <div v-if="failed" class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-300">
      <p>The code editor could not be loaded.</p>
      <textarea class="h-full w-full flex-1 rounded-md border border-line-strong bg-[#0f172a] p-3 font-mono text-gray-100" :value="modelValue" :readonly="readOnly" @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" />
    </div>
  </div>
</template>
