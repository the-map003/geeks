<script setup lang="ts">
import type { Category } from '~/types/api';

const props = defineProps<{ tree: Category[] }>();
const route = useRoute();

/**
 * Reference secondary bar, in its order:
 * DSA · Practice Problems · C · C++ · Java · Python · JavaScript · Data Science · Machine Learning · Courses · Linux · DevOps
 * Category links resolve against slugs from the database; fixed entries point at built-in routes.
 */
const order: Array<{ label: string; slug?: string; to?: string }> = [
  { label: 'DSA', slug: 'dsa' },
  { label: 'Practice Problems', to: '/problems' },
  { label: 'C', slug: 'c' },
  { label: 'C++', slug: 'cpp' },
  { label: 'Java', slug: 'java' },
  { label: 'Python', slug: 'python' },
  { label: 'JavaScript', slug: 'javascript' },
  { label: 'Data Science', slug: 'data-science' },
  { label: 'Machine Learning', slug: 'machine-learning' },
  { label: 'Courses', to: '/courses' },
  { label: 'Linux', slug: 'linux' },
  { label: 'DevOps', slug: 'devops' },
];

const links = computed(() => {
  const flat = props.tree.flatMap((c) => [c, ...(c.children ?? [])]);
  const bySlug = new Map(flat.map((c) => [c.slug, c]));
  const items: Array<{ label: string; to: string }> = [];
  for (const entry of order) {
    if (entry.to) items.push({ label: entry.label, to: entry.to });
    else if (entry.slug && bySlug.has(entry.slug)) items.push({ label: entry.label, to: `/categories/${entry.slug}` });
  }
  return items;
});

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`);
}
</script>

<template>
  <div class="border-t border-line bg-surface">
    <nav class="mx-auto flex h-10 max-w-[1240px] items-center gap-5 overflow-x-auto px-4 no-scrollbar lg:justify-center" aria-label="Topics">
      <NuxtLink
        v-for="link in links"
        :key="link.to + link.label"
        :to="link.to"
        class="shrink-0 whitespace-nowrap text-[14.5px] transition hover:text-brand-600"
        :class="isActive(link.to) ? 'font-semibold text-brand-600' : 'text-ink-heading'"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
