<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, Flag, Timer } from 'lucide-vue-next';
import type { QuizAttempt } from '~/types/api';

definePageMeta({ middleware: 'auth', hideFooter: true });

const route = useRoute();
const api = useApi();
const ui = useUiStore();
const slug = computed(() => route.params.slug as string);
const attemptId = computed(() => route.params.id as string);

const { data, status, error, refresh } = await useAsyncData(() => `attempt:${attemptId.value}`, () => api.get<{ attempt: QuizAttempt }>(`/quiz-attempts/${attemptId.value}`));
const attempt = computed(() => data.value?.attempt);

// Already finished → go to the result page.
watch(
  attempt,
  (a) => {
    if (a && a.status !== 'IN_PROGRESS') navigateTo(`/quizzes/${slug.value}/result/${a.id}`, { replace: true });
  },
  { immediate: true },
);

const index = ref(0);
const answers = ref<Record<string, string | null>>({});
watch(attempt, (a) => { if (a) answers.value = { ...a.answers }; }, { immediate: true });

const current = computed(() => attempt.value?.questions[index.value]);
const total = computed(() => attempt.value?.questions.length ?? 0);
const answeredCount = computed(() => Object.values(answers.value).filter(Boolean).length);
const saving = ref<string | null>(null);
const submitting = ref(false);
const confirmSubmit = ref(false);

async function select(questionId: string, optionId: string) {
  const previous = answers.value[questionId] ?? null;
  answers.value = { ...answers.value, [questionId]: optionId };
  saving.value = questionId;
  try {
    await api.put(`/quiz-attempts/${attemptId.value}/answers`, { questionId, optionId });
  } catch (err) {
    answers.value = { ...answers.value, [questionId]: previous };
    if (isApiError(err) && err.status === 409) {
      ui.error('This attempt is closed', err.message);
      navigateTo(`/quizzes/${slug.value}/result/${attemptId.value}`, { replace: true });
    } else {
      ui.error('Could not save your answer', isApiError(err) ? err.message : undefined);
    }
  } finally {
    saving.value = null;
  }
}

async function submit() {
  submitting.value = true;
  try {
    await api.post(`/quiz-attempts/${attemptId.value}/submit`);
    ui.success('Quiz submitted');
    navigateTo(`/quizzes/${slug.value}/result/${attemptId.value}`, { replace: true });
  } catch (err) {
    if (isApiError(err) && err.status === 409) navigateTo(`/quizzes/${slug.value}/result/${attemptId.value}`, { replace: true });
    else ui.error('Could not submit', isApiError(err) ? err.message : undefined);
  } finally {
    submitting.value = false;
    confirmSubmit.value = false;
  }
}

// Timer
const now = ref(Date.now());
let tick: ReturnType<typeof setInterval> | null = null;
onMounted(() => (tick = setInterval(() => (now.value = Date.now()), 1000)));
onBeforeUnmount(() => tick && clearInterval(tick));
const remainingMs = computed(() => (attempt.value?.expiresAt ? new Date(attempt.value.expiresAt).getTime() - 15_000 - now.value : null));
const remainingLabel = computed(() => {
  if (remainingMs.value === null) return null;
  const s = Math.max(0, Math.floor(remainingMs.value / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
});
watch(remainingMs, (ms) => {
  if (ms !== null && ms <= 0 && !submitting.value && attempt.value?.status === 'IN_PROGRESS') {
    ui.info("Time's up", 'Submitting your answers…');
    submit();
  }
});

function onKey(e: KeyboardEvent) {
  if (!current.value) return;
  if (e.key === 'ArrowRight' && index.value < total.value - 1) index.value++;
  if (e.key === 'ArrowLeft' && index.value > 0) index.value--;
  const n = Number(e.key);
  if (n >= 1 && n <= current.value.options.length) select(current.value.id, current.value.options[n - 1]!.id);
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

useSeoMeta({ title: () => (attempt.value ? `${attempt.value.quiz.title} — Attempt` : 'Quiz attempt'), robots: 'noindex' });
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6">
    <div v-if="status === 'pending' && !attempt" class="space-y-4"><UiSkeleton variant="title" /><UiSkeleton variant="rect" class="h-64" /></div>
    <UiErrorState v-else-if="status === 'error'" :message="error?.message" @retry="refresh()" />

    <template v-else-if="attempt && current">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <NuxtLink :to="`/quizzes/${slug}`" class="text-sm text-ink-muted hover:text-ink">← {{ attempt.quiz.title }}</NuxtLink>
          <h1 class="text-xl font-bold text-ink">Question {{ index + 1 }} <span class="font-normal text-ink-muted">of {{ total }}</span></h1>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="remainingLabel" class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold" :class="remainingMs !== null && remainingMs < 60_000 ? 'bg-red-50 text-red-700' : 'bg-surface-muted text-ink'">
            <Timer class="h-4 w-4" /> {{ remainingLabel }}
          </span>
          <UiButton size="sm" @click="confirmSubmit = true"><Flag class="h-4 w-4" /> Submit quiz</UiButton>
        </div>
      </div>

      <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_260px]">
        <div>
          <UiProgress :value="(answeredCount / total) * 100" size="xs" class="mb-4" />
          <UiCard padding="lg">
            <div class="flex items-start justify-between gap-4">
              <MarkdownContent :source="current.prompt" compact class="flex-1 text-lg font-medium" />
              <UiBadge tone="gray" size="xs" class="shrink-0">{{ current.points }} pt{{ current.points === 1 ? '' : 's' }}</UiBadge>
            </div>
            <fieldset class="mt-6 space-y-2.5">
              <legend class="sr-only">Options</legend>
              <label
                v-for="(opt, i) in current.options"
                :key="opt.id"
                class="flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition"
                :class="answers[current.id] === opt.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-muted'"
              >
                <input type="radio" :name="`q-${current.id}`" class="sr-only" :value="opt.id" :checked="answers[current.id] === opt.id" @change="select(current.id, opt.id)" />
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold" :class="answers[current.id] === opt.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-line-strong text-ink-muted'">
                  <Check v-if="answers[current.id] === opt.id" class="h-4 w-4" /><template v-else>{{ String.fromCharCode(65 + i) }}</template>
                </span>
                <span class="text-[15px] text-ink">{{ opt.text }}</span>
              </label>
            </fieldset>
            <p v-if="saving === current.id" class="mt-3 text-xs text-ink-muted">Saving…</p>
          </UiCard>

          <div class="mt-5 flex items-center justify-between">
            <UiButton variant="secondary" :disabled="index === 0" @click="index--"><ArrowLeft class="h-4 w-4" /> Previous</UiButton>
            <p class="text-xs text-ink-muted">Tip: use ← → and number keys</p>
            <UiButton v-if="index < total - 1" variant="secondary" @click="index++">Next <ArrowRight class="h-4 w-4" /></UiButton>
            <UiButton v-else @click="confirmSubmit = true"><Flag class="h-4 w-4" /> Finish</UiButton>
          </div>
        </div>

        <aside>
          <UiCard padding="sm" class="sticky top-32">
            <p class="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Questions · {{ answeredCount }}/{{ total }} answered</p>
            <div class="grid grid-cols-6 gap-1.5 px-1 lg:grid-cols-5">
              <button
                v-for="(q, i) in attempt.questions"
                :key="q.id"
                type="button"
                class="h-9 rounded-md text-sm font-semibold transition"
                :class="[
                  i === index ? 'ring-2 ring-brand-500 ring-offset-1' : '',
                  answers[q.id] ? 'bg-brand-500 text-white' : 'bg-surface-muted text-ink hover:bg-surface-strong',
                ]"
                :aria-label="`Question ${i + 1}${answers[q.id] ? ', answered' : ''}`"
                @click="index = i"
              >
                {{ i + 1 }}
              </button>
            </div>
            <div class="mt-3 flex items-center gap-4 px-1 text-xs text-ink-muted">
              <span class="inline-flex items-center gap-1"><span class="h-3 w-3 rounded bg-brand-500" /> Answered</span>
              <span class="inline-flex items-center gap-1"><span class="h-3 w-3 rounded bg-surface-strong" /> Unanswered</span>
            </div>
          </UiCard>
        </aside>
      </div>

      <UiModal v-model="confirmSubmit" title="Submit quiz?" size="sm">
        <p class="text-sm text-ink-muted">You have answered <strong class="text-ink">{{ answeredCount }} of {{ total }}</strong> questions. Unanswered questions score zero. You cannot change answers after submitting.</p>
        <template #footer>
          <UiButton variant="ghost" @click="confirmSubmit = false">Keep answering</UiButton>
          <UiButton :loading="submitting" @click="submit">Submit</UiButton>
        </template>
      </UiModal>
    </template>
  </div>
</template>
