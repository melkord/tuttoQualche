import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { PendingPuzzleSchema, PuzzleSchema, validatePuzzle } from '@tuttialcuni/core';
import type { Puzzle } from '@tuttialcuni/core';
import { buildLevels } from './levels';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const { values } = parseArgs({
  options: {
    'include-pending': { type: 'boolean', default: false },
    out: { type: 'string', default: path.join(root, 'apps/web/public/puzzles') },
  },
});

async function load(dir: string, pending: boolean): Promise<Puzzle[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const out: Puzzle[] = [];
  for (const n of names.filter((x) => x.endsWith('.json')).sort()) {
    const json: unknown = JSON.parse(await readFile(path.join(dir, n), 'utf8'));
    const puzzle = pending
      ? PendingPuzzleSchema.safeParse(json).data?.puzzle
      : PuzzleSchema.safeParse(json).data;
    if (!puzzle || !validatePuzzle(puzzle).ok) {
      console.warn(`saltato (non valido): ${n}`);
      continue;
    }
    out.push(puzzle);
  }
  return out;
}

const puzzles = await load(path.join(root, 'data/approved'), false);
if (values['include-pending']) {
  console.warn('⚠ incluse le bozze di data/pending (non ancora approvate).');
  const have = new Set(puzzles.map((p) => p.id));
  for (const p of await load(path.join(root, 'data/pending'), true))
    if (!have.has(p.id)) puzzles.push(p);
}

const outDir = path.resolve(values.out as string);
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
for (const p of puzzles)
  await writeFile(path.join(outDir, `${p.id}.json`), JSON.stringify(p) + '\n');
const index = buildLevels(puzzles);
await writeFile(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');

console.log(
  `Pubblicati ${puzzles.length} livelli in ${index.themes.length} temi → ${path.relative(root, outDir)}`,
);
