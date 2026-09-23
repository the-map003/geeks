<script setup lang="ts">
import type { Category } from '~/types/api';

defineProps<{ tree: Category[] }>();
</script>

<template>
  <NavDropdown label="Tutorials" width="w-[880px] max-w-[calc(100vw-2rem)]">
    <div class="p-4">
      <div v-if="tree.length" class="grid grid-cols-3 gap-x-8 gap-y-6 xl:grid-cols-4">
        <div v-for="cat in tree.slice(0, 8)" :key="cat.id">
          <NuxtLink :to="`/categories/${cat.slug}`" class="font-heading text-[15px] font-bold text-ink-heading hover:text-brand-600">{{ cat.name }}</NuxtLink>
          <ul class="mt-2 space-y-1.5">
            <li v-for="child in (cat.children ?? []).slice(0, 6)" :key="child.id">
              <NuxtLink :to="`/categories/${child.slug}`" class="block text-[14px] text-ink-muted hover:text-brand-600">{{ child.name }}</NuxtLink>
            </li>
            <li v-if="(cat.children?.length ?? 0) > 6">
              <NuxtLink :to="`/categories/${cat.slug}`" class="text-xs font-semibold text-brand-600 hover:underline">View all →</NuxtLink>
            </li>
          </ul>
        </div>
      </div>
      <p v-else class="text-sm text-ink-muted">Categories are loading…</p>
      <div class="mt-5 flex items-center justify-between border-t border-line pt-3">
        <p class="text-sm text-ink-muted">Structured, chapter-based learning paths with progress tracking.</p>
        <NuxtLink to="/tutorials" class="text-sm font-semibold text-brand-600 hover:underline">Browse all tutorials →</NuxtLink>
      </div>
    </div>
  </NavDropdown>
</template>
