<script setup lang="ts">
import { Clock, Eye, FileText, MessageSquare, ThumbsUp } from 'lucide-vue-next';
import type { ArticleSummary } from '~/types/api';
import { compactNumber, formatDate } from '~/utils/format';

withDefaults(defineProps<{ article: ArticleSummary; variant?: 'card' | 'row' | 'compact' }>(), { variant: 'card' });
</script>

<template>
  <NuxtLink
    v-if="variant === 'compact'"
    :to="`/articles/${article.slug}`"
    class="group flex items-start gap-3 rounded-md p-2 transition hover:bg-surface-muted"
  >
    <div class="min-w-0 flex-1">
      <p class="line-clamp-2 text-sm font-medium text-ink group-hover:text-brand-700">{{ article.title }}</p>
      <p class="mt-1 text-xs text-ink-muted">{{ compactNumber(article.viewCount) }} views · {{ article.readingTimeMin }} min read</p>
    </div>
  </NuxtLink>

  <article
    v-else-if="variant === 'row'"
    class="group flex gap-4 rounded-lg border border-line bg-surface p-4 transition hover:border-line-strong hover:shadow-md"
  >
    <NuxtLink :to="`/articles/${article.slug}`" class="hidden w-44 shrink-0 overflow-hidden rounded-md sm:block">
      <CoverPlaceholder :seed="article.slug" :src="article.coverImageUrl" :alt="article.title" :icon="FileText" aspect="aspect-[16/10]" />
    </NuxtLink>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <NuxtLink v-if="article.category" :to="`/categories/${article.category.slug}`" class="font-semibold text-brand-600 hover:underline">{{ article.category.name }}</NuxtLink>
        <DifficultyBadge v-if="article.difficulty" :difficulty="article.difficulty" size="xs" />
      </div>
      <h3 class="mt-1.5 text-lg font-semibold leading-snug text-ink group-hover:text-brand-700">
        <NuxtLink :to="`/articles/${article.slug}`">{{ article.title }}</NuxtLink>
      </h3>
      <p class="mt-1.5 line-clamp-2 text-sm text-ink-muted">{{ article.excerpt }}</p>
      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span class="inline-flex items-center gap-1.5"><UiAvatar :name="article.author.displayName" :src="article.author.avatarUrl" size="xs" /> {{ article.author.displayName }}</span>
        <span>{{ formatDate(article.publishedAt) }}</span>
        <span class="inline-flex items-center gap-1"><Clock class="h-3.5 w-3.5" /> {{ article.readingTimeMin }} min</span>
        <span class="inline-flex items-center gap-1"><Eye class="h-3.5 w-3.5" /> {{ compactNumber(article.viewCount) }}</span>
        <span class="inline-flex items-center gap-1"><ThumbsUp class="h-3.5 w-3.5" /> {{ article.likeCount }}</span>
        <span class="inline-flex items-center gap-1"><MessageSquare class="h-3.5 w-3.5" /> {{ article.commentCount }}</span>
      </div>
    </div>
  </article>

  <article v-else class="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
    <NuxtLink :to="`/articles/${article.slug}`" tabindex="-1" aria-hidden="true">
      <CoverPlaceholder :seed="article.slug" :src="article.coverImageUrl" :alt="article.title" :icon="FileText" />
    </NuxtLink>
    <div class="flex flex-1 flex-col p-4">
      <div class="flex items-center gap-2 text-xs">
        <NuxtLink v-if="article.category" :to="`/categories/${article.category.slug}`" class="font-semibold text-brand-600 hover:underline">{{ article.category.name }}</NuxtLink>
        <DifficultyBadge v-if="article.difficulty" :difficulty="article.difficulty" size="xs" />
      </div>
      <h3 class="mt-2 line-clamp-2 text-base font-semibold leading-snug text-ink group-hover:text-brand-700">
        <NuxtLink :to="`/articles/${article.slug}`">{{ article.title }}</NuxtLink>
      </h3>
      <p class="mt-2 line-clamp-2 flex-1 text-sm text-ink-muted">{{ article.excerpt }}</p>
      <div class="mt-4 flex items-center justify-between text-xs text-ink-muted">
        <span class="truncate">{{ formatDate(article.publishedAt) }}</span>
        <span class="inline-flex shrink-0 items-center gap-3">
          <span class="inline-flex items-center gap-1"><Clock class="h-3.5 w-3.5" /> {{ article.readingTimeMin }} min</span>
          <span class="inline-flex items-center gap-1"><Eye class="h-3.5 w-3.5" /> {{ compactNumber(article.viewCount) }}</span>
        </span>
      </div>
    </div>
  </article>
</template>
