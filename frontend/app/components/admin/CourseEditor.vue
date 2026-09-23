<script setup lang="ts">
import { Eye, Pencil, Plus, Save, Trash2 } from 'lucide-vue-next';
import type { ContentStatus } from '~/types/api';
import type { LessonDraft } from './LessonEditorModal.vue';

const props = defineProps<{ id?: string | null }>();
const api = useApi();
const ui = useUiStore();
const auth = useAuthStore();
const { categoryOptions, staffOptions } = useAdminMeta();
const { errors, apply, clear } = useFormErrors();

interface LessonRow { id: string; title: string; slug: string; order: number; durationMin: number; isPreview: boolean }
interface Module { id: string; title: string; description: string | null; order: number; lessons: LessonRow[] }
interface AdminCourse { id: string; title: string; slug: string; subtitle: string | null; description: string; coverImageUrl: string | null; level: string; price: string; durationHours: number; categoryId: string | null; instructorId: string; isFeatured: boolean; status: ContentStatus; modules: Module[] }

const form = reactive({ title: '', slug: '', subtitle: '', description: '', coverImageUrl: '', level: 'ALL_LEVELS', price: 0, durationHours: 0, categoryId: '', instructorId: '', isFeatured: false });
const course = ref<AdminCourse | null>(null);
const loading = ref(!!props.id);
const saving = ref(false);

async function load() {
  if (!props.id) return;
  loading.value = true;
  try {
    const res = await api.get<{ course: AdminCourse }>(`/admin/courses/${props.id}`);
    course.value = res.course;
    const c = res.course;
    Object.assign(form, { title: c.title, slug: c.slug, subtitle: c.subtitle ?? '', description: c.description, coverImageUrl: c.coverImageUrl ?? '', level: c.level, price: Number(c.price), durationHours: c.durationHours, categoryId: c.categoryId ?? '', instructorId: c.instructorId, isFeatured: c.isFeatured });
  } catch (err) {
    ui.error('Failed to load course', isApiError(err) ? err.message : undefined);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function save() {
  clear();
  saving.value = true;
  const body = { title: form.title, slug: form.slug || undefined, subtitle: form.subtitle || null, description: form.description, coverImageUrl: form.coverImageUrl || null, level: form.level, price: Number(form.price) || 0, durationHours: Number(form.durationHours) || 0, categoryId: form.categoryId || null, instructorId: form.instructorId || undefined, isFeatured: form.isFeatured };
  try {
    if (props.id) {
      await api.put(`/admin/courses/${props.id}`, body);
      ui.success('Course saved');
      await load();
    } else {
      const res = await api.post<{ course: AdminCourse }>('/admin/courses', body);
      ui.success('Course created', 'Now add modules and lessons.');
      navigateTo(`/admin/courses/${res.course.id}`, { replace: true });
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
    await api.post(`/admin/courses/${props.id}/${action}`);
    ui.success(`Course ${action === 'publish' ? 'published' : 'moved to drafts'}`);
    await load();
  } catch (err) {
    ui.error(`Could not ${action}`, isApiError(err) ? err.message : undefined);
  }
}

const moduleTitle = ref('');
async function addModule() {
  if (!moduleTitle.value.trim()) return;
  await api.post(`/admin/courses/${props.id}/modules`, { title: moduleTitle.value.trim() });
  moduleTitle.value = '';
  await load();
}
async function renameModule(m: Module) {
  const title = window.prompt('Module title', m.title);
  if (!title || title === m.title) return;
  await api.put(`/admin/courses/modules/${m.id}`, { title, description: m.description, order: m.order });
  await load();
}
async function deleteModule(m: Module) {
  if (!window.confirm(`Delete module “${m.title}” and its ${m.lessons.length} lessons?`)) return;
  await api.del(`/admin/courses/modules/${m.id}`);
  await load();
}

const lessonModal = ref(false);
const editingLesson = ref<LessonDraft | null>(null);
const activeModuleId = ref<string | null>(null);
const lessonSaving = ref(false);
const lessonErrors = useFormErrors();

function newLesson(moduleId: string) {
  activeModuleId.value = moduleId;
  editingLesson.value = { title: '', slug: '', content: '', durationMin: 10, isPreview: false };
  lessonErrors.clear();
  lessonModal.value = true;
}
async function editLesson(l: LessonRow) {
  const res = await api.get<{ lesson: LessonRow & { content: string; videoUrl: string | null } }>(`/admin/courses/lessons/${l.id}`);
  editingLesson.value = { id: l.id, title: res.lesson.title, slug: res.lesson.slug, content: res.lesson.content, durationMin: res.lesson.durationMin, isPreview: res.lesson.isPreview, videoUrl: res.lesson.videoUrl, order: res.lesson.order };
  lessonErrors.clear();
  lessonModal.value = true;
}
async function saveLesson(draft: LessonDraft) {
  lessonSaving.value = true;
  lessonErrors.clear();
  const body = { title: draft.title, slug: draft.slug || undefined, content: draft.content, durationMin: draft.durationMin ?? 10, isPreview: !!draft.isPreview, videoUrl: draft.videoUrl || null, order: draft.order };
  try {
    if (draft.id) await api.put(`/admin/courses/lessons/${draft.id}`, body);
    else await api.post(`/admin/courses/modules/${activeModuleId.value}/lessons`, body);
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
  if (!window.confirm(`Delete lesson “${l.title}”?`)) return;
  await api.del(`/admin/courses/lessons/${l.id}`);
  await load();
}
</script>

<template>
  <div>
    <AdminPageHeader :title="id ? 'Edit course' : 'New course'" :subtitle="course ? `Status: ${course.status.toLowerCase()} · ${course.modules.length} modules` : 'Create the course first, then add modules and lessons.'">
      <UiButton v-if="course" :to="`/courses/${course.slug}`" variant="secondary"><Eye class="h-4 w-4" /> Preview</UiButton>
      <template v-if="course && auth.isAdmin">
        <UiButton v-if="course.status !== 'PUBLISHED'" variant="secondary" @click="setStatus('publish')">Publish</UiButton>
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
          <UiInput v-model="form.subtitle" label="Subtitle" :error="errors.subtitle" />
          <MarkdownEditor v-model="form.description" label="Description" :rows="12" :error="errors.description" required hint="Include a “What you'll learn” list and prerequisites." />
        </UiCard>

        <UiCard v-if="course" padding="none">
          <div class="border-b border-line px-5 py-3"><h2 class="font-semibold text-ink">Curriculum</h2></div>
          <div class="divide-y divide-line">
            <div v-for="(m, mi) in course.modules" :key="m.id">
              <div class="flex items-center gap-2 bg-surface-muted px-5 py-2">
                <p class="flex-1 text-sm font-semibold text-ink">Module {{ mi + 1 }}: {{ m.title }}</p>
                <UiButton size="xs" variant="ghost" @click="renameModule(m)"><Pencil class="h-3.5 w-3.5" /></UiButton>
                <UiButton size="xs" variant="ghost" @click="newLesson(m.id)"><Plus class="h-3.5 w-3.5" /> Lesson</UiButton>
                <UiButton v-if="auth.isAdmin" size="xs" variant="ghost" class="text-red-600" @click="deleteModule(m)"><Trash2 class="h-3.5 w-3.5" /></UiButton>
              </div>
              <ul>
                <li v-for="l in m.lessons" :key="l.id" class="flex items-center gap-3 px-5 py-2 pl-12 text-sm hover:bg-surface-muted">
                  <span class="flex-1 truncate text-ink">{{ l.title }} <span class="text-xs text-ink-muted">· {{ l.durationMin }} min</span> <UiBadge v-if="l.isPreview" tone="blue" size="xs">preview</UiBadge></span>
                  <UiButton size="xs" variant="ghost" @click="editLesson(l)"><Pencil class="h-3.5 w-3.5" /></UiButton>
                  <UiButton v-if="auth.isAdmin" size="xs" variant="ghost" class="text-red-600" @click="deleteLesson(l)"><Trash2 class="h-3.5 w-3.5" /></UiButton>
                </li>
                <li v-if="!m.lessons.length" class="px-5 py-2 pl-12 text-xs text-ink-muted">No lessons yet.</li>
              </ul>
            </div>
          </div>
          <form class="flex gap-2 border-t border-line px-5 py-3" @submit.prevent="addModule">
            <UiInput v-model="moduleTitle" placeholder="New module title…" class="flex-1" />
            <UiButton type="submit" variant="secondary"><Plus class="h-4 w-4" /> Add module</UiButton>
          </form>
        </UiCard>
        <UiAlert v-else tone="info">Save the course to start adding modules and lessons.</UiAlert>
      </div>

      <aside class="space-y-4">
        <UiCard class="space-y-4">
          <UiInput v-model="form.slug" label="Slug" :error="errors.slug" />
          <UiSelect v-model="form.categoryId" :options="categoryOptions" label="Category" />
          <UiSelect v-model="form.instructorId" :options="[{ value: '', label: 'Me' }, ...staffOptions]" label="Instructor" />
          <UiSelect v-model="form.level" :options="[{ value: 'BEGINNER', label: 'Beginner' }, { value: 'INTERMEDIATE', label: 'Intermediate' }, { value: 'ADVANCED', label: 'Advanced' }, { value: 'ALL_LEVELS', label: 'Beginner to Advanced' }]" label="Level" />
          <UiInput v-model="form.price" label="Price (USD, 0 = free)" type="number" min="0" :error="errors.price" />
          <UiInput v-model="form.durationHours" label="Duration (hours)" type="number" min="0" />
          <UiInput v-model="form.coverImageUrl" label="Cover image URL" :error="errors.coverImageUrl" />
          <label class="flex items-center gap-2 text-sm text-ink"><input v-model="form.isFeatured" type="checkbox" class="h-4 w-4 rounded border-line-strong text-brand-600" /> Featured</label>
        </UiCard>
      </aside>
    </div>

    <LessonEditorModal v-model="lessonModal" :lesson="editingLesson" kind="course" :errors="lessonErrors.errors" :saving="lessonSaving" @save="saveLesson" />
  </div>
</template>
