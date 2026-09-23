<script setup lang="ts">
import { Eye, Plus, Save, Trash2, ChevronUp, ChevronDown } from 'lucide-vue-next';
import type { ContentStatus } from '~/types/api';

const props = defineProps<{ id?: string | null }>();
const api = useApi();
const ui = useUiStore();
const auth = useAuthStore();
const { categoryOptions } = useAdminMeta();
const { errors, apply, clear } = useFormErrors();

interface QuestionDraft { prompt: string; explanation: string; points: number; options: Array<{ text: string; isCorrect: boolean }> }
interface AdminQuiz {
  id: string; title: string; slug: string; description: string; categoryId: string | null; difficulty: string; timeLimitMin: number | null; status: ContentStatus;
  questions: Array<{ prompt: string; explanation: string | null; points: number; options: Array<{ text: string; isCorrect: boolean }> }>;
  _count: { attempts: number };
}

const form = reactive({ title: '', slug: '', description: '', categoryId: '', difficulty: 'EASY', timeLimitMin: '' as string | number, questions: [] as QuestionDraft[] });
const quiz = ref<AdminQuiz | null>(null);
const loading = ref(!!props.id);
const saving = ref(false);

function blankQuestion(): QuestionDraft {
  return { prompt: '', explanation: '', points: 1, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] };
}

async function load() {
  if (!props.id) return;
  loading.value = true;
  try {
    const res = await api.get<{ quiz: AdminQuiz }>(`/admin/quizzes/${props.id}`);
    quiz.value = res.quiz;
    Object.assign(form, {
      title: res.quiz.title, slug: res.quiz.slug, description: res.quiz.description, categoryId: res.quiz.categoryId ?? '', difficulty: res.quiz.difficulty, timeLimitMin: res.quiz.timeLimitMin ?? '',
      questions: res.quiz.questions.map((q) => ({ prompt: q.prompt, explanation: q.explanation ?? '', points: q.points, options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) })),
    });
  } catch (err) {
    ui.error('Failed to load quiz', isApiError(err) ? err.message : undefined);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function setCorrect(q: QuestionDraft, idx: number) {
  q.options.forEach((o, i) => (o.isCorrect = i === idx));
}
function move(i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= form.questions.length) return;
  const arr = form.questions;
  [arr[i], arr[j]] = [arr[j]!, arr[i]!];
}

async function save() {
  clear();
  saving.value = true;
  const body = {
    title: form.title, slug: form.slug || undefined, description: form.description, categoryId: form.categoryId || null, difficulty: form.difficulty,
    timeLimitMin: form.timeLimitMin === '' ? null : Number(form.timeLimitMin),
    questions: form.questions.map((q) => ({ prompt: q.prompt, explanation: q.explanation || null, points: Number(q.points) || 1, options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) })),
  };
  try {
    if (props.id) {
      await api.put(`/admin/quizzes/${props.id}`, body);
      ui.success('Quiz saved');
      await load();
    } else {
      const res = await api.post<{ quiz: AdminQuiz }>('/admin/quizzes', body);
      ui.success('Quiz created');
      navigateTo(`/admin/quizzes/${res.quiz.id}`, { replace: true });
    }
  } catch (err) {
    apply(err);
    ui.error('Could not save', isApiError(err) && !err.errors.length ? err.message : 'Please fix the highlighted fields.');
  } finally {
    saving.value = false;
  }
}
async function setStatus(action: 'publish' | 'unpublish') {
  try {
    await api.post(`/admin/quizzes/${props.id}/${action}`);
    ui.success(`Quiz ${action === 'publish' ? 'published' : 'moved to drafts'}`);
    await load();
  } catch (err) {
    ui.error(`Could not ${action}`, isApiError(err) ? err.message : undefined);
  }
}
function questionError(i: number) {
  return Object.entries(errors).find(([k, v]) => v && k.startsWith(`questions.${i}`))?.[1];
}
</script>

<template>
  <div>
    <AdminPageHeader :title="id ? 'Edit quiz' : 'New quiz'" :subtitle="quiz ? `Status: ${quiz.status.toLowerCase()} · ${quiz.questions.length} questions · ${quiz._count.attempts} attempts` : 'Each question needs exactly one correct option.'">
      <UiButton v-if="quiz" :to="`/quizzes/${quiz.slug}`" variant="secondary"><Eye class="h-4 w-4" /> Preview</UiButton>
      <template v-if="quiz && auth.isAdmin">
        <UiButton v-if="quiz.status !== 'PUBLISHED'" variant="secondary" @click="setStatus('publish')">Publish</UiButton>
        <UiButton v-else variant="secondary" @click="setStatus('unpublish')">Unpublish</UiButton>
      </template>
      <UiButton :loading="saving" @click="save"><Save class="h-4 w-4" /> Save</UiButton>
    </AdminPageHeader>

    <div v-if="loading" class="space-y-4"><UiSkeleton variant="rect" class="h-40" /><UiSkeleton variant="rect" class="h-64" /></div>
    <div v-else class="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div class="space-y-4">
        <UiCard class="space-y-4">
          <UiInput v-model="form.title" label="Title" :error="errors.title" required />
          <UiTextarea v-model="form.description" label="Description" :rows="3" :maxlength="1000" show-count :error="errors.description" required />
        </UiCard>

        <UiAlert v-if="quiz && quiz._count.attempts > 0" tone="warning">This quiz has {{ quiz._count.attempts }} attempts. Saving replaces the questions; past attempts keep their scores but lose per-question review.</UiAlert>

        <UiCard v-for="(q, qi) in form.questions" :key="qi" class="space-y-3" :class="questionError(qi) ? 'border-red-300' : ''">
          <div class="flex items-center gap-2">
            <p class="flex-1 text-sm font-semibold text-ink">Question {{ qi + 1 }}</p>
            <UiButton size="xs" variant="ghost" :disabled="qi === 0" @click="move(qi, -1)"><ChevronUp class="h-4 w-4" /></UiButton>
            <UiButton size="xs" variant="ghost" :disabled="qi === form.questions.length - 1" @click="move(qi, 1)"><ChevronDown class="h-4 w-4" /></UiButton>
            <UiButton size="xs" variant="ghost" class="text-red-600" @click="form.questions.splice(qi, 1)"><Trash2 class="h-4 w-4" /></UiButton>
          </div>
          <p v-if="questionError(qi)" class="text-sm text-red-600">{{ questionError(qi) }}</p>
          <UiTextarea v-model="q.prompt" label="Prompt (Markdown)" :rows="2" required />
          <div class="space-y-2">
            <p class="text-sm font-medium text-ink">Options <span class="text-xs font-normal text-ink-muted">(select the correct one)</span></p>
            <div v-for="(o, oi) in q.options" :key="oi" class="flex items-center gap-2">
              <input type="radio" :name="`correct-${qi}`" :checked="o.isCorrect" class="h-4 w-4 text-brand-600" :aria-label="`Option ${oi + 1} is correct`" @change="setCorrect(q, oi)" />
              <UiInput v-model="o.text" :placeholder="`Option ${String.fromCharCode(65 + oi)}`" class="flex-1" />
              <UiButton v-if="q.options.length > 2" size="sm" variant="ghost" class="text-red-600" @click="q.options.splice(oi, 1); if (!q.options.some((x) => x.isCorrect)) q.options[0]!.isCorrect = true"><Trash2 class="h-4 w-4" /></UiButton>
            </div>
            <UiButton v-if="q.options.length < 6" size="xs" variant="secondary" @click="q.options.push({ text: '', isCorrect: false })"><Plus class="h-3.5 w-3.5" /> Option</UiButton>
          </div>
          <div class="grid gap-3 sm:grid-cols-[1fr_120px]">
            <UiTextarea v-model="q.explanation" label="Explanation (shown after submission)" :rows="2" />
            <UiInput v-model="q.points" label="Points" type="number" min="1" max="10" />
          </div>
        </UiCard>
        <UiButton variant="secondary" @click="form.questions.push(blankQuestion())"><Plus class="h-4 w-4" /> Add question</UiButton>
      </div>

      <aside class="space-y-4">
        <UiCard class="space-y-4">
          <UiInput v-model="form.slug" label="Slug" :error="errors.slug" />
          <UiSelect v-model="form.categoryId" :options="categoryOptions" label="Category" />
          <UiSelect v-model="form.difficulty" :options="[{ value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }]" label="Difficulty" />
          <UiInput v-model="form.timeLimitMin" label="Time limit (minutes, empty = none)" type="number" min="1" max="300" :error="errors.timeLimitMin" />
        </UiCard>
        <UiButton block :loading="saving" @click="save"><Save class="h-4 w-4" /> Save quiz</UiButton>
      </aside>
    </div>
  </div>
</template>
