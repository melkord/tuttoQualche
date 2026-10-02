import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPuzzle, PendingPuzzleSchema, validatePuzzle } from '@tuttialcuni/core';
import type { Determiner, PairRelation, PendingPuzzle, Relation, Risk } from '@tuttialcuni/core';
import { writePending } from '../src/pipeline';
import { LIVELLI } from './livelli';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outDir = path.join(root, 'data/pending');

const REL: Record<string, Relation> = {
  T: 'TUTTI',
  C: 'CONTIENE',
  A: 'ALCUNI',
  N: 'NESSUNO',
  U: 'UGUALI',
};
const PAIRS: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

let n = 0;
let failed = 0;
for (const [theme, seeds] of Object.entries(LIVELLI)) {
  for (const [concepts, codes, riskMap = {}] of seeds) {
    const draft = {
      theme,
      concepts: concepts.map((c) => {
        const [det, ...rest] = c.split(' ');
        return { det: det as Determiner, label: rest.join(' ') };
      }),
      relations: PAIRS.map(([a, b], k): PairRelation => ({
        a,
        b,
        rel: REL[codes[k] as string] as Relation,
      })),
    };
    try {
      const puzzle = buildPuzzle(draft);
      const report = validatePuzzle(puzzle);
      if (!report.ok) throw new Error(report.issues.map((i) => i.message).join(' '));
      const risks: Record<string, Risk> = {};
      for (const [a, b] of PAIRS) {
        const key = `${a}${b}`;
        const r = riskMap[key];
        risks[key] = r
          ? { level: r[0], reason: r[1] }
          : { level: 'basso', reason: 'Conoscenza comune.' };
      }
      const pending: PendingPuzzle = PendingPuzzleSchema.parse({
        puzzle,
        risks,
        meta: { generatedAt: new Date().toISOString(), model: 'manuale' },
      });
      await writePending(outDir, pending);
      n++;
    } catch (e) {
      failed++;
      console.error(
        `✗ ${theme}: ${concepts.join(', ')} [${codes}] → ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
console.log(`Scritti ${n} puzzle in data/pending (${failed} falliti).`);
if (failed > 0) process.exitCode = 1;
