<script setup lang="ts">
import { ArrowLeft, Code2, FileText, Moon, Play, RotateCcw, Send, Sun, Minus, Plus, Maximize2, Minimize2 } from 'lucide-vue-next';
import { useStorage } from '@vueuse/core';
import type { Language, Problem, RunResult, Submission } from '~/types/api';
import { LANGUAGE_LABEL } from '~/utils/format';

definePageMeta({ layout: 'focus', hideFooter: true });

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const ui = useUiStore();
const slug = computed(() => route.params.slug as string);

const { data, status, error, refresh } = await useAsyncData(() => `problem:${slug.value}`, () => api.get<{ problem: Problem & { sampleTests: Array<{ id: string; input: string; expectedOutput: string }> } }>(`/problems/${slug.value}`), {
  watch: [slug],
});
if (status.value === 'error' && error.value) {
  const e = error.value as unknown as { status?: number };
  throw createError({ statusCode: e.status === 404 ? 404 : 500, statusMessage: e.status === 404 ? 'Problem not found' : 'Failed to load problem', fatal: true });
}
watch(() => auth.isAuthenticated, () => refresh());
const problem = computed(() => data.value?.problem);

// ---- editor state (persisted per problem + language) ----
const languages: Language[] = ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'];
const language = useStorage<Language>('gfg:lang', 'PYTHON');
const theme = useStorage<'light' | 'dark'>('gfg:editorTheme', 'dark');
const fontSize = useStorage<number>('gfg:editorFont', 14);
const codeKey = computed(() => `gfg:code:${slug.value}:${language.value}`);
const code = ref('');
const dirty = ref(false);

function loadCode() {
  if (!problem.value) return;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(codeKey.value);
  } catch {
    /* ignore */
  }
  code.value = saved ?? problem.value.starterCode[language.value] ?? '';
  dirty.value = saved !== null;
}
onMounted(loadCode);
watch([problem, language], loadCode);
watch(code, (v) => {
  if (!problem.value) return;
  try {
    if (v !== problem.value.starterCode[language.value]) {
      localStorage.setItem(codeKey.value, v);
      dirty.value = true;
    } else {
      localStorage.removeItem(codeKey.value);
      dirty.value = false;
    }
  } catch {
    /* ignore */
  }
});

const confirmReset = ref(false);
function resetCode() {
  if (!problem.value) return;
  code.value = problem.value.starterCode[language.value] ?? '';
  try {
    localStorage.removeItem(codeKey.value);
  } catch {
    /* ignore */
  }
  dirty.value = false;
  confirmReset.value = false;
  ui.info('Editor reset to starter code');
}

// ---- run & submit ----
const running = ref(false);
const submitting = ref(false);
const runResult = ref<RunResult | null>(null);
const submission = ref<Submission | null>(null);
const customInput = ref('');
const consoleCollapsed = ref(false);
const submissionList = ref<{ reload: () => void } | null>(null);

function requireLogin(): boolean {
  if (auth.isAuthenticated) return true;
  ui.info('Sign in to run and submit code');
  navigateTo({ path: '/login', query: { redirect: route.fullPath } });
  return false;
}

async function run() {
  if (!problem.value || !requireLogin()) return;
  running.value = true;
  submission.value = null;
  try {
    runResult.value = await api.post<RunResult>(`/problems/${problem.value.slug}/run`, { language: language.value, sourceCode: code.value, customInput: customInput.value || undefined });
  } catch (err) {
    ui.error('Run failed', isApiError(err) ? err.message : undefined);
  } finally {
    running.value = false;
  }
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;
async function submit() {
  if (!problem.value || !requireLogin()) return;
  submitting.value = true;
  runResult.value = null;
  submission.value = null;
  try {
    const { submissionId } = await api.post<{ submissionId: string }>(`/problems/${problem.value.slug}/submit`, { language: language.value, sourceCode: code.value });
    await poll(submissionId);
  } catch (err) {
    submitting.value = false;
    ui.error('Submission failed', isApiError(err) ? err.message : undefined);
  }
}

async function poll(id: string, attempt = 0) {
  try {
    const res = await api.get<{ submission: Submission }>(`/submissions/${id}`);
    if (res.submission.status === 'PENDING' || res.submission.status === 'RUNNING') {
      if (attempt > 120) throw new Error('Judging is taking too long');
      pollTimer = setTimeout(() => poll(id, attempt + 1), attempt < 10 ? 700 : 1500);
      return;
    }
    submission.value = res.submission;
    submitting.value = false;
    submissionList.value?.reload();
    if (res.submission.status === 'ACCEPTED') {
      ui.success('Accepted!', `All ${res.submission.totalCount} test cases passed.`);
      if (problem.value) problem.value.userState = 'SOLVED';
    } else {
      if (problem.value && problem.value.userState !== 'SOLVED') problem.value.userState = 'ATTEMPTED';
    }
  } catch (err) {
    submitting.value = false;
    ui.error('Could not fetch the verdict', isApiError(err) ? err.message : undefined);
  }
}
onBeforeUnmount(() => pollTimer && clearTimeout(pollTimer));

function loadSubmissionCode(s: Submission) {
  if (!s.sourceCode) return;
  language.value = s.language;
  nextTick(() => {
    code.value = s.sourceCode!;
    ui.info('Loaded submission into the editor');
    mobilePane.value = 'code';
  });
}

// ---- tabs ----
const leftTab = ref('problem');
const leftTabs = computed(() => [
  { value: 'problem', label: 'Problem' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'submissions', label: 'Submissions' },
  { value: 'comments', label: 'Comments' },
]);
const mobilePane = ref<'problem' | 'code'>('problem');
const fullscreen = ref(false);

const editorial = ref<string | null | undefined>(undefined);
const editorialLoading = ref(false);
watch(leftTab, async (t) => {
  if (t === 'editorial' && editorial.value === undefined && problem.value) {
    editorialLoading.value = true;
    try {
      const res = await api.get<{ problem: Problem }>(`/problems/${problem.value.slug}`, { editorial: 'true' });
      editorial.value = res.problem.editorial ?? null;
    } catch {
      editorial.value = null;
    } finally {
      editorialLoading.value = false;
    }
  }
});

const languageOptions = languages.map((l) => ({ value: l, label: LANGUAGE_LABEL[l] }));

useContentSeo(() => ({
  title: problem.value ? `${problem.value.title} — Practice` : 'Problem',
  description: problem.value ? `Solve "${problem.value.title}" (${problem.value.difficulty.toLowerCase()}) with the online judge.` : '',
  path: `/problems/${slug.value}`,
}));
</script>

<template>
  <div class="flex h-full flex-col bg-surface-muted">
    <div v-if="status === 'pending' && !problem" class="grid flex-1 gap-4 p-4 lg:grid-cols-2">
      <UiSkeleton variant="rect" class="h-full" /><UiSkeleton variant="rect" class="h-full" />
    </div>

    <template v-else-if="problem">
      <!-- Top bar -->
      <div class="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
        <NuxtLink to="/problems" class="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><ArrowLeft class="h-4 w-4" /> <span class="hidden sm:inline">Problems</span></NuxtLink>
        <span class="hidden text-gray-300 sm:inline">|</span>
        <h1 class="min-w-0 flex-1 truncate text-sm font-semibold text-ink sm:text-base">{{ problem.title }}</h1>
        <DifficultyBadge :difficulty="problem.difficulty" size="xs" />
        <UiBadge v-if="problem.userState === 'SOLVED'" tone="green" size="xs">Solved</UiBadge>
        <UiBadge v-else-if="problem.userState === 'ATTEMPTED'" tone="amber" size="xs">Attempted</UiBadge>
        <ClientOnly><BookmarkButton type="PROBLEM" :target-id="problem.id" :initial="problem.bookmarked" size="sm" :label="false" /></ClientOnly>
        <ShareMenu :title="problem.title" size="sm" class="hidden sm:block" />
      </div>

      <!-- Mobile pane switch -->
      <div class="flex shrink-0 border-b border-line bg-surface lg:hidden">
        <button type="button" class="flex-1 py-2 text-sm font-medium" :class="mobilePane === 'problem' ? 'border-b-2 border-brand-500 text-brand-700' : 'text-ink-muted'" @click="mobilePane = 'problem'"><FileText class="mr-1 inline h-4 w-4" /> Problem</button>
        <button type="button" class="flex-1 py-2 text-sm font-medium" :class="mobilePane === 'code' ? 'border-b-2 border-brand-500 text-brand-700' : 'text-ink-muted'" @click="mobilePane = 'code'"><Code2 class="mr-1 inline h-4 w-4" /> Code</button>
      </div>

      <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
        <!-- Left pane -->
        <section class="min-h-0 flex-1 flex-col overflow-hidden border-r border-line bg-surface lg:flex lg:w-1/2 lg:flex-none" :class="[mobilePane === 'problem' ? 'flex' : 'hidden', fullscreen ? 'lg:hidden' : '']">
          <div class="shrink-0 border-b border-line px-4"><UiTabs v-model="leftTab" :tabs="leftTabs" size="sm" /></div>
          <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <ProblemStatement v-show="leftTab === 'problem'" :problem="problem" />
            <div v-if="leftTab === 'editorial'">
              <UiSpinner v-if="editorialLoading" label="Loading editorial…" />
              <MarkdownContent v-else-if="editorial" :source="editorial" compact />
              <UiEmptyState v-else title="No editorial yet" description="An explanation for this problem has not been published." compact />
            </div>
            <div v-if="leftTab === 'submissions'">
              <SubmissionList ref="submissionList" :problem-slug="problem.slug" @load-code="loadSubmissionCode" />
            </div>
            <div v-if="leftTab === 'comments'">
              <CommentThread target-type="PROBLEM" :target-id="problem.id" />
            </div>
          </div>
        </section>

        <!-- Right pane -->
        <section class="min-h-0 flex-1 flex-col lg:flex" :class="mobilePane === 'code' ? 'flex' : 'hidden'">
          <div class="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
            <UiSelect v-model="language" :options="languageOptions" size="sm" class="w-44" />
            <span v-if="dirty" class="text-xs text-ink-muted">Unsaved changes are kept locally</span>
            <div class="flex-1" />
            <UiButton variant="ghost" size="sm" icon :aria-label="theme === 'dark' ? 'Light theme' : 'Dark theme'" @click="theme = theme === 'dark' ? 'light' : 'dark'"><Sun v-if="theme === 'dark'" class="h-4 w-4" /><Moon v-else class="h-4 w-4" /></UiButton>
            <UiButton variant="ghost" size="sm" icon aria-label="Smaller font" @click="fontSize = Math.max(11, fontSize - 1)"><Minus class="h-4 w-4" /></UiButton>
            <UiButton variant="ghost" size="sm" icon aria-label="Larger font" @click="fontSize = Math.min(22, fontSize + 1)"><Plus class="h-4 w-4" /></UiButton>
            <UiButton variant="ghost" size="sm" icon aria-label="Reset code" title="Reset to starter code" @click="confirmReset = true"><RotateCcw class="h-4 w-4" /></UiButton>
            <UiButton variant="ghost" size="sm" icon class="hidden lg:inline-flex" :aria-label="fullscreen ? 'Exit full screen' : 'Full screen editor'" @click="fullscreen = !fullscreen"><Minimize2 v-if="fullscreen" class="h-4 w-4" /><Maximize2 v-else class="h-4 w-4" /></UiButton>
          </div>

          <div class="min-h-0 flex-1">
            <CodeEditor v-model="code" :language="language" :theme="theme" :font-size="fontSize" />
          </div>

          <RunConsole v-model:collapsed="consoleCollapsed" :sample-tests="problem.sampleTests" :run-result="runResult" :submission="submission" :running="running" :submitting="submitting" @update:custom-input="customInput = $event" />

          <div class="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-line bg-surface px-3">
            <p class="mr-auto hidden text-xs text-ink-muted sm:block">Run tests the sample cases · Submit judges all hidden tests</p>
            <UiButton variant="secondary" :loading="running" :disabled="submitting" @click="run"><Play class="h-4 w-4" /> Run</UiButton>
            <UiButton :loading="submitting" :disabled="running" @click="submit"><Send class="h-4 w-4" /> Submit</UiButton>
          </div>
        </section>
      </div>

      <UiModal v-model="confirmReset" title="Reset code?" description="Your current code for this language will be replaced with the starter template." size="sm">
        <template #footer>
          <UiButton variant="ghost" @click="confirmReset = false">Cancel</UiButton>
          <UiButton variant="danger" @click="resetCode">Reset</UiButton>
        </template>
      </UiModal>
    </template>
  </div>
</template>
