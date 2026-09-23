<script setup lang="ts">
import { Eye, FlaskConical, Plus, Save, Trash2 } from 'lucide-vue-next';
import type { ContentStatus, Language, SubmissionStatus } from '~/types/api';
import { LANGUAGE_LABEL } from '~/utils/format';

const props = defineProps<{ id?: string | null }>();
const api = useApi();
const ui = useUiStore();
const auth = useAuthStore();
const { categoryOptions } = useAdminMeta();
const { errors, apply, clear } = useFormErrors();

interface AdminProblem {
  id: string; title: string; slug: string; description: string; difficulty: string; status: ContentStatus; categoryId: string | null;
  constraints: string | null; inputFormat: string | null; outputFormat: string | null; hints: string[]; editorial: string | null;
  expectedTimeComplexity: string | null; expectedSpaceComplexity: string | null; timeLimitMs: number; memoryLimitMb: number; points: number;
  companyTags: string[]; isProblemOfTheDay: boolean; topics: Array<{ name: string }>;
  examples: Array<{ input: string; output: string; explanation: string | null }>;
  starterCode: Array<{ language: Language; code: string }>;
  testCases: Array<{ input: string; expectedOutput: string; isSample: boolean; weight: number }>;
  _count: { submissions: number };
}

const languages: Language[] = ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'];
const form = reactive({
  title: '', slug: '', description: '', difficulty: 'EASY', categoryId: '', constraints: '', inputFormat: '', outputFormat: '', hints: [''] as string[], editorial: '',
  expectedTimeComplexity: '', expectedSpaceComplexity: '', timeLimitMs: 2000, memoryLimitMb: 256, points: 4, companyTags: '', topics: '', isProblemOfTheDay: false,
  examples: [] as Array<{ input: string; output: string; explanation: string }>,
  starterCode: Object.fromEntries(languages.map((l) => [l, ''])) as Record<Language, string>,
  testCases: [] as Array<{ input: string; expectedOutput: string; isSample: boolean; weight: number }>,
});
const problem = ref<AdminProblem | null>(null);
const loading = ref(!!props.id);
const saving = ref(false);
const tab = ref('statement');
const tabs = [
  { value: 'statement', label: 'Statement' },
  { value: 'examples', label: 'Examples' },
  { value: 'starter', label: 'Starter code' },
  { value: 'tests', label: 'Test cases' },
  { value: 'editorial', label: 'Editorial & hints' },
  { value: 'validate', label: 'Validate' },
];

async function load() {
  if (!props.id) return;
  loading.value = true;
  try {
    const res = await api.get<{ problem: AdminProblem }>(`/admin/problems/${props.id}`);
    const p = res.problem;
    problem.value = p;
    Object.assign(form, {
      title: p.title, slug: p.slug, description: p.description, difficulty: p.difficulty, categoryId: p.categoryId ?? '', constraints: p.constraints ?? '', inputFormat: p.inputFormat ?? '', outputFormat: p.outputFormat ?? '',
      hints: p.hints.length ? [...p.hints] : [''], editorial: p.editorial ?? '', expectedTimeComplexity: p.expectedTimeComplexity ?? '', expectedSpaceComplexity: p.expectedSpaceComplexity ?? '',
      timeLimitMs: p.timeLimitMs, memoryLimitMb: p.memoryLimitMb, points: p.points, companyTags: p.companyTags.join(', '), topics: p.topics.map((t) => t.name).join(', '), isProblemOfTheDay: p.isProblemOfTheDay,
      examples: p.examples.map((e) => ({ input: e.input, output: e.output, explanation: e.explanation ?? '' })),
      testCases: p.testCases.map((t) => ({ ...t })),
    });
    for (const l of languages) form.starterCode[l] = p.starterCode.find((s) => s.language === l)?.code ?? '';
  } catch (err) {
    ui.error('Failed to load problem', isApiError(err) ? err.message : undefined);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function payload() {
  return {
    title: form.title, slug: form.slug || undefined, description: form.description, difficulty: form.difficulty, categoryId: form.categoryId || null,
    constraints: form.constraints || null, inputFormat: form.inputFormat || null, outputFormat: form.outputFormat || null,
    hints: form.hints.map((h) => h.trim()).filter(Boolean), editorial: form.editorial || null,
    expectedTimeComplexity: form.expectedTimeComplexity || null, expectedSpaceComplexity: form.expectedSpaceComplexity || null,
    timeLimitMs: Number(form.timeLimitMs), memoryLimitMb: Number(form.memoryLimitMb), points: Number(form.points),
    companyTags: form.companyTags.split(',').map((s) => s.trim()).filter(Boolean), topics: form.topics.split(',').map((s) => s.trim()).filter(Boolean), isProblemOfTheDay: form.isProblemOfTheDay,
    examples: form.examples.map((e) => ({ input: e.input, output: e.output, explanation: e.explanation || null })),
    starterCode: languages.filter((l) => form.starterCode[l].trim()).map((l) => ({ language: l, code: form.starterCode[l] })),
    testCases: form.testCases.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: t.isSample, weight: Number(t.weight) || 1 })),
  };
}

async function save() {
  clear();
  saving.value = true;
  try {
    if (props.id) {
      await api.put(`/admin/problems/${props.id}`, payload());
      ui.success('Problem saved');
      await load();
    } else {
      const res = await api.post<{ problem: AdminProblem }>('/admin/problems', payload());
      ui.success('Problem created');
      navigateTo(`/admin/problems/${res.problem.id}`, { replace: true });
    }
  } catch (err) {
    apply(err);
    ui.error('Could not save', isApiError(err) && !err.errors.length ? err.message : 'Please fix the highlighted fields (check every tab).');
  } finally {
    saving.value = false;
  }
}
async function setStatus(action: 'publish' | 'unpublish') {
  try {
    await api.post(`/admin/problems/${props.id}/${action}`);
    ui.success(`Problem ${action === 'publish' ? 'published' : 'moved to drafts'}`);
    await load();
  } catch (err) {
    ui.error(`Could not ${action}`, isApiError(err) ? err.message : undefined);
  }
}

// validation of a reference solution against stored tests
const refLanguage = ref<Language>('PYTHON');
const refCode = ref('');
const validating = ref(false);
const validation = ref<{ compile: { ok: boolean; output: string }; passed: number; total: number; results: Array<{ id: string; status: SubmissionStatus; input?: string; expectedOutput?: string; actualOutput: string; stderr: string; runtimeMs: number }> } | null>(null);
async function validate() {
  validating.value = true;
  validation.value = null;
  try {
    validation.value = await api.post(`/admin/problems/${props.id}/validate`, { language: refLanguage.value, sourceCode: refCode.value });
  } catch (err) {
    ui.error('Validation failed', isApiError(err) ? err.message : undefined);
  } finally {
    validating.value = false;
  }
}
</script>

<template>
  <div>
    <AdminPageHeader :title="id ? 'Edit problem' : 'New problem'" :subtitle="problem ? `Status: ${problem.status.toLowerCase()} · ${problem.testCases.length} test cases · ${problem._count.submissions} submissions` : 'Problems need at least one test case before they can be published.'">
      <UiButton v-if="problem" :to="`/problems/${problem.slug}`" variant="secondary"><Eye class="h-4 w-4" /> Preview</UiButton>
      <template v-if="problem && auth.isAdmin">
        <UiButton v-if="problem.status !== 'PUBLISHED'" variant="secondary" @click="setStatus('publish')">Publish</UiButton>
        <UiButton v-else variant="secondary" @click="setStatus('unpublish')">Unpublish</UiButton>
      </template>
      <UiButton :loading="saving" @click="save"><Save class="h-4 w-4" /> Save</UiButton>
    </AdminPageHeader>

    <div v-if="loading" class="space-y-4"><UiSkeleton variant="rect" class="h-10" /><UiSkeleton variant="rect" class="h-64" /></div>
    <template v-else>
      <UiTabs v-model="tab" :tabs="tabs" />
      <div class="mt-5 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <!-- Statement -->
          <UiCard v-show="tab === 'statement'" class="space-y-4">
            <UiInput v-model="form.title" label="Title" :error="errors.title" required />
            <MarkdownEditor v-model="form.description" label="Problem statement" :rows="12" :error="errors.description" required />
            <div class="grid gap-4 sm:grid-cols-2">
              <UiTextarea v-model="form.inputFormat" label="Input format" :rows="4" mono :error="errors.inputFormat" />
              <UiTextarea v-model="form.outputFormat" label="Output format" :rows="4" mono :error="errors.outputFormat" />
            </div>
            <UiTextarea v-model="form.constraints" label="Constraints (Markdown)" :rows="4" mono :error="errors.constraints" />
            <div class="grid gap-4 sm:grid-cols-2">
              <UiInput v-model="form.expectedTimeComplexity" label="Expected time complexity" placeholder="O(N log N)" />
              <UiInput v-model="form.expectedSpaceComplexity" label="Expected auxiliary space" placeholder="O(1)" />
            </div>
          </UiCard>

          <!-- Examples -->
          <UiCard v-show="tab === 'examples'" class="space-y-4">
            <p class="text-sm text-ink-muted">Examples are shown in the statement. Sample test cases (next tab) should mirror them.</p>
            <div v-for="(e, i) in form.examples" :key="i" class="rounded-lg border border-line p-3">
              <div class="mb-2 flex items-center justify-between"><p class="text-sm font-semibold text-ink">Example {{ i + 1 }}</p><UiButton size="xs" variant="ghost" class="text-red-600" @click="form.examples.splice(i, 1)"><Trash2 class="h-3.5 w-3.5" /></UiButton></div>
              <div class="grid gap-3 sm:grid-cols-2">
                <UiTextarea v-model="e.input" label="Input" :rows="3" mono />
                <UiTextarea v-model="e.output" label="Output" :rows="3" mono />
              </div>
              <UiTextarea v-model="e.explanation" label="Explanation (optional)" :rows="2" class="mt-3" />
            </div>
            <UiButton variant="secondary" size="sm" @click="form.examples.push({ input: '', output: '', explanation: '' })"><Plus class="h-4 w-4" /> Add example</UiButton>
          </UiCard>

          <!-- Starter code -->
          <UiCard v-show="tab === 'starter'" class="space-y-4">
            <p class="text-sm text-ink-muted">Each starter program should read stdin, call a stub the learner completes, and print the answer. Leave a language empty to hide it.</p>
            <div v-for="l in languages" :key="l">
              <UiTextarea v-model="form.starterCode[l]" :label="LANGUAGE_LABEL[l]" :rows="8" mono />
            </div>
          </UiCard>

          <!-- Tests -->
          <UiCard v-show="tab === 'tests'" class="space-y-4">
            <p class="text-sm text-ink-muted">Sample tests are visible to learners and used by “Run”; hidden tests are only used by “Submit”. Outputs are compared ignoring trailing whitespace.</p>
            <p v-if="errors.testCases" class="text-sm text-red-600">{{ errors.testCases }}</p>
            <div v-for="(t, i) in form.testCases" :key="i" class="rounded-lg border p-3" :class="t.isSample ? 'border-sky-200 bg-sky-50/40' : 'border-line'">
              <div class="mb-2 flex flex-wrap items-center gap-3">
                <p class="text-sm font-semibold text-ink">Test {{ i + 1 }}</p>
                <label class="flex items-center gap-1.5 text-xs text-ink"><input v-model="t.isSample" type="checkbox" class="h-3.5 w-3.5 rounded border-line-strong text-brand-600" /> Sample (visible)</label>
                <label class="flex items-center gap-1.5 text-xs text-ink">Weight <input v-model.number="t.weight" type="number" min="1" max="100" class="w-16 rounded border border-line px-1.5 py-0.5 text-xs" /></label>
                <span class="flex-1" />
                <UiButton size="xs" variant="ghost" class="text-red-600" @click="form.testCases.splice(i, 1)"><Trash2 class="h-3.5 w-3.5" /></UiButton>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <UiTextarea v-model="t.input" label="stdin" :rows="3" mono />
                <UiTextarea v-model="t.expectedOutput" label="Expected stdout" :rows="3" mono />
              </div>
            </div>
            <UiButton variant="secondary" size="sm" @click="form.testCases.push({ input: '', expectedOutput: '', isSample: form.testCases.length < 2, weight: 1 })"><Plus class="h-4 w-4" /> Add test case</UiButton>
          </UiCard>

          <!-- Editorial -->
          <UiCard v-show="tab === 'editorial'" class="space-y-4">
            <div>
              <p class="mb-1.5 text-sm font-medium text-ink">Hints (revealed one at a time)</p>
              <div v-for="(_, i) in form.hints" :key="i" class="mb-2 flex gap-2">
                <UiInput v-model="form.hints[i]" :placeholder="`Hint ${i + 1}`" class="flex-1" />
                <UiButton size="sm" variant="ghost" class="text-red-600" @click="form.hints.splice(i, 1)"><Trash2 class="h-4 w-4" /></UiButton>
              </div>
              <UiButton v-if="form.hints.length < 5" size="xs" variant="secondary" @click="form.hints.push('')"><Plus class="h-3.5 w-3.5" /> Add hint</UiButton>
            </div>
            <MarkdownEditor v-model="form.editorial" label="Editorial (solution explanation)" :rows="16" hint="Use ::: tabs blocks for multi-language solutions." />
          </UiCard>

          <!-- Validate -->
          <UiCard v-show="tab === 'validate'" class="space-y-4">
            <p class="text-sm text-ink-muted">Paste a reference solution and run it against every saved test case to confirm the expected outputs are correct. Save the problem first.</p>
            <UiAlert v-if="!id" tone="info">Save the problem before validating.</UiAlert>
            <template v-else>
              <UiSelect v-model="refLanguage" :options="languages.map((l) => ({ value: l, label: LANGUAGE_LABEL[l] }))" label="Language" class="w-56" />
              <UiTextarea v-model="refCode" label="Reference solution" :rows="14" mono />
              <UiButton :loading="validating" :disabled="!refCode.trim()" @click="validate"><FlaskConical class="h-4 w-4" /> Run against {{ problem?.testCases.length ?? 0 }} tests</UiButton>
              <div v-if="validation" class="space-y-3">
                <p class="text-sm font-semibold" :class="validation.passed === validation.total ? 'text-green-700' : 'text-red-700'">{{ validation.passed }}/{{ validation.total }} tests passed</p>
                <pre v-if="!validation.compile.ok" class="rounded-md bg-purple-50 p-3 font-mono text-xs text-purple-900">{{ validation.compile.output }}</pre>
                <div v-for="(r, i) in validation.results" :key="r.id" class="rounded-md border p-3 text-xs" :class="r.status === 'ACCEPTED' ? 'border-green-200' : 'border-red-200 bg-red-50/40'">
                  <div class="mb-1 flex items-center gap-2"><StatusBadge :status="r.status" size="xs" /> Test {{ i + 1 }} · {{ r.runtimeMs }} ms</div>
                  <div v-if="r.status !== 'ACCEPTED'" class="grid gap-2 sm:grid-cols-3">
                    <div><p class="font-semibold text-ink-muted">Input</p><pre class="whitespace-pre-wrap font-mono">{{ r.input }}</pre></div>
                    <div><p class="font-semibold text-ink-muted">Expected</p><pre class="whitespace-pre-wrap font-mono">{{ r.expectedOutput }}</pre></div>
                    <div><p class="font-semibold text-ink-muted">Actual</p><pre class="whitespace-pre-wrap font-mono">{{ r.actualOutput }}</pre><pre v-if="r.stderr" class="whitespace-pre-wrap font-mono text-red-700">{{ r.stderr }}</pre></div>
                  </div>
                </div>
              </div>
            </template>
          </UiCard>
        </div>

        <aside class="space-y-4">
          <UiCard class="space-y-4">
            <UiInput v-model="form.slug" label="Slug" :error="errors.slug" />
            <UiSelect v-model="form.difficulty" :options="[{ value: 'SCHOOL', label: 'School' }, { value: 'BASIC', label: 'Basic' }, { value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }]" label="Difficulty" />
            <UiSelect v-model="form.categoryId" :options="categoryOptions" label="Category" />
            <UiInput v-model="form.topics" label="Topics" placeholder="Arrays, Hashing" hint="Comma separated." />
            <UiInput v-model="form.companyTags" label="Company tags" placeholder="Fintech Corp, Cloud Inc" hint="Comma separated (fictional in this build)." />
            <div class="grid grid-cols-3 gap-2">
              <UiInput v-model="form.points" label="Points" type="number" min="0" max="100" />
              <UiInput v-model="form.timeLimitMs" label="Time (ms)" type="number" min="100" max="20000" />
              <UiInput v-model="form.memoryLimitMb" label="Mem (MB)" type="number" min="16" max="1024" />
            </div>
            <label class="flex items-center gap-2 text-sm text-ink"><input v-model="form.isProblemOfTheDay" type="checkbox" class="h-4 w-4 rounded border-line-strong text-brand-600" /> Problem of the day</label>
          </UiCard>
          <UiButton block :loading="saving" @click="save"><Save class="h-4 w-4" /> Save problem</UiButton>
        </aside>
      </div>
    </template>
  </div>
</template>
