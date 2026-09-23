import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const seedDir = dirname(fileURLToPath(import.meta.url));

/**
 * Reads a Markdown content file relative to `prisma/seed/data/content/`.
 * Keeping long-form content in .md files avoids escaping code fences in TypeScript strings.
 */
export function readContent(relativePath: string): string {
  return readFileSync(resolve(seedDir, 'data', 'content', relativePath), 'utf8').replace(/\r\n/g, '\n').trim();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Roughly 200 words per minute, minimum one minute. */
export function readingTime(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}
