import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translationKey } from '@eulero/core';
import { LIVELLI } from './livelli';
import { LIVELLI_EN, THEMES_EN } from './traduzioni-en';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const out: Record<string, { theme: string; concepts: string[] }> = {};
let missing = 0;
for (const [theme, seeds] of Object.entries(LIVELLI)) {
  const en = LIVELLI_EN[theme] ?? [];
  seeds.forEach(([concepts], i) => {
    const labels = (concepts as readonly string[]).map((c) => c.split(' ').slice(1).join(' '));
    const tr = en[i];
    if (!tr || tr.length !== 4 || !THEMES_EN[theme]) {
      console.error(`✗ traduzione mancante: ${theme} #${i + 1}`);
      missing++;
      return;
    }
    out[translationKey(labels)] = { theme: THEMES_EN[theme] as string, concepts: [...tr] };
  });
}
if (missing > 0) process.exit(1);

const dir = path.join(root, 'data/translations');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'en.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`Scritte ${Object.keys(out).length} traduzioni inglesi in data/translations/en.json`);
