<script setup lang="ts">
import { BarChart3, Star, TrendingUp } from 'lucide-vue-next';
import type { CourseSummary } from '~/types/api';
import { compactNumber, formatPrice, LEVEL_LABEL } from '~/utils/format';

/** Same card as the homepage Courses section (reference course card): flush header, rating pill, title, level, interest count and "Explore now". */
withDefaults(defineProps<{ course: CourseSummary; progress?: number; index?: number }>(), { index: 0 });
</script>

<template>
  <NuxtLink :to="`/courses/${course.slug}`" class="group relative flex h-full w-full flex-col rounded-[10px] border border-line bg-surface transition hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.122)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
    <div class="absolute right-2 top-2.5 z-[1] inline-flex h-5 items-center gap-[3px] rounded-[11.5px] bg-black/40 pl-[3px] pr-1.5 font-heading text-[12px] font-medium leading-5 text-white">
      <Star class="h-3.5 w-3.5 fill-[#ffc107] text-[#ffc107]" aria-hidden="true" />{{ Number(course.ratingAvg).toFixed(1) }}
    </div>
    <CourseThumb :title="course.title" :src="course.coverImageUrl" :category="course.category?.slug" :index="index" />
    <div class="flex flex-1 flex-col px-2.5 pb-3 pt-[22px]">
      <p class="line-clamp-2 h-14 font-heading text-[20px] font-semibold leading-7 text-ink-heading" :title="course.title">{{ course.title }}</p>
      <p class="mt-[14px] flex items-center justify-between font-heading text-[14px] leading-[22px] text-ink-muted">
        <span class="inline-flex min-w-0 items-center gap-1"><BarChart3 class="h-4 w-4 shrink-0" aria-hidden="true" /> <span class="truncate">{{ LEVEL_LABEL[course.level] }}</span></span>
        <span class="shrink-0 font-semibold" :class="course.isFree ? 'text-brand-600' : 'text-ink'">{{ formatPrice(course.price, course.isFree) }}</span>
      </p>
      <UiProgress v-if="progress !== undefined" :value="progress" size="xs" show-label class="mt-4" />
      <div v-else class="mt-auto flex items-center justify-between pt-5">
        <span class="inline-flex items-center gap-1 font-heading text-[12px] leading-[17px] text-ink-muted"><TrendingUp class="h-[18px] w-[18px] text-brand-500" aria-hidden="true" /> {{ compactNumber(course.enrollmentCount) }}+ interested Geeks</span>
        <span class="rounded px-1.5 py-0.5 font-heading text-[14px] font-semibold leading-[21px] text-[#357960] transition group-hover:bg-[#357960] group-hover:text-white dark:text-brand-600">Explore now</span>
      </div>
    </div>
  </NuxtLink>
</template>
