<script setup lang="ts">
/**
 * Brand mark: the interlocking "GG" outline (vector traced from the reference header mark,
 * 59×29.5 viewBox) with an optional "GeeksforGeeks" wordmark. The reference uses the icon
 * alone in the header, the icon + dark wordmark on the auth screen and a green wordmark in
 * the footer; `tone` selects the wordmark colour.
 */
withDefaults(
  defineProps<{
    light?: boolean;
    wordmark?: boolean;
    tone?: 'dark' | 'brand';
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }>(),
  { light: false, wordmark: false, tone: 'dark', size: 'md' },
);

const markHeight = { sm: 'h-6', md: 'h-7', lg: 'h-8', xl: 'h-10' };
const wordSize = { sm: 'text-[18px]', md: 'text-[21px]', lg: 'text-[24px]', xl: 'text-[30px]' };
</script>

<template>
  <NuxtLink to="/" class="inline-flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label="GeeksforGeeks home">
    <svg viewBox="0 0 59.077 29.539" :class="markHeight[size]" class="w-auto shrink-0" aria-hidden="true">
      <path
        d="M193.664,1471.966H169.257a9.748,9.748,0,0,1,17.129-5.146l3.55-3.57a14.77,14.77,0,0,0-25.724,8.716h-.085a14.77,14.77,0,0,0-25.724-8.716l3.55,3.57a9.748,9.748,0,0,1,17.129,5.146H134.674q-.043.565-.044,1.141a14.771,14.771,0,0,0,29.149,3.383h.778a14.769,14.769,0,0,0,29.149-3.383Q193.708,1472.531,193.664,1471.966ZM149.4,1482.855a9.749,9.749,0,0,1-9.151-6.385h18.3A9.75,9.75,0,0,1,149.4,1482.855Zm29.538,0a9.75,9.75,0,0,1-9.152-6.385h18.3A9.75,9.75,0,0,1,178.939,1482.855Z"
        transform="translate(-134.631 -1458.338)"
        :fill="light ? '#ffffff' : '#2f8d46'"
      />
    </svg>
    <span v-if="wordmark" class="font-heading font-bold leading-none tracking-tight" :class="[wordSize[size], light ? 'text-white' : tone === 'brand' ? 'text-brand-500' : 'text-[#0e1a2b]']">GeeksforGeeks</span>
  </NuxtLink>
</template>
