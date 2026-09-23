<script setup lang="ts">
import { Eye, GripVertical, Pencil, Plus, Save, Trash2 } from 'lucide-vue-next';
import type { ContentStatus } from '~/types/api';
import type { LessonDraft } from './LessonEditorModal.vue';

const props = defineProps<{ id?: string | null }>();
const api = useApi();
const ui = useUiStore();
const auth = useAuthStore();
const { categoryOptions } = useAdminMeta();
const { errors, apply, clear } = useFormErrors();

interface LessonRow { id: string; title: string; slug: string; order: number; readingTimeMin: number; chapterId: string | null }
interface Chapter { id: string; title: string; order: number; lessons: LessonRow[] }
interface AdminTutorial { id: string; title: string; slug: string; description: string; coverImageUrl: string | null; categoryId: string | null; order: number; status: ContentStatus; chapters: Chapter[]; lessons: LessonRow[] }

const form = reactive({ title: '', slug: '', description: '', coverImageUrl: '', categoryId: '', order: 0 });
const tutorial = ref<AdminTutorial | null>(null);
const loading = ref(!!props.id);
const saving = ref(false);

async function load() {
  if (!props.id) return;
  loading.value = true;
  try {
    const res = await api.get<{ tutorial: AdminTutorial }>(`/admin/tutorials/${props.id}`);
    tutorial.value = res.tutorial;
    Object.assign(form, { title: res.tutorial.title, slug: res.tutorial.slug, description: res.tutorial.description, coverImageUrl: res.tutorial.coverImageUrl ?? '', categoryId: res.tutorial.categoryId ?? '', order: res.tutorial.order });
  } catch (err) {
    ui.error('Failed to load tutorial', isApiError(err) ? err.message : undefined);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function save() {
  clear();
  saving.value = true;
  const body = { title: form.title, slug: form.slug || undefined, description: form.description, coverImageUrl: form.coverImageUrl || null, categoryId: form.categoryId || null, order: Number(form.order) || 0 };
  try {
    if (props.id) {
      await api.put(`/admin/tutorials/${props.id}`, body);
      ui.success('Tutorial saved');
      await load();
    } else {
      const res = await api.post<{ tutorial: AdminTutorial }>('/admin/tutorials', body);
      ui.success('Tutorial created', 'Now add chapters and lessons.');
      navigateTo(`/admin/tutorials/${res.tutorial.id}`, { replace: true });
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
    await api.post(`/admin/tutorials/${props.id}/${action}`);
    ui.success(`Tutorial ${action === 'publish' ? 'published' : 'moved to drafts'}`);
    await load();
  } catch (err) {
    ui.error(`Could not ${action}`, isApiError(err) ? err.message : undefined);
  }
}

// ---- chapters ----
const chapterTitle = ref('');
async function addChapter() {
  if (!chapterTitle.value.trim()) return;
  try {
    await api.post(`/admin/tutorials/${props.id}/chapters`, { title: chapterTitle.value.trim() });
    chapterTitle.value = '';
    await load();
  } catch (err) {
    ui.error('Could not add chapter', isApiError(err) ? err.message : undefined);
  }
}
async function renameChapter(c: Chapter) {
  const title = window.prompt('Chapter title', c.title);
  if (!title || title === c.title) return;
  await api.put(`/admin/tutorials/chapters/${c.id}`, { title, order: c.order });
  await load();
}
async function deleteChapter(c: Chapter) {
  if (!window.confirm(`Delete chapter “${c.title}”? Its lessons will be kept without a chapter.`)) return;
  await api.del(`/admin/tutorials/chapters/${c.id}`);
  await load();
}
async function moveChapter(c: Chapter, dir: -1 | 1) {
  if (!tutorial.value) return;
  const list = [...tutorial.value.chapters];
  const i = list.findIndex((x) => x.id === c.id);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  await Promise.all([api.put(`/admin/tutorials/chapters/${list[i]!.id}`, { title: list[i]!.title, order: j }), api.put(`/admin/tutorials/chapters/${list[j]!.id}`, { title: list[j]!.title, order: i })]);
  await load();
}

// ---- lessons ----
const lessonModal = ref(false);
const editingLesson = ref<LessonDraft | null>(null);
const lessonSaving = ref(false);
const lessonErrors = useFormErrors();

function newLesson(chapterId: string | null) {
  editingLesson.value = { title: '', slug: '', content: '', chapterId };
  lessonErrors.clear();
  lessonModal.value = true;
}
async function editLesson(l: LessonRow) {
  try {
    const res = await api.get<{ lesson: LessonRow & { content: string } }>(`/admin/tutorials/lessons/${l.id}`);
    editingLesson.value = { id: l.id, title: res.lesson.title, slug: res.lesson.slug, content: res.lesson.content, chapterId: res.lesson.chapterId, readingTimeMin: res.lesson.readingTimeMin, order: res.lesson.order };
    lessonErrors.clear();
    lessonModal.value = true;
  } catch (err) {
    ui.error('Could not load lesson', isApiError(err) ? err.message : undefined);
  }
}
async function saveLesson(draft: LessonDraft) {
  lessonSaving.value = true;
  lessonErrors.clear();
  const body = { title: draft.title, slug: draft.slug || undefined, content: draft.content, chapterId: draft.chapterId || null, readingTimeMin: draft.readingTimeMin ?? undefined, order: draft.order };
  try {
    if (draft.id) await api.put(`/admin/tutorials/lessons/${draft.id}`, body);
    else await api.post(`/admin/tutorials/${props.id}/lessons`, body);
    ui.success('Lesson saved');
    lessonModal.value = false;
    await load();
  } catch (err) {
    lessonErrors.apply(err);
    ui.error('Could not save lesson', isApiError(err) && !err.errors.length ? err.message : 'Please fix the highlighted fields.');
  } finally {
    lessonSaving.value = false;
  }
}
async function deleteLesson(l: LessonRow) {
  if (!window.confirm(`Delete lesson “${l.title}”? Learner progress on it will be removed.`)) return;
  try {
    await api.del(`/admin/tutorials/lessons/${l.id}`);
    await load();
  } catch (err) {
    ui.error('Could not delete lesson', isApiError(err) ? err.message : undefined);
  }
}
async function moveLesson(list: LessonRow[], l: LessonRow, dir: -1 | 1) {
  const i = list.findIndex((x) => x.id === l.id);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  const a = list[i]!;
  const b = list[j]!;
  const [fa, fb] = await Promise.all([api.get<{ lesson: LessonRow & { content: string } }>(`/admin/tutorials/lessons/${a.id}`), api.get<{ lesson: LessonRow & { content: string } }>(`/admin/tutorials/lessons/${b.id}`)]);
  await Promise.all([
    api.put(`/admin/tutorials/lessons/${a.id}`, { title: fa.lesson.title, slug: fa.lesson.slug, content: fa.lesson.content, chapterId: fa.lesson.chapterId, order: b.order }),
    api.put(`/admin/tutorials/lessons/${b.id}`, { title: fb.lesson.title, slug: fb.lesson.slug, content: fb.lesson.content, chapterId: fb.lesson.chapterId, order: a.order }),
  ]);
  await load();
}
</script>

<template>
  <div>
    <AdminPageHeader :title="id ? 'Edit tutorial' : 'New tutorial'" :subtitle="tutorial ? `Status: ${tutorial.status.toLowerCase()} · ${tutorial.chapters.reduce((s, c) => s + c.lessons.length, 0) + tutorial.lessons.length} lessons` : 'Create the tutorial first, then add chapters and lessons.'">
      <UiButton v-if="tutorial" :to="`/tutorials/${tutorial.slug}`" variant="secondary"><Eye class="h-4 w-4" /> Preview</UiButton>
      <template v-if="tutorial && auth.isAdmin">
        <UiButton v-if="tutorial.status !== 'PUBLISHED'" variant="secondary" @click="setStatus('publish')">Publish</UiButton>
        <UiButton v-else variant="secondary" @click="setStatus('unpublish')">Unpublish</UiButton>
      </template>
      <UiButton :loading="saving" @click="save"><Save class="h-4 w-4" /> Save</UiButton>
    </AdminPageHeader>

    <div v-if="loading" class="space-y-4"><UiSkeleton variant="rect" class="h-40" /><UiSkeleton variant="rect" class="h-64" /></div>
    <div v-else class="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div class="space-y-6">
        <UiCard class="space-y-4">
          <h2 class="font-semibold text-ink">Details</h2>
          <UiInput v-model="form.title" label="Title" :error="errors.title" required />
          <UiTextarea v-model="form.description" label="Description" :rows="3" :maxlength="1000" show-count :error="errors.description" required />
        </UiCard>

        <UiCard v-if="tutorial" padding="none">
          <div class="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 class="font-semibold text-ink">Curriculum</h2>
            <UiButton size="sm" variant="secondary" @click="newLesson(null)"><Plus class="h-4 w-4" /> Lesson without chapter</UiButton>
          </div>
          <div class="divide-y divide-line">
            <div v-for="(c, ci) in tutorial.chapters" :key="c.id">
              <div class="flex items-center gap-2 bg-surface-muted px-5 py-2">
                <GripVertical class="h-4 w-4 text-gray-300" />
                <p class="flex-1 text-sm font-semibold text-ink">Chapter {{ ci + 1 }}: {{ c.title }}</p>
                <UiButton size="xs" variant="ghost" :disabled="ci === 0" @click="moveChapter(c, -1)">↑</UiButton>
                <UiButton size="xs" variant="ghost" :disabled="ci === tutorial.chapters.length - 1" @click="moveChapter(c, 1)">↓</UiButton>
                <UiButton size="xs" variant="ghost" @click="renameChapter(c)"><Pencil class="h-3.5 w-3.5" /></UiButton>
                <UiButton size="xs" variant="ghost" @click="newLesson(c.id)"><Plus class="h-3.5 w-3.5" /> Lesson</UiButton>
                <UiButton size="xs" variant="ghost" class="text-red-600" @click="deleteChapter(c)"><Trash2 class="h-3.5 w-3.5" /></UiButton>
              </div>
              <ul>
                <li v-for="(l, li) in c.lessons" :key="l.id" class="flex items-center gap-3 px-5 py-2 pl-12 text-sm hover:bg-surface-muted">
                  <span class="flex-1 truncate text-ink">{{ l.title }} <span class="text-xs text-ink-muted">· {{ l.readingTimeMin }} min · /{{ l.slug }}</span></span>
                  <UiButton size="xs" variant="ghost" :disabled="li === 0" @click="moveLesson(c.lessons, l, -1)">↑</UiButton>
                  <UiButton size="xs" variant="ghost" :disabled="li === c.lessons.length - 1" @click="moveLesson(c.lessons, l, 1)">↓</UiButton>
                  <UiButton size="xs" variant="ghost" @click="editLesson(l)"><Pencil class="h-3.5 w-3.5" /></UiButton>
                  <UiButton v-if="auth.isAdmin" size="xs" variant="ghost" class="text-red-600" @click="deleteLesson(l)"><Trash2 class="h-3.5 w-3.5" /></UiButton>
                </li>
                <li v-if="!c.lessons.length" class="px-5 py-2 pl-12 text-xs text-ink-muted">No lessons yet.</li>
              </ul>
            </div>
            <div v-if="tutorial.lessons.length">
              <p class="bg-surface-muted px-5 py-2 text-sm font-semibold text-ink">Lessons without a chapter</p>
              <ul>
                <li v-for="l in tutorial.lessons" :key="l.id" class="flex items-center gap-3 px-5 py-2 pl-12 text-sm hover:bg-surface-muted">
                  <span class="flex-1 truncate text-ink">{{ l.title }}</span>
                  <UiButton size="xs" variant="ghost" @click="editLesson(l)"><Pencil class="h-3.5 w-3.5" /></UiButton>
                  <UiButton v-if="auth.isAdmin" size="xs" variant="ghost" class="text-red-600" @click="deleteLesson(l)"><Trash2 class="h-3.5 w-3.5" /></UiButton>
                </li>
              </ul>
            </div>
          </div>
          <form class="flex gap-2 border-t border-line px-5 py-3" @submit.prevent="addChapter">
            <UiInput v-model="chapterTitle" placeholder="New chapter title…" class="flex-1" />
            <UiButton type="submit" variant="secondary"><Plus class="h-4 w-4" /> Add chapter</UiButton>
          </form>
        </UiCard>
        <UiAlert v-else tone="info">Save the tutorial to start adding chapters and lessons.</UiAlert>
      </div>

      <aside class="space-y-4">
        <UiCard class="space-y-4">
          <UiInput v-model="form.slug" label="Slug" :error="errors.slug" hint="Leave empty to generate from the title." />
          <UiSelect v-model="form.categoryId" :options="categoryOptions" label="Category" />
          <UiInput v-model="form.order" label="Display order" type="number" min="0" />
          <UiInput v-model="form.coverImageUrl" label="Cover image URL" :error="errors.coverImageUrl" />
        </UiCard>
      </aside>
    </div>

    <LessonEditorModal v-model="lessonModal" :lesson="editingLesson" kind="tutorial" :chapters="tutorial?.chapters ?? []" :errors="lessonErrors.errors" :saving="lessonSaving" @save="saveLesson" />
  </div>
</template>
