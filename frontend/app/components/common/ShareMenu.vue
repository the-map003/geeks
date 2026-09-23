<script setup lang="ts">
import { Check, Link2, Linkedin, Share2, Twitter } from 'lucide-vue-next';

const props = withDefaults(defineProps<{ title: string; path?: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' });
const config = useRuntimeConfig();
const route = useRoute();
const ui = useUiStore();
const copied = ref(false);
const canNativeShare = ref(false);
onMounted(() => {
  canNativeShare.value = typeof navigator !== 'undefined' && 'share' in navigator;
});

const url = computed(() => `${config.public.siteUrl}${props.path ?? route.path}`);
const encoded = computed(() => encodeURIComponent(url.value));
const text = computed(() => encodeURIComponent(props.title));

async function copy() {
  try {
    await navigator.clipboard.writeText(url.value);
    copied.value = true;
    ui.success('Link copied');
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    ui.error('Could not copy link');
  }
}

async function nativeShare() {
  if (import.meta.client && navigator.share) {
    try {
      await navigator.share({ title: props.title, url: url.value });
    } catch {
      /* cancelled */
    }
  }
}
</script>

<template>
  <UiDropdown align="right" width="w-52">
    <template #trigger>
      <UiButton variant="secondary" :size="size" aria-label="Share">
        <Share2 class="h-4 w-4" />
        <span>Share</span>
      </UiButton>
    </template>
    <UiMenuItem @click="copy">
      <Check v-if="copied" class="h-4 w-4 text-green-600" />
      <Link2 v-else class="h-4 w-4 text-ink-muted" />
      Copy link
    </UiMenuItem>
    <a :href="`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`" target="_blank" rel="noopener noreferrer" role="menuitem" class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-strong">
      <Twitter class="h-4 w-4 text-ink-muted" /> Share on X
    </a>
    <a :href="`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`" target="_blank" rel="noopener noreferrer" role="menuitem" class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-strong">
      <Linkedin class="h-4 w-4 text-ink-muted" /> Share on LinkedIn
    </a>
    <UiMenuItem v-if="canNativeShare" @click="nativeShare"><Share2 class="h-4 w-4 text-ink-muted" /> More options…</UiMenuItem>
  </UiDropdown>
</template>
