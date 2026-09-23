<script setup lang="ts">
/**
 * Generic lesson editor used by the tutorial and course editors.
 * The parent supplies the save handler so the same UI serves both APIs.
 */
export interface LessonDraft {
  id?: string;
  title: string;
  slug: string;
  content: string;
  order?: number;
  // tutorial-specific
  chapterId?: string | null;
  readingTimeMin?: number | null;
  // course-specific
  durationMin?: number | null;
  isPreview?: boolean;
  videoUrl?: string | null;
}

const props = defineProps<{
  modelValue: boolean;
  lesson: LessonDraft | null;
  kind: 'tutorial' | 'course';
  chapters?: Array<{ id: string; title: string }>;
  errors: Record<string, string | undefined>;
  saving: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; save: [draft: LessonDraft] }>();

const draft = reactive<LessonDraft>({ title: '', slug: '', content: '' });
watch(
  () => props.lesson,
  (l) => {
    Object.assign(draft, { title: '', slug: '', content: '', chapterId: null, readingTimeMin: null, durationMin: 10, isPreview: false, videoUrl: null, id: undefined, order: undefined }, l ?? {});
  },
  { immediate: true },
);
const chapterOptions = computed(() => [{ value: '', label: 'No chapter' }, ...(props.chapters ?? []).map((c) => ({ value: c.id, label: c.title }))]);
</script>

<template>
  <UiModal :model-value="modelValue" :title="draft.id ? 'Edit lesson' : 'New lesson'" size="xl" @update:model-value="emit('update:modelValue', $event)">
    <form class="space-y-4" novalidate @submit.prevent="emit('save', { ...draft })">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiInput v-model="draft.title" label="Title" :error="errors.title" required />
        <UiInput v-model="draft.slug" label="Slug" :error="errors.slug" hint="Leave empty to generate from the title." />
        <UiSelect v-if="kind === 'tutorial'" :model-value="draft.chapterId ?? ''" :options="chapterOptions" label="Chapter" @update:model-value="draft.chapterId = $event || null" />
        <UiInput v-if="kind === 'tutorial'" :model-value="draft.readingTimeMin ?? ''" label="Reading time (min)" type="number" min="1" max="120" hint="Leave empty to estimate from the content." @update:model-value="draft.readingTimeMin = $event ? Number($event) : null" />
        <UiInput v-if="kind === 'course'" :model-value="draft.durationMin ?? 10" label="Duration (min)" type="number" min="1" max="600" :error="errors.durationMin" @update:model-value="draft.durationMin = Number($event) || 10" />
        <UiInput v-if="kind === 'course'" :model-value="draft.videoUrl ?? ''" label="Video URL (optional, embeddable)" :error="errors.videoUrl" @update:model-value="draft.videoUrl = $event || null" />
      </div>
      <label v-if="kind === 'course'" class="flex items-center gap-2 text-sm text-ink"><input v-model="draft.isPreview" type="checkbox" class="h-4 w-4 rounded border-line-strong text-brand-600" /> Free preview lesson (visible without enrolment)</label>
      <MarkdownEditor v-model="draft.content" label="Content" :rows="18" :error="errors.content" required />
    </form>
    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancel</UiButton>
      <UiButton :loading="saving" @click="emit('save', { ...draft })">Save lesson</UiButton>
    </template>
  </UiModal>
</template>
