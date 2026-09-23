<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next';
import type { Comment, CommentTarget, Paginated } from '~/types/api';

const props = withDefaults(defineProps<{ targetType: CommentTarget; targetId: string; initialCount?: number }>(), { initialCount: 0 });

const api = useApi();
const auth = useAuthStore();
const ui = useUiStore();
const route = useRoute();

const sort = ref<'top' | 'newest' | 'oldest'>('top');
const page = ref(1);
const comments = ref<Comment[]>([]);
const total = ref(props.initialCount);
const totalPages = ref(1);
const status = ref<'idle' | 'pending' | 'error' | 'success'>('idle');
const errorMessage = ref('');

const composer = ref('');
const posting = ref(false);
const replyTo = ref<Comment | null>(null);
const replyDraft = ref('');
const reportTarget = ref<Comment | null>(null);
const reportReason = ref('SPAM');
const reportDetails = ref('');
const reporting = ref(false);
const deleteTarget = ref<Comment | null>(null);

const sortTabs = [
  { value: 'top', label: 'Top' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

async function load(reset = false) {
  if (reset) {
    page.value = 1;
    comments.value = [];
  }
  status.value = 'pending';
  try {
    const res = await api.get<Paginated<Comment>>('/comments', { targetType: props.targetType, targetId: props.targetId, sort: sort.value, page: page.value, pageSize: 10 });
    comments.value = reset || page.value === 1 ? res.items : [...comments.value, ...res.items];
    total.value = res.total;
    totalPages.value = res.totalPages;
    status.value = 'success';
  } catch (err) {
    status.value = 'error';
    errorMessage.value = isApiError(err) ? err.message : 'Failed to load comments';
  }
}

onMounted(() => load(true));
watch(sort, () => load(true));
watch(() => props.targetId, () => load(true));

function loadMore() {
  if (page.value >= totalPages.value) return;
  page.value++;
  load();
}

function requireAuth(): boolean {
  if (auth.isAuthenticated) return true;
  ui.info('Sign in to join the discussion');
  navigateTo({ path: '/login', query: { redirect: route.fullPath } });
  return false;
}

async function post() {
  if (!requireAuth()) return;
  if (composer.value.trim().length < 2) return;
  posting.value = true;
  try {
    const res = await api.post<{ comment: Comment }>('/comments', { targetType: props.targetType, targetId: props.targetId, content: composer.value.trim() });
    comments.value = [{ ...res.comment, replies: [] }, ...comments.value];
    total.value++;
    composer.value = '';
    ui.success('Comment posted');
  } catch (err) {
    ui.error('Could not post comment', isApiError(err) ? err.message : undefined);
  } finally {
    posting.value = false;
  }
}

async function postReply() {
  if (!replyTo.value || !requireAuth()) return;
  if (replyDraft.value.trim().length < 2) return;
  posting.value = true;
  const parent = replyTo.value;
  try {
    const res = await api.post<{ comment: Comment }>('/comments', { targetType: props.targetType, targetId: props.targetId, parentId: parent.id, content: replyDraft.value.trim() });
    parent.replies = [...(parent.replies ?? []), res.comment];
    parent.replyCount++;
    replyDraft.value = '';
    replyTo.value = null;
    ui.success('Reply posted');
  } catch (err) {
    ui.error('Could not post reply', isApiError(err) ? err.message : undefined);
  } finally {
    posting.value = false;
  }
}

async function loadAllReplies(parent: Comment) {
  try {
    const res = await api.get<Paginated<Comment>>(`/comments/${parent.id}/replies`, { page: 1, pageSize: 50 });
    parent.replies = res.items;
  } catch (err) {
    ui.error('Could not load replies', isApiError(err) ? err.message : undefined);
  }
}

async function like(comment: Comment) {
  if (!requireAuth()) return;
  try {
    const res = await api.post<{ liked: boolean; likeCount: number }>(`/comments/${comment.id}/like`);
    comment.liked = res.liked;
    comment.likeCount = res.likeCount;
  } catch (err) {
    ui.error('Could not update like', isApiError(err) ? err.message : undefined);
  }
}

async function edit(comment: Comment, content: string) {
  try {
    const res = await api.patch<{ comment: Comment }>(`/comments/${comment.id}`, { content });
    comment.content = res.comment.content;
    comment.updatedAt = res.comment.updatedAt;
    ui.success('Comment updated');
  } catch (err) {
    ui.error('Could not update comment', isApiError(err) ? err.message : undefined);
  }
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target) return;
  try {
    await api.del(`/comments/${target.id}`);
    target.isDeleted = true;
    target.content = '[deleted]';
    ui.success('Comment deleted');
  } catch (err) {
    ui.error('Could not delete comment', isApiError(err) ? err.message : undefined);
  } finally {
    deleteTarget.value = null;
  }
}

async function submitReport() {
  const target = reportTarget.value;
  if (!target) return;
  reporting.value = true;
  try {
    await api.post(`/comments/${target.id}/report`, { reason: reportReason.value, details: reportDetails.value || undefined });
    ui.success('Report submitted', 'Thanks — our moderators will take a look.');
    reportTarget.value = null;
    reportDetails.value = '';
  } catch (err) {
    ui.error('Could not submit report', isApiError(err) ? err.message : undefined);
  } finally {
    reporting.value = false;
  }
}

const reasonOptions = [
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'HARASSMENT', label: 'Harassment or hate' },
  { value: 'OFF_TOPIC', label: 'Off topic' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'OTHER', label: 'Something else' },
];
</script>

<template>
  <section aria-labelledby="comments-heading">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="comments-heading" class="inline-flex items-center gap-2 text-xl font-bold text-ink">
        <MessageSquare class="h-5 w-5 text-brand-500" /> Discussion <span class="text-base font-medium text-ink-muted">({{ total }})</span>
      </h2>
      <UiTabs v-model="sort" :tabs="sortTabs" variant="pills" size="sm" :scrollable="false" />
    </div>

    <!-- Composer -->
    <div class="mt-4 rounded-lg border border-line bg-surface p-4">
      <ClientOnly>
        <div v-if="auth.isAuthenticated" class="flex gap-3">
          <UiAvatar :name="auth.displayName" :src="auth.user?.profile.avatarUrl" size="sm" class="mt-1 hidden sm:inline-flex" />
          <div class="flex-1">
            <UiTextarea v-model="composer" placeholder="Share your thoughts, ask a question or add a tip…" :rows="3" :maxlength="2000" show-count />
            <div class="mt-2 flex justify-end">
              <UiButton size="sm" :loading="posting" :disabled="composer.trim().length < 2" @click="post">Post comment</UiButton>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-2 py-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <p class="text-sm text-ink-muted">Sign in to join the discussion.</p>
          <UiButton :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" size="sm" variant="secondary">Sign in</UiButton>
        </div>
      </ClientOnly>
    </div>

    <!-- List -->
    <div class="mt-4">
      <div v-if="status === 'pending' && comments.length === 0" class="space-y-4">
        <div v-for="i in 3" :key="i" class="flex gap-3">
          <UiSkeleton variant="circle" />
          <div class="flex-1"><UiSkeleton :lines="2" /></div>
        </div>
      </div>
      <UiErrorState v-else-if="status === 'error'" :message="errorMessage" compact @retry="load(true)" />
      <UiEmptyState v-else-if="status === 'success' && comments.length === 0" title="No comments yet" description="Be the first to start the discussion." compact :icon="MessageSquare" />
      <div v-else class="divide-y divide-line">
        <CommentItem v-for="c in comments" :key="c.id" :comment="c" @like="like" @reply="replyTo = $event; replyDraft = ''" @edit="edit" @delete="deleteTarget = $event" @report="reportTarget = $event">
          <div v-if="c.replies?.length || replyTo?.id === c.id" class="mt-2 border-l-2 border-line pl-4">
            <div class="divide-y divide-line/70">
              <CommentItem v-for="r in c.replies" :key="r.id" :comment="r" is-reply @like="like" @edit="edit" @delete="deleteTarget = $event" @report="reportTarget = $event" />
            </div>
            <button v-if="(c.replies?.length ?? 0) < c.replyCount" type="button" class="py-2 text-xs font-semibold text-brand-600 hover:underline" @click="loadAllReplies(c)">
              Show all {{ c.replyCount }} replies
            </button>
            <div v-if="replyTo?.id === c.id" class="py-3">
              <UiTextarea v-model="replyDraft" :placeholder="`Reply to ${c.author.displayName}…`" :rows="2" :maxlength="2000" />
              <div class="mt-2 flex gap-2">
                <UiButton size="sm" :loading="posting" :disabled="replyDraft.trim().length < 2" @click="postReply">Reply</UiButton>
                <UiButton size="sm" variant="ghost" @click="replyTo = null">Cancel</UiButton>
              </div>
            </div>
          </div>
        </CommentItem>
      </div>
      <div v-if="page < totalPages" class="mt-4 text-center">
        <UiButton variant="secondary" size="sm" :loading="status === 'pending'" @click="loadMore">Load more comments</UiButton>
      </div>
    </div>

    <UiModal :model-value="!!reportTarget" title="Report comment" description="Tell us what is wrong with this comment." size="sm" @update:model-value="reportTarget = null">
      <div class="space-y-3">
        <UiSelect v-model="reportReason" :options="reasonOptions" label="Reason" />
        <UiTextarea v-model="reportDetails" label="Details (optional)" :rows="3" :maxlength="500" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="reportTarget = null">Cancel</UiButton>
        <UiButton variant="danger" :loading="reporting" @click="submitReport">Submit report</UiButton>
      </template>
    </UiModal>

    <UiModal :model-value="!!deleteTarget" title="Delete comment?" description="This cannot be undone." size="sm" @update:model-value="deleteTarget = null">
      <p class="text-sm text-ink-muted">The comment will be replaced with a “deleted” placeholder so replies keep their context.</p>
      <template #footer>
        <UiButton variant="ghost" @click="deleteTarget = null">Cancel</UiButton>
        <UiButton variant="danger" @click="confirmDelete">Delete</UiButton>
      </template>
    </UiModal>
  </section>
</template>
