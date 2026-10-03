import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  PendingPuzzleSchema,
  PuzzleSchema,
  TranslationSchema,
  translationKey,
  validatePuzzle,
} from '@eulero/core';
import type { Puzzle, Translation } from '@eulero/core';
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

/** Traduzioni inglesi esterne ai puzzle (data/translations/en.json), per chiave di etichette italiane. */
async function loadEnglish(): Promise<Map<string, Translation>> {
  const map = new Map<string, Translation>();
  try {
    const json = JSON.parse(
      await readFile(path.join(root, 'data/translations/en.json'), 'utf8'),
    ) as Record<string, unknown>;
    for (const [key, value] of Object.entries(json)) {
      const parsed = TranslationSchema.safeParse(value);
      if (parsed.success) map.set(key, parsed.data);
      else console.warn(`traduzione non valida: ${key}`);
    }
  } catch {
    // nessun file di traduzioni: restano solo quelle dentro i puzzle
  }
  return map;
}

const puzzles = await load(path.join(root, 'data/approved'), false);
if (values['include-pending']) {
  console.warn('⚠ incluse le bozze di data/pending (non ancora approvate).');
  const have = new Set(puzzles.map((p) => p.id));
  for (const p of await load(path.join(root, 'data/pending'), true))
    if (!have.has(p.id)) puzzles.push(p);
}

// Le traduzioni dentro il puzzle hanno la precedenza; le altre arrivano da data/translations/en.json.
const english = await loadEnglish();
const untranslated: string[] = [];
const published = puzzles.map((p): Puzzle => {
  if (p.translations?.en) return p;
  const tr = english.get(translationKey(p.concepts.map((c) => c.label)));
  if (!tr) {
    untranslated.push(p.id);
    return p;
  }
  return { ...p, translations: { ...p.translations, en: tr } };
});
if (untranslated.length > 0) {
  console.warn(
    `⚠ ${untranslated.length} livelli senza traduzione inglese (in inglese appaiono in italiano).`,
  );
}

const outDir = path.resolve(values.out as string);
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
for (const p of published)
  await writeFile(path.join(outDir, `${p.id}.json`), JSON.stringify(p) + '\n');
const index = buildLevels(published);
await writeFile(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');

console.log(
  `Pubblicati ${published.length} livelli in ${index.themes.length} temi → ${path.relative(root, outDir)}`,
);
