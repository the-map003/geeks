<script setup lang="ts">
import { Bookmark, BookmarkCheck } from 'lucide-vue-next';
import type { BookmarkType } from '~/types/api';

const props = withDefaults(defineProps<{ type: BookmarkType; targetId: string; initial?: boolean; size?: 'sm' | 'md' | 'lg'; label?: boolean }>(), {
  initial: false,
  size: 'md',
  label: true,
});
const emit = defineEmits<{ change: [bookmarked: boolean] }>();

const auth = useAuthStore();
const ui = useUiStore();
const api = useApi();
const route = useRoute();

const bookmarked = ref(props.initial);
const loading = ref(false);
watch(() => props.initial, (v) => (bookmarked.value = v));

async function toggle() {
  if (!auth.isAuthenticated) {
    ui.info('Sign in to save bookmarks');
    return navigateTo({ path: '/login', query: { redirect: route.fullPath } });
  }
  loading.value = true;
  const next = !bookmarked.value;
  bookmarked.value = next; // optimistic
  try {
    if (next) await api.post('/bookmarks', { type: props.type, targetId: props.targetId });
    else await api.del('/bookmarks', { type: props.type, targetId: props.targetId });
    emit('change', next);
    ui.success(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
  } catch (err) {
    bookmarked.value = !next;
    ui.error('Could not update bookmark', isApiError(err) ? err.message : undefined);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UiButton :variant="bookmarked ? 'primary' : 'secondary'" :size="size" :loading="loading" :icon="!label" :aria-pressed="bookmarked" :aria-label="bookmarked ? 'Remove bookmark' : 'Save bookmark'" @click="toggle">
    <BookmarkCheck v-if="bookmarked" class="h-4 w-4" />
    <Bookmark v-else class="h-4 w-4" />
    <span v-if="label">{{ bookmarked ? 'Saved' : 'Save' }}</span>
  </UiButton>
</template>
