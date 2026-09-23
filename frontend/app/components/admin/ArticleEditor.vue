<script setup lang="ts">
import { Eye, Save } from 'lucide-vue-next';
import type { ContentStatus } from '~/types/api';

const props = defineProps<{ id?: string | null }>();
const api = useApi();
const ui = useUiStore();
const auth = useAuthStore();
const { categoryOptions } = useAdminMeta();
const { errors, apply, clear } = useFormErrors();

interface AdminArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  categoryId: string | null;
  difficulty: string | null;
  isFeatured: boolean;
  status: ContentStatus;
  tags: Array<{ name: string }>;
}

const form = reactive({ title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', categoryId: '', difficulty: '', tags: '', isFeatured: false });
const status = ref<ContentStatus>('DRAFT');
const slug = ref('');
const loading = ref(!!props.id);
const saving = ref(false);
const loadError = ref('');

onMounted(async () => {
  if (!props.id) return;
  try {
    const res = await api.get<{ article: AdminArticle }>(`/admin/articles/${props.id}`);
    const a = res.article;
    Object.assign(form, { title: a.title, slug: a.slug, excerpt: a.excerpt, content: a.content, coverImageUrl: a.coverImageUrl ?? '', categoryId: a.categoryId ?? '', difficulty: a.difficulty ?? '', tags: a.tags.map((t) => t.name).join(', '), isFeatured: a.isFeatured });
    status.value = a.status;
    slug.value = a.slug;
  } catch (err) {
    loadError.value = isApiError(err) ? err.message : 'Failed to load article';
  } finally {
    loading.value = false;
  }
});

function payload() {
  return {
    title: form.title,
    slug: form.slug || undefined,
    excerpt: form.excerpt,
    content: form.content,
    coverImageUrl: form.coverImageUrl || null,
    categoryId: form.categoryId || null,
    difficulty: form.difficulty || null,
    tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    isFeatured: form.isFeatured,
  };
}

async function save() {
  clear();
  saving.value = true;
  try {
    if (props.id) {
      const res = await api.put<{ article: AdminArticle }>(`/admin/articles/${props.id}`, payload());
      slug.value = res.article.slug;
      form.slug = res.article.slug;
      ui.success('Article saved');
    } else {
      const res = await api.post<{ article: AdminArticle }>('/admin/articles', payload());
      ui.success('Article created', 'It is saved as a draft.');
      navigateTo(`/admin/articles/${res.article.id}`, { replace: true });
    }
  } catch (err) {
    apply(err);
    ui.error('Could not save', isApiError(err) && !err.errors.length ? err.message : 'Please fix the highlighted fields.');
  } finally {
    saving.value = false;
  }
}

async function setStatus(action: 'publish' | 'unpublish' | 'archive') {
  if (!props.id) return;
  try {
    const res = await api.post<{ item: { status: ContentStatus } }>(`/admin/articles/${props.id}/${action}`);
    status.value = res.item.status;
    ui.success(`Article ${res.item.status.toLowerCase()}`);
  } catch (err) {
    ui.error(`Could not ${action}`, isApiError(err) ? err.message : undefined);
  }
}
</script>

<template>
  <div>
    <AdminPageHeader :title="id ? 'Edit article' : 'New article'" :subtitle="id ? `Status: ${status.toLowerCase()}` : 'Articles start as drafts; an admin publishes them.'">
      <UiButton v-if="id && slug" :to="`/articles/${slug}`" variant="secondary"><Eye class="h-4 w-4" /> Preview</UiButton>
      <template v-if="id && auth.isAdmin">
        <UiButton v-if="status !== 'PUBLISHED'" variant="secondary" @click="setStatus('publish')">Publish</UiButton>
        <UiButton v-else variant="secondary" @click="setStatus('unpublish')">Unpublish</UiButton>
      </template>
      <UiButton :loading="saving" @click="save"><Save class="h-4 w-4" /> Save</UiButton>
    </AdminPageHeader>

    <div v-if="loading" class="space-y-4"><UiSkeleton variant="rect" class="h-10" /><UiSkeleton variant="rect" class="h-64" /></div>
    <UiErrorState v-else-if="loadError" :message="loadError" retry-label="Back to list" @retry="navigateTo('/admin/articles')" />
    <form v-else class="grid gap-6 lg:grid-cols-[1fr_320px]" novalidate @submit.prevent="save">
      <div class="space-y-4">
        <UiInput v-model="form.title" label="Title" :error="errors.title" required />
        <UiTextarea v-model="form.excerpt" label="Excerpt" :rows="2" :maxlength="500" show-count :error="errors.excerpt" required hint="Shown in cards and search results." />
        <MarkdownEditor v-model="form.content" label="Content" :error="errors.content" required :rows="24" hint="Markdown. Use ::: tabs … ::: around several code fences for a tabbed multi-language block." />
      </div>
      <aside class="space-y-4">
        <UiCard class="space-y-4">
          <UiInput v-model="form.slug" label="Slug" :error="errors.slug" hint="Leave empty to generate from the title." />
          <UiSelect v-model="form.categoryId" :options="categoryOptions" label="Category" :error="errors.categoryId" />
          <UiSelect v-model="form.difficulty" :options="[{ value: '', label: 'None' }, { value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }]" label="Difficulty" />
          <UiInput v-model="form.tags" label="Tags" placeholder="algorithms, beginner" hint="Comma separated. New tags are created automatically." :error="errors.tags" />
          <UiInput v-model="form.coverImageUrl" label="Cover image URL" placeholder="https://…" :error="errors.coverImageUrl" />
          <label class="flex items-center gap-2 text-sm text-ink"><input v-model="form.isFeatured" type="checkbox" class="h-4 w-4 rounded border-line-strong text-brand-600" /> Feature on the homepage</label>
        </UiCard>
        <UiButton type="submit" block :loading="saving"><Save class="h-4 w-4" /> Save article</UiButton>
      </aside>
    </form>
  </div>
</template>
