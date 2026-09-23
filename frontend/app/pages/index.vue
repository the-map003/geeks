<script setup lang="ts">
import { ArrowRight, BarChart3, GraduationCap, Star, TrendingUp } from 'lucide-vue-next';
import type { Category, HomeData } from '~/types/api';
import { compactNumber, LEVEL_LABEL } from '~/utils/format';

const api = useApi();
const { tree } = useNavigation();
const { data, status, error, refresh } = await useAsyncData('home', () => api.get<HomeData>('/home', undefined, { auth: false }));

useHead({ titleTemplate: '%s' });
useContentSeo({
  title: 'GeeksforGeeks | Your All-in-One Learning Portal',
  description: 'Tutorials, articles, coding practice, quizzes and courses for programmers at every level.',
  path: '/',
  jsonLd: {
    '@type': 'WebSite',
    name: 'GeeksforGeeks (academic reproduction)',
    url: useRuntimeConfig().public.siteUrl,
    potentialAction: { '@type': 'SearchAction', target: `${useRuntimeConfig().public.siteUrl}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
  },
});

/** Reference "Explore" grid: the 14 `to bottom right` gradients exactly as served by the reference homepage (Sept 2026), in its order. */
const gradients = [
  ['#3b5998', '#7b99d8'], // Data Structure and Algorithms
  ['#a85c5c', '#e89c9c'], // Web Development
  ['#5a8560', '#9ac5a0'], // AI ML & Data Science
  ['#7d6ba8', '#bdabe8'], // Machine Learning
  ['#b8834a', '#f8c38a'], // Python
  ['#a8667d', '#e8a6bd'], // Java
  ['#5a9ca0', '#9adce0'], // System Design
  ['#a8a05a', '#e8e09a'], // DevOps
  ['#6b7280', '#abb2c0'], // Programming Languages
  ['#9c5d5d', '#dc9d9d'], // CS Subjects
  ['#5d6ba8', '#9dabe8'], // Practice DSA
  ['#60a870', '#a0e8b0'], // Interview Preparation
  ['#6d6ba8', '#adabe8'], // Databases
  ['#a86060', '#e8a0a0'], // Software & Tools / School Learning
];
const exploreOrder = ['dsa', 'web-development', 'ai-ml', 'machine-learning', 'python', 'java', 'system-design', 'devops', 'programming-languages', 'cs-subjects', 'practice', 'interview-prep', 'databases', 'software-tools'];
const exploreLabels: Record<string, string> = { dsa: 'Data Structure and Algorithms', 'ai-ml': 'AI ML & Data Science', practice: 'Practice DSA', devops: 'DevOps', 'interview-prep': 'Interview Preparation', 'software-tools': 'Software & Tools' };

const exploreCards = computed(() => {
  const flat: Category[] = tree.value.flatMap((c) => [c, ...(c.children ?? [])]);
  const bySlug = new Map(flat.map((c) => [c.slug, c]));
  return exploreOrder
    .map((slug, i) => {
      if (slug === 'practice') return { key: slug, label: 'Practice DSA', to: '/problems', gradient: gradients[i % gradients.length]! };
      const c = bySlug.get(slug);
      return c ? { key: slug, label: exploreLabels[slug] ?? c.name, to: `/categories/${slug}`, gradient: gradients[i % gradients.length]! } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
});

/** Reference hero chips; each resolves to the closest course or course category in this catalogue. */
const heroChips = computed(() => {
  const courses = data.value?.courses ?? [];
  const bySlug = (slug: string, fallback: string) => (courses.some((c) => c.slug === slug) ? `/courses/${slug}` : fallback);
  return [
    { label: 'Placement 360', to: bySlug('dsa-foundations', '/courses?category=dsa') },
    { label: 'Data Science 360', to: bySlug('python-data-analysis', '/courses?category=ai-ml') },
    { label: 'Full Stack Dev', to: '/courses?category=web-development' },
  ];
});

/** Reference "Must Explore" tiles; Videos / Contest / Advertise map to the nearest features here. */
const mustExplore = [
  { label: 'Trending Now', to: '/articles?sort=trending' },
  { label: 'Watch Videos', to: '/tutorials' },
  { label: 'GfG Coding Contest', to: '/practice' },
  { label: 'Advertise with Us', to: '/about#contact' },
];
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="bg-gradient-to-b from-[#e6f5ea] to-page dark:from-[#14261b]">
      <div class="container-gfg py-10 text-center sm:py-14">
        <h1 class="font-heading text-[28px] font-semibold text-ink-heading sm:text-[40px]">Start Your Learning Today!</h1>
        <div class="mt-5 flex flex-wrap justify-center gap-2 sm:gap-4">
          <NuxtLink
            v-for="(c, i) in heroChips"
            :key="c.label"
            :to="c.to"
            class="inline-flex h-8 items-center rounded-md border px-2.5 font-heading text-[14px] transition"
            :class="i === 0 ? 'border-teal-brand bg-teal-brand text-[#e9e9ea] hover:bg-[#007a54]' : 'border-line-strong bg-surface text-ink hover:border-ink'"
          >
            {{ c.label }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="container-gfg pb-12">
      <UiErrorState v-if="status === 'error'" :message="error?.message" class="mb-8" @retry="refresh()" />

      <!-- Explore -->
      <section aria-labelledby="explore-heading" class="mt-4">
        <h2 id="explore-heading" class="font-heading text-[24px] font-semibold text-ink-heading">Explore</h2>
        <div class="mt-4 grid gap-5 md:grid-cols-2">
          <template v-if="!exploreCards.length">
            <UiSkeleton v-for="i in 6" :key="i" variant="rect" class="h-[200px] rounded-xl" />
          </template>
          <NuxtLink
            v-for="card in exploreCards"
            v-else
            :key="card.key"
            :to="card.to"
            class="group flex h-[150px] flex-col items-center justify-center gap-3 rounded-xl px-4 text-center text-white transition hover:-translate-y-0.5 hover:shadow-lg md:h-[200px]"
            :style="{ backgroundImage: `linear-gradient(to right bottom, ${card.gradient[0]}, ${card.gradient[1]})` }"
          >
            <span class="font-heading text-[22px] font-semibold leading-tight md:text-[28px]">{{ card.label }}</span>
            <span class="inline-flex h-8 items-center gap-2 rounded-full border border-white/90 px-4 text-[14px] group-hover:bg-white/15">View more <ArrowRight class="h-4 w-4" /></span>
          </NuxtLink>
        </div>
        <div class="mt-4 text-center md:hidden">
          <NuxtLink to="/tutorials" class="inline-flex items-center gap-1 text-[15px] font-semibold text-brand-600">View More <ArrowRight class="h-4 w-4" /></NuxtLink>
        </div>
      </section>

      <!-- Advertise band (reference: 1040×105, 13px radius, 32px/700 white text, 47px white button with #172c43 text) -->
      <section class="mt-[50px]">
        <NuxtLink to="/about#contact" class="flex min-h-[105px] flex-col items-center justify-center gap-4 rounded-[13px] px-5 py-6 text-center font-heading sm:flex-row sm:justify-between sm:gap-[70px] sm:px-[30px] sm:py-2.5 sm:text-left" style="background-image: linear-gradient(90.56deg, #a77dff 0.41%, #5b2188 99.06%)">
          <span class="text-[22px] font-bold leading-[30px] text-white sm:text-[28px] sm:leading-[44px] lg:text-[32px] lg:leading-[48px]">Interested in advertising with us?</span>
          <span class="inline-flex h-10 shrink-0 items-center rounded-[4px] bg-surface px-[13px] text-[16px] text-navy sm:h-[47px] sm:px-[31px] sm:text-[18px] sm:leading-[27px]">Get in touch</span>
        </NuxtLink>
      </section>

      <!-- Courses (reference: 292px cards, 10px radius, flush 162px image, rating pill over the image, 83×42px gaps) -->
      <section class="mt-[50px]" aria-labelledby="courses-heading">
        <div class="mb-5 flex items-center justify-between">
          <h2 id="courses-heading" class="font-heading text-[24px] font-semibold leading-9 text-ink-heading">Courses</h2>
          <NuxtLink to="/courses" class="inline-flex h-8 items-center rounded-[32px] border border-ink-heading px-2.5 font-heading text-[14px] text-ink-heading transition hover:border-[#357960] hover:text-[#357960]">View All</NuxtLink>
        </div>
        <div v-if="status === 'pending'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><UiSkeleton v-for="i in 3" :key="i" variant="card" /></div>
        <div v-else-if="data?.courses.length" class="flex snap-x gap-[22px] overflow-x-auto pb-2 no-scrollbar sm:grid sm:grid-cols-2 sm:items-start sm:justify-items-center sm:gap-x-6 sm:gap-y-[42px] sm:overflow-visible lg:grid-cols-[repeat(3,292px)] lg:justify-between lg:gap-x-0">
          <NuxtLink v-for="(c, i) in data.courses.slice(0, 6)" :key="c.id" :to="`/courses/${c.slug}`" class="group relative flex w-[265px] shrink-0 snap-start flex-col rounded-[10px] border border-line bg-surface transition hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.122)] sm:w-[292px]">
            <div class="absolute right-2 top-2.5 z-[1] inline-flex h-5 items-center gap-[3px] rounded-[11.5px] bg-black/40 pl-[3px] pr-1.5 font-heading text-[12px] font-medium leading-5 text-white">
              <Star class="h-3.5 w-3.5 fill-[#ffc107] text-[#ffc107]" aria-hidden="true" />{{ Number(c.ratingAvg).toFixed(1) }}
            </div>
            <CourseThumb :title="c.title" :src="c.coverImageUrl" :icon="GraduationCap" :index="i" />
            <div class="flex h-full flex-col px-2.5 pb-3 pt-[25px]">
              <p class="line-clamp-2 h-14 w-[270px] max-w-full font-heading text-[20px] font-semibold leading-7 text-ink-heading" :title="c.title">{{ c.title }}</p>
              <p class="mt-[19px] flex items-center gap-1 font-heading text-[14px] leading-[22px] text-ink-muted"><BarChart3 class="h-4 w-4 shrink-0" aria-hidden="true" /> <span class="truncate">{{ LEVEL_LABEL[c.level] }}</span></p>
              <div class="mt-7 flex items-center justify-between">
                <span class="inline-flex items-center gap-1 font-heading text-[12px] leading-[17px] text-ink-muted"><TrendingUp class="h-[18px] w-[18px] text-brand-500" aria-hidden="true" /> {{ compactNumber(c.enrollmentCount) }}+ interested Geeks</span>
                <span class="rounded px-1.5 py-0.5 font-heading text-[14px] font-semibold leading-[21px] text-[#357960] transition group-hover:bg-[#357960] group-hover:text-white">Explore now</span>
              </div>
            </div>
          </NuxtLink>
        </div>
        <UiEmptyState v-else title="No courses yet" compact :icon="GraduationCap" class="mt-4" />
      </section>

      <!-- Must Explore (reference: 244×104 tiles, 12px radius, 22px/600 text, 30px arrow button that turns into a white disc on hover) -->
      <section class="mt-10" aria-labelledby="must-explore-heading">
        <h2 id="must-explore-heading" class="mb-5 font-heading text-[24px] font-semibold leading-9 text-ink-heading">Must Explore</h2>
        <div class="flex snap-x gap-5 overflow-x-auto pb-2 no-scrollbar sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-[21px] sm:overflow-visible lg:grid-cols-4">
          <NuxtLink v-for="m in mustExplore" :key="m.to" :to="m.to" class="group flex h-[104px] w-[244px] shrink-0 snap-start flex-col rounded-xl bg-tile-blue px-[18px] py-[11px] text-white sm:w-auto">
            <span class="truncate font-heading text-[22px] font-semibold leading-[39px]">{{ m.label }}</span>
            <span class="mt-[10px] flex h-[30px] w-[30px] items-center justify-center self-end rounded-full p-1 transition-all duration-500 group-hover:bg-surface">
              <ArrowRight class="h-6 w-6 stroke-[2.5] transition-colors group-hover:text-tile-blue" aria-hidden="true" />
            </span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
