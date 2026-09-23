<script setup lang="ts">
import { Flag, MessageSquare, Pencil, ShieldCheck, ThumbsUp, Trash2 } from 'lucide-vue-next';
import type { Comment } from '~/types/api';
import { timeAgo } from '~/utils/format';

const props = withDefaults(defineProps<{ comment: Comment; isReply?: boolean }>(), { isReply: false });
const emit = defineEmits<{
  reply: [comment: Comment];
  edit: [comment: Comment, content: string];
  delete: [comment: Comment];
  report: [comment: Comment];
  like: [comment: Comment];
}>();

const auth = useAuthStore();
const editing = ref(false);
const draft = ref(props.comment.content);

const isOwner = computed(() => auth.user?.id === props.comment.author.id);
const canModerate = computed(() => auth.isEditor);
const isStaff = computed(() => props.comment.author.role !== 'USER');

function saveEdit() {
  if (draft.value.trim().length < 2) return;
  emit('edit', props.comment, draft.value.trim());
  editing.value = false;
}
</script>

<template>
  <div class="flex gap-3" :class="isReply ? 'py-3' : 'py-4'">
    <NuxtLink :to="`/u/${comment.author.username}`" class="shrink-0">
      <UiAvatar :name="comment.author.displayName" :src="comment.author.avatarUrl" :size="isReply ? 'sm' : 'md'" />
    </NuxtLink>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <NuxtLink :to="`/u/${comment.author.username}`" class="font-semibold text-ink hover:text-brand-700">{{ comment.author.displayName }}</NuxtLink>
        <UiBadge v-if="isStaff" tone="brand" size="xs"><ShieldCheck class="h-3 w-3" /> {{ comment.author.role === 'EDITOR' ? 'Editor' : 'Staff' }}</UiBadge>
        <span class="text-ink-muted">· {{ timeAgo(comment.createdAt) }}</span>
        <span v-if="comment.updatedAt !== comment.createdAt && !comment.isDeleted" class="text-xs text-ink-muted">(edited)</span>
        <UiBadge v-if="comment.isHidden && canModerate" tone="amber" size="xs">Hidden</UiBadge>
      </div>

      <div v-if="editing" class="mt-2">
        <UiTextarea v-model="draft" :rows="3" :maxlength="2000" show-count />
        <div class="mt-2 flex gap-2">
          <UiButton size="sm" @click="saveEdit">Save</UiButton>
          <UiButton size="sm" variant="ghost" @click="editing = false; draft = comment.content">Cancel</UiButton>
        </div>
      </div>
      <p v-else class="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed" :class="comment.isDeleted || comment.isHidden ? 'italic text-ink-muted' : 'text-ink'">
        {{ comment.content }}
      </p>

      <div v-if="!comment.isDeleted" class="mt-2 flex flex-wrap items-center gap-1 text-xs">
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition hover:bg-surface-strong"
          :class="comment.liked ? 'text-brand-700' : 'text-ink-muted'"
          :aria-pressed="comment.liked"
          @click="emit('like', comment)"
        >
          <ThumbsUp class="h-3.5 w-3.5" :class="comment.liked ? 'fill-current' : ''" /> {{ comment.likeCount }}
        </button>
        <button v-if="!isReply" type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-ink-muted transition hover:bg-surface-strong" @click="emit('reply', comment)">
          <MessageSquare class="h-3.5 w-3.5" /> Reply
        </button>
        <button v-if="isOwner" type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-ink-muted transition hover:bg-surface-strong" @click="editing = true">
          <Pencil class="h-3.5 w-3.5" /> Edit
        </button>
        <button v-if="isOwner || canModerate" type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-ink-muted transition hover:bg-red-50 hover:text-red-600" @click="emit('delete', comment)">
          <Trash2 class="h-3.5 w-3.5" /> Delete
        </button>
        <button v-if="auth.isAuthenticated && !isOwner" type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-ink-muted transition hover:bg-surface-strong" @click="emit('report', comment)">
          <Flag class="h-3.5 w-3.5" /> Report
        </button>
      </div>

      <slot />
    </div>
  </div>
</template>
