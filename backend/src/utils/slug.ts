export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Ensures the slug is unique using the supplied existence check, appending -2, -3, … */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>, excludeSelf?: (slug: string) => boolean): Promise<string> {
  const root = slugify(base) || 'item';
  let candidate = root;
  for (let i = 2; i < 1000; i++) {
    if (excludeSelf?.(candidate) || !(await exists(candidate))) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export function readingTimeMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
