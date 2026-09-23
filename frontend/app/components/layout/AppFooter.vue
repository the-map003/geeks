<script setup lang="ts">
import { Facebook, Instagram, Linkedin, MapPin, Twitter, Youtube, Play, Apple } from 'lucide-vue-next';

/**
 * Reference footer (geeksforgeeks.org, Sept 2026): white footer with a top border, 40px padding,
 * a 310px brand column (logo, two addresses, social icons and app badges) and six link columns
 * (green 16px titles, 13px grey links, line-height 1.67), then a 40px copyright strip.
 * Labels are the reference's; links resolve to this site's routes.
 */
const { tree } = useNavigation();

const hasCategory = (slug: string) => tree.value.some((c) => c.slug === slug || (c.children ?? []).some((ch) => ch.slug === slug));
const cat = (label: string, slug: string, fallback = '/tutorials') => ({ label, to: hasCategory(slug) ? `/categories/${slug}` : fallback });
const courseCat = (label: string, slug: string) => ({ label, to: hasCategory(slug) ? `/courses?category=${slug}` : '/courses' });

const columns = computed(() => [
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Legal', to: '/about#terms' },
      { label: 'Privacy Policy', to: '/about#privacy' },
      { label: 'Contact Us', to: '/about#contact' },
      { label: 'Advertise with us', to: '/about#contact' },
      { label: 'GFG Corporate Solution', to: '/about#contact' },
      { label: 'Campus Training Program', to: '/about#contact' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'POTD', to: '/practice' },
      { label: 'Job-A-Thon', to: '/problems' },
      { label: 'Blogs', to: '/articles' },
      { label: 'Nation Skill Up', to: '/courses' },
    ],
  },
  {
    title: 'Tutorials',
    links: [
      cat('Programming Languages', 'programming-languages'),
      cat('DSA', 'dsa'),
      cat('Web Technology', 'web-development'),
      cat('AI, ML & Data Science', 'ai-ml'),
      cat('DevOps', 'devops'),
      cat('CS Core Subjects', 'cs-subjects'),
      cat('Interview Preparation', 'interview-prep'),
      cat('Software and Tools', 'software-tools'),
    ],
  },
  {
    title: 'Courses',
    links: [
      courseCat('ML and Data Science', 'ai-ml'),
      courseCat('DSA and Placements', 'dsa'),
      courseCat('Web Development', 'web-development'),
      courseCat('Programming Languages', 'programming-languages'),
      courseCat('DevOps & Cloud', 'devops'),
      courseCat('GATE', 'cs-subjects'),
      { label: 'Trending Technologies', to: '/courses' },
    ],
  },
  {
    title: 'Videos',
    links: [
      cat('DSA', 'dsa'),
      cat('Python', 'python'),
      cat('Java', 'java'),
      cat('C++', 'cpp'),
      cat('Web Development', 'web-development'),
      cat('Data Science', 'data-science'),
      cat('CS Subjects', 'cs-subjects'),
    ],
  },
  {
    title: 'Preparation Corner',
    links: [
      cat('Interview Corner', 'interview-prep'),
      cat('Aptitude', 'aptitude'),
      cat('Puzzles', 'puzzles'),
      { label: 'GfG 160', to: '/practice' },
      cat('System Design', 'system-design'),
    ],
  },
]);

const socials = [
  { icon: Linkedin, label: 'GeeksforGeeks Linkedin' },
  { icon: Instagram, label: 'GeeksforGeeks Instagram' },
  { icon: Twitter, label: 'GeeksforGeeks Twitter' },
  { icon: Facebook, label: 'GeeksforGeeks Facebook' },
  { icon: Youtube, label: 'GeeksforGeeks Youtube' },
];

const year = new Date().getFullYear();
</script>

<template>
  <footer class="mt-[60px] border-t border-line bg-surface font-sans text-ink-muted">
    <div class="flex flex-col gap-8 px-5 pb-5 pt-5 lg:flex-row lg:justify-between lg:gap-10 lg:px-10 lg:pb-5 lg:pt-10">
      <!-- Brand column -->
      <div class="mx-auto flex w-full max-w-[310px] shrink-0 flex-col lg:mx-0 lg:w-[310px]">
        <div class="flex h-[44.8px] flex-col justify-start gap-0">
          <AppLogo wordmark tone="brand" size="lg" class="gap-1.5" />
          <span class="pl-11 text-[8px] font-semibold uppercase tracking-[0.08em] text-brand-500">Academic reproduction · not affiliated</span>
        </div>

        <div class="mb-2.5 mt-3">
          <p class="mb-[5px] flex items-start text-[15px] font-semibold text-ink">
            <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-[#308d46]" aria-hidden="true" />
            <span class="ml-[10px]">Corporate &amp; Communications Address:</span>
          </p>
          <p class="ml-[29px] mr-[15px] text-justify text-[14px] leading-[1.2] [word-spacing:2px]">A-143, 6th Floor, Sovereign Corporate Tower, Sector- 136, Noida, Uttar Pradesh (201305)</p>
        </div>
        <div class="mb-2.5">
          <p class="mb-[5px] flex items-start text-[15px] font-semibold text-ink">
            <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-[#308d46]" aria-hidden="true" />
            <span class="ml-[10px]">Registered Address:</span>
          </p>
          <p class="ml-[29px] mr-[15px] text-justify text-[14px] leading-[1.2] [word-spacing:2px]">K 061, Tower K, Gulshan Vivante Apartment, Sector 137, Noida, Gautam Buddh Nagar, Uttar Pradesh, 201305</p>
        </div>

        <!-- Reference: icons and store badges sit on one row (gap 34px) and may extend past the 310px column -->
        <div class="mt-1 flex w-max max-w-[calc(100vw-40px)] flex-wrap items-center gap-x-[34px] gap-y-3 lg:flex-nowrap">
          <div class="flex items-center">
            <a v-for="s in socials" :key="s.label" href="#" class="ml-[5px] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#3b3b3b] text-white transition hover:bg-[#308d46]" :aria-label="s.label"><component :is="s.icon" class="h-[18px] w-[18px]" /></a>
          </div>
          <div class="flex items-center gap-[10.5px]">
            <a href="#" class="inline-flex h-[30px] w-[100px] items-center gap-1.5 rounded-[4px] border border-[#a6a6a6] bg-black px-2 text-white" aria-label="GFG App on Play Store">
              <Play class="h-4 w-4 fill-current" aria-hidden="true" />
              <span class="text-left leading-none"><span class="block text-[6px] uppercase tracking-wide">Get it on</span><span class="block text-[11px] font-semibold">Google Play</span></span>
            </a>
            <a href="#" class="inline-flex h-[30px] w-[100px] items-center gap-1.5 rounded-[4px] border border-[#a6a6a6] bg-black px-2 text-white" aria-label="GFG App on App Store">
              <Apple class="h-4 w-4 fill-current" aria-hidden="true" />
              <span class="text-left leading-none"><span class="block text-[6px] uppercase tracking-wide">Download on the</span><span class="block text-[11px] font-semibold">App Store</span></span>
            </a>
          </div>
        </div>
      </div>

      <!-- Link columns -->
      <div class="grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-6 text-center sm:grid-cols-3 lg:ml-[130px] lg:grid-cols-6 lg:text-left">
        <ul v-for="col in columns" :key="col.title" class="m-0 list-none p-0">
          <li class="inline-block text-[16px] font-semibold leading-[1.67] text-[#308d46]">{{ col.title }}</li>
          <li v-for="link in col.links" :key="col.title + link.label" class="text-[13px] leading-normal">
            <NuxtLink :to="link.to" class="inline-block leading-[1.67] text-ink-muted transition hover:text-[#308d46]">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Copyright strip -->
    <div class="flex min-h-10 items-center justify-center border-t border-line px-4 py-2 text-center text-[11pt] text-ink-muted lg:justify-start lg:px-10 lg:text-left">
      <p class="m-0">@GeeksforGeeks-style academic reproduction, {{ year }}. Not affiliated with GeeksforGeeks or Sanchhaya Education Private Limited; reference labels and addresses reproduced for coursework only, <NuxtLink to="/about#terms" class="hover:text-[#308d46]">All rights reserved</NuxtLink> to their owners.</p>
    </div>
  </footer>
</template>
