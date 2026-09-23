<script setup lang="ts">
import { ThumbsUp } from 'lucide-vue-next';

const props = withDefaults(defineProps<{ slug: string; liked?: boolean; count: number; size?: 'sm' | 'md' }>(), { liked: false, size: 'md' });

const auth = useAuthStore();
const ui = useUiStore();
const api = useApi();
const route = useRoute();

const liked = ref(props.liked);
const count = ref(props.count);
const loading = ref(false);
watch(() => props.liked, (v) => (liked.value = v));
watch(() => props.count, (v) => (count.value = v));

async function toggle() {
  if (!auth.isAuthenticated) {
    ui.info('Sign in to like articles');
    return navigateTo({ path: '/login', query: { redirect: route.fullPath } });
  }
  loading.value = true;
  try {
    const res = await api.post<{ liked: boolean; likeCount: number }>(`/articles/${props.slug}/like`);
    liked.value = res.liked;
    count.value = res.likeCount;
  } catch (err) {
    ui.error('Could not update like', isApiError(err) ? err.message : undefined);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UiButton :variant="liked ? 'primary' : 'secondary'" :size="size" :loading="loading" :aria-pressed="liked" @click="toggle">
    <ThumbsUp class="h-4 w-4" :class="liked ? 'fill-current' : ''" />
    <span>{{ count }}</span>
    <span class="sr-only">likes</span>
  </UiButton>
</template>
