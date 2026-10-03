import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { levelSignature, prepareLevel } from './add';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'dry-run': { type: 'boolean', default: false } },
});

const file = positionals[0];
if (!file) {
  console.error('Uso: pnpm add-levels <livelli.json> [--dry-run]');
  process.exit(1);
}

/** Firme dei puzzle già presenti: bozze, approvati e già pubblicati. */
async function loadSeen(): Promise<Set<string>> {
  const seen = new Set<string>();
  for (const dir of ['data/pending', 'data/approved', 'apps/web/public/puzzles']) {
    let names: string[] = [];
    try {
      names = await readdir(path.join(root, dir));
    } catch {
      continue;
    }
    for (const n of names.filter((x) => x.endsWith('.json') && x !== 'index.json')) {
      try {
        const json = JSON.parse(await readFile(path.join(root, dir, n), 'utf8')) as {
          puzzle?: { concepts?: { label: string }[] };
          concepts?: { label: string }[];
        };
        const concepts = json.puzzle?.concepts ?? json.concepts;
        if (concepts) seen.add(levelSignature(concepts.map((c) => c.label)));
      } catch {
        // file illeggibile: ignorato
      }
    }
  }
  return seen;
}

const raw: unknown = JSON.parse(await readFile(path.resolve(file), 'utf8'));
const items = Array.isArray(raw) ? raw : [raw];
const seen = await loadSeen();
const pendingDir = path.join(root, 'data/pending');
await mkdir(pendingDir, { recursive: true });

let added = 0;
let rejected = 0;
for (const [i, item] of items.entries()) {
  const res = prepareLevel(item, seen);
  if (!res.ok) {
    rejected++;
    console.error(`✗ #${i + 1}: ${res.error}`);
    continue;
  }
  const { puzzle } = res.pending;
  if (!values['dry-run']) {
    await writeFile(
      path.join(pendingDir, `${puzzle.id}.json`),
      JSON.stringify(res.pending, null, 2) + '\n',
    );
  }
  added++;
  console.log(
    `✓ ${puzzle.theme}: ${puzzle.concepts.map((c) => c.label).join(', ')} — ${puzzle.difficulty.level} (${puzzle.id})`,
  );
}
console.log(`\n${values['dry-run'] ? '[prova] ' : ''}Aggiunti ${added}, scartati ${rejected}.`);
if (rejected > 0) process.exitCode = 2;
