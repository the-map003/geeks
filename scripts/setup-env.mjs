/** Copies every `.env.example` to `.env` when the target does not exist yet. */
import { copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['.', 'backend', 'frontend', 'executor'];

for (const dir of targets) {
  const example = resolve(root, dir, '.env.example');
  const target = resolve(root, dir, '.env');
  if (!existsSync(example)) continue;
  if (existsSync(target)) {
    console.log(`skip   ${dir}/.env (exists)`);
    continue;
  }
  copyFileSync(example, target);
  console.log(`create ${dir}/.env`);
}
