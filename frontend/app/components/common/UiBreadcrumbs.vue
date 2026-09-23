<script setup lang="ts">
import { ChevronRight, Home } from 'lucide-vue-next';

export interface Crumb {
  label: string;
  to?: string;
}

const props = defineProps<{ items: Crumb[] }>();
const config = useRuntimeConfig();

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      key: 'breadcrumb-jsonld',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [{ label: 'Home', to: '/' }, ...props.items].map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.label,
          ...(c.to ? { item: `${config.public.siteUrl}${c.to}` } : {}),
        })),
      }),
    },
  ],
}));
</script>

<template>
  <nav aria-label="Breadcrumb" class="no-scrollbar overflow-x-auto">
    <ol class="flex items-center gap-1 whitespace-nowrap text-sm text-ink-muted">
      <li>
        <NuxtLink to="/" class="inline-flex items-center hover:text-ink" aria-label="Home">
          <Home class="h-4 w-4" />
        </NuxtLink>
      </li>
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-1">
        <ChevronRight class="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
        <NuxtLink v-if="item.to && i < items.length - 1" :to="item.to" class="hover:text-ink">{{ item.label }}</NuxtLink>
        <span v-else class="font-medium text-ink" aria-current="page">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
