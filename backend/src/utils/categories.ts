import { prisma } from './prisma.js';

/** Resolves a category slug to the ids of that category and all of its children. */
export async function categoryIdsForSlug(slug: string | undefined): Promise<string[] | null> {
  if (!slug) return null;
  const category = await prisma.category.findUnique({ where: { slug }, select: { id: true, children: { select: { id: true } } } });
  if (!category) return [];
  return [category.id, ...category.children.map((c) => c.id)];
}
