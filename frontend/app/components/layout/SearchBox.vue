<script setup lang="ts">
import { Search, X } from 'lucide-vue-next';

withDefaults(defineProps<{ size?: 'md' | 'lg'; placeholder?: string; autofocus?: boolean }>(), {
  size: 'md',
  placeholder: 'Search articles, problems, courses…',
  autofocus: false,
});
const emit = defineEmits<{ submitted: [] }>();

const route = useRoute();
const router = useRouter();
const query = ref(typeof route.query.q === 'string' ? route.query.q : '');
const input = ref<HTMLInputElement | null>(null);

watch(
  () => route.query.q,
  (q) => {
    if (route.path === '/search') query.value = typeof q === 'string' ? q : '';
  },
);

function submit() {
  const q = query.value.trim();
  if (q.length < 2) return;
  router.push({ path: '/search', query: { q } });
  emit('submitted');
}

onMounted(() => {
  if (input.value && input.value.hasAttribute('data-autofocus')) input.value.focus();
});
</script>

<template>
  <form role="search" class="relative w-full" @submit.prevent="submit">
    <label class="sr-only" for="site-search">Search</label>
    <Search class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'" aria-hidden="true" />
    <input
      id="site-search"
      ref="input"
      v-model="query"
      type="search"
      :placeholder="placeholder"
      :data-autofocus="autofocus || undefined"
      autocomplete="off"
      class="w-full rounded-full border bg-surface text-ink placeholder:text-ink-muted transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      :class="size === 'lg' ? 'h-14 border-line pl-12 pr-32 text-base shadow-md' : 'h-9 border-brand-400 pl-9 pr-9 text-[15px]'"
    />
    <button
      v-if="query && size === 'md'"
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:bg-surface-strong hover:text-ink"
      aria-label="Clear search"
      @click="query = ''"
    >
      <X class="h-4 w-4" />
    </button>
    <UiButton v-if="size === 'lg'" type="submit" size="md" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full">Search</UiButton>
  </form>
</template>
