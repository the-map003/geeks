<script setup lang="ts">
import { ChevronDown, ChevronUp, Terminal } from 'lucide-vue-next';
import type { RunResult, Submission, TestResult } from '~/types/api';

const props = defineProps<{
  sampleTests: Array<{ id: string; input: string; expectedOutput: string }>;
  runResult: RunResult | null;
  submission: Submission | null;
  running: boolean;
  submitting: boolean;
  collapsed: boolean;
}>();
const emit = defineEmits<{ 'update:collapsed': [v: boolean]; 'update:customInput': [v: string] }>();

const tab = ref<'tests' | 'result'>('tests');
const selectedTest = ref(0);
const customInput = ref('');
const useCustom = ref(false);
watch(customInput, (v) => emit('update:customInput', useCustom.value ? v : ''));
watch(useCustom, (v) => emit('update:customInput', v ? customInput.value : ''));

watch(
  () => [props.runResult, props.submission],
  () => {
    if (props.runResult || props.submission) {
      tab.value = 'result';
      emit('update:collapsed', false);
      selectedTest.value = 0;
    }
  },
);

const results = computed<TestResult[]>(() => props.submission?.testResults ?? props.runResult?.results ?? []);
const overall = computed(() => props.submission?.status ?? props.runResult?.status ?? null);
const compileOutput = computed(() => props.submission?.compileOutput ?? props.runResult?.compileOutput ?? null);
const selectedResult = computed(() => results.value[selectedTest.value] ?? null);
const passed = computed(() => results.value.filter((r) => r.status === 'ACCEPTED').length);
</script>

<template>
  <div class="flex flex-col border-t border-line bg-surface" :class="collapsed ? 'h-11' : 'h-72'">
    <div class="flex h-11 shrink-0 items-center gap-1 border-b border-line px-2">
      <button type="button" class="px-3 py-1.5 text-sm font-medium" :class="tab === 'tests' ? 'border-b-2 border-brand-500 text-brand-700' : 'text-ink-muted hover:text-ink'" @click="tab = 'tests'; emit('update:collapsed', false)">Test cases</button>
      <button type="button" class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium" :class="tab === 'result' ? 'border-b-2 border-brand-500 text-brand-700' : 'text-ink-muted hover:text-ink'" @click="tab = 'result'; emit('update:collapsed', false)">
        Result
        <StatusBadge v-if="overall && !running && !submitting" :status="overall" size="xs" />
        <UiSpinner v-else-if="running || submitting" size="sm" />
      </button>
      <div class="flex-1" />
      <button type="button" class="rounded-md p-1.5 text-ink-muted hover:bg-surface-strong" :aria-label="collapsed ? 'Expand console' : 'Collapse console'" @click="emit('update:collapsed', !collapsed)">
        <ChevronUp v-if="collapsed" class="h-4 w-4" /><ChevronDown v-else class="h-4 w-4" />
      </button>
    </div>

    <div v-if="!collapsed" class="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
      <!-- Test cases -->
      <div v-if="tab === 'tests'" class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <button v-for="(t, i) in sampleTests" :key="t.id" type="button" class="rounded-md px-3 py-1 text-xs font-semibold" :class="!useCustom && selectedTest === i ? 'bg-ink text-page' : 'bg-surface-muted text-ink hover:bg-surface-strong'" @click="useCustom = false; selectedTest = i">Case {{ i + 1 }}</button>
          <button type="button" class="rounded-md px-3 py-1 text-xs font-semibold" :class="useCustom ? 'bg-ink text-page' : 'bg-surface-muted text-ink hover:bg-surface-strong'" @click="useCustom = true">Custom input</button>
        </div>
        <div v-if="useCustom">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Custom stdin</label>
          <textarea v-model="customInput" rows="5" class="w-full rounded-md border border-line bg-surface-muted p-2 font-mono text-[13px] focus:border-brand-500 focus:outline-none" placeholder="Type input exactly as the program expects…" />
          <p class="mt-1 text-xs text-ink-muted">Run uses this input instead of the sample tests. Expected output is not checked.</p>
        </div>
        <div v-else-if="sampleTests[selectedTest]" class="grid gap-3 sm:grid-cols-2">
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Input</p>
            <pre class="whitespace-pre-wrap rounded-md bg-surface-muted p-2 font-mono text-[13px]">{{ sampleTests[selectedTest]?.input.trimEnd() }}</pre>
          </div>
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Expected output</p>
            <pre class="whitespace-pre-wrap rounded-md bg-surface-muted p-2 font-mono text-[13px]">{{ sampleTests[selectedTest]?.expectedOutput.trimEnd() }}</pre>
          </div>
        </div>
        <UiEmptyState v-else title="No sample tests" description="Use a custom input to try your code." compact :icon="Terminal" />
      </div>

      <!-- Result -->
      <div v-else class="space-y-3">
        <div v-if="running || submitting" class="flex items-center gap-3 py-4 text-ink-muted"><UiSpinner /> {{ submitting ? 'Judging your submission against all test cases…' : 'Running your code…' }}</div>
        <template v-else-if="overall">
          <div class="flex flex-wrap items-center gap-3">
            <StatusBadge :status="overall" size="md" />
            <span v-if="results.length" class="text-sm text-ink-muted">{{ passed }}/{{ results.length }} test cases passed</span>
            <span v-if="submission?.runtimeMs != null" class="text-sm text-ink-muted">· {{ submission.runtimeMs }} ms</span>
          </div>
          <div v-if="compileOutput" class="rounded-md border border-purple-200 bg-purple-50 p-3">
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-800">Compilation output</p>
            <pre class="whitespace-pre-wrap font-mono text-[12.5px] text-purple-900">{{ compileOutput }}</pre>
          </div>
          <div v-if="submission?.errorMessage && !compileOutput" class="rounded-md border border-red-200 bg-red-50 p-3">
            <pre class="whitespace-pre-wrap font-mono text-[12.5px] text-red-800">{{ submission.errorMessage }}</pre>
          </div>
          <div v-if="results.length" class="flex flex-wrap gap-1.5">
            <button
              v-for="(r, i) in results"
              :key="r.id"
              type="button"
              class="rounded-md border px-2.5 py-1 text-xs font-semibold"
              :class="[
                selectedTest === i ? 'ring-2 ring-brand-500 ring-offset-1' : '',
                r.status === 'ACCEPTED' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700',
              ]"
              @click="selectedTest = i"
            >
              {{ r.isSample ? 'Sample' : 'Hidden' }} {{ i + 1 }}
            </button>
          </div>
          <div v-if="selectedResult" class="space-y-2">
            <div class="flex items-center gap-2 text-xs text-ink-muted"><StatusBadge :status="selectedResult.status" size="xs" /> {{ selectedResult.runtimeMs }} ms</div>
            <div v-if="selectedResult.input !== undefined" class="grid gap-3 md:grid-cols-3">
              <div><p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Input</p><pre class="whitespace-pre-wrap rounded-md bg-surface-muted p-2 font-mono text-[12.5px]">{{ selectedResult.input?.trimEnd() }}</pre></div>
              <div v-if="selectedResult.expectedOutput !== undefined"><p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Expected</p><pre class="whitespace-pre-wrap rounded-md bg-surface-muted p-2 font-mono text-[12.5px]">{{ selectedResult.expectedOutput?.trimEnd() }}</pre></div>
              <div><p class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Your output</p><pre class="whitespace-pre-wrap rounded-md p-2 font-mono text-[12.5px]" :class="selectedResult.status === 'ACCEPTED' ? 'bg-green-50' : 'bg-red-50'">{{ (selectedResult.actualOutput ?? '').trimEnd() || '(empty)' }}</pre></div>
            </div>
            <p v-else-if="!selectedResult.isSample" class="text-xs text-ink-muted">Hidden test inputs and outputs are not shown.</p>
            <div v-if="selectedResult.stderr"><p class="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">stderr</p><pre class="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-red-50 p-2 font-mono text-[12.5px] text-red-800">{{ selectedResult.stderr }}</pre></div>
          </div>
        </template>
        <UiEmptyState v-else title="No results yet" description="Run your code against the sample tests or submit it to the judge." compact :icon="Terminal" />
      </div>
    </div>
  </div>
</template>
