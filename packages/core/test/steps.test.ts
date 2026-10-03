import { describe, expect, it } from 'vitest';
import {
  buildMatrix,
  buildSteps,
  classifyCircles,
  consistentTriples,
  fitCircles,
  isConsistent,
  OPTION_COUNT,
  STEP_COUNT,
  tripleMatrix,
} from '../src';
import type { Circle, Triple } from '../src';
import { allRelationCombos, ANIMALI, draftOf } from './fixtures';

const animals = {
  id: 'p-test',
  relations: ANIMALI.relations,
  difficulty: { level: 'medio' as const },
};

const relationsOf = (circles: Circle[]): Triple => [
  classifyCircles(circles[0]!, circles[1]!),
  classifyCircles(circles[0]!, circles[2]!),
  classifyCircles(circles[1]!, circles[2]!),
];

describe('consistentTriples', () => {
  it('sono un sottoinsieme proprio delle 125 combinazioni, tutte disegnabili', () => {
    const ts = consistentTriples();
    expect(ts.length).toBeGreaterThan(20);
    expect(ts.length).toBeLessThan(125);
    for (const t of ts) expect(tripleMatrix(t)).not.toBeNull();
  });
  it('contiene le configurazioni note e non quelle impossibili', () => {
    const has = (t: Triple) => consistentTriples().some((x) => x.join() === t.join());
    expect(has(['TUTTI', 'TUTTI', 'TUTTI'])).toBe(true); // A⊂B, A⊂C, B⊂C
    expect(has(['NESSUNO', 'NESSUNO', 'NESSUNO'])).toBe(true);
    expect(has(['TUTTI', 'NESSUNO', 'TUTTI'])).toBe(false); // A⊂B, A∩C=∅, B⊂C
  });
});

describe('fitCircles', () => {
  it('riempie il quadrato e conserva le relazioni', () => {
    const src: Circle[] = [
      { cx: 0.3, cy: 0.5, r: 0.1 },
      { cx: 0.38, cy: 0.5, r: 0.2 },
      { cx: 0.6, cy: 0.52, r: 0.08 },
    ];
    for (const rot of [0, 1, 2.5]) {
      const out = fitCircles(src, rot);
      expect(relationsOf(out)).toEqual(relationsOf(src));
      const minX = Math.min(...out.map((c) => c.cx - c.r));
      const maxX = Math.max(...out.map((c) => c.cx + c.r));
      const minY = Math.min(...out.map((c) => c.cy - c.r));
      const maxY = Math.max(...out.map((c) => c.cy + c.r));
      expect(Math.min(minX, minY)).toBeGreaterThanOrEqual(0.06);
      expect(Math.max(maxX, maxY)).toBeLessThanOrEqual(0.94);
      expect(Math.max(maxX - minX, maxY - minY)).toBeCloseTo(0.86, 1);
    }
  });
});

describe('buildSteps', () => {
  it('3 passi, 4 opzioni, una sola corretta, deterministico', () => {
    const steps = buildSteps(animals);
    expect(steps).toHaveLength(STEP_COUNT);
    expect(buildSteps(animals)).toEqual(steps);
    for (const s of steps) {
      expect(s.options).toHaveLength(OPTION_COUNT);
      expect(s.correct).toBeGreaterThanOrEqual(0);
      expect(s.correct).toBeLessThan(OPTION_COUNT);
    }
  });

  it('i diagrammi disegnati realizzano esattamente le relazioni dichiarate per ogni opzione', () => {
    for (const s of buildSteps(animals)) {
      for (const o of s.options) expect(relationsOf(o.circles)).toEqual(o.relations);
    }
  });

  it('l’opzione giusta corrisponde alle relazioni del puzzle per quella terna', () => {
    const m = buildMatrix(ANIMALI.relations).matrix!;
    for (const s of buildSteps(animals)) {
      const [a, b, c] = s.concepts;
      const expected = [m[a]![b], m[a]![c], m[b]![c]];
      expect(s.options[s.correct]!.relations).toEqual(expected);
    }
  });

  it('terne diverse: si omette un concetto diverso a ogni passo', () => {
    const steps = buildSteps(animals);
    expect(new Set(steps.map((s) => s.concepts.join())).size).toBe(STEP_COUNT);
  });

  it('livelli difficili hanno risposte sbagliate più vicine a quella giusta', () => {
    const dist = (level: 'facile' | 'difficile') => {
      let sum = 0;
      let n = 0;
      for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
        for (const s of buildSteps({ ...animals, id, difficulty: { level } })) {
          const right = s.options[s.correct]!.relations;
          s.options.forEach((o, i) => {
            if (i === s.correct) return;
            sum += o.relations.filter((r, k) => r !== right[k]).length;
            n++;
          });
        }
      }
      return sum / n;
    };
    expect(dist('difficile')).toBeLessThan(dist('facile'));
  });

  it('per OGNI matrice coerente: 3 passi validi, opzioni distinte, una sola giusta', () => {
    let n = 0;
    for (const rels of allRelationCombos()) {
      const m = buildMatrix(draftOf(rels).relations).matrix!;
      if (!isConsistent(m)) continue;
      const steps = buildSteps({
        id: `m${n}`,
        relations: draftOf(rels).relations,
        difficulty: { level: 'medio' },
      });
      expect(steps).toHaveLength(STEP_COUNT);
      for (const s of steps) {
        const keys = s.options.map((o) => o.relations.join());
        expect(new Set(keys).size).toBe(OPTION_COUNT);
        expect(s.options.filter((_, i) => i === s.correct)).toHaveLength(1);
      }
      n++;
    }
    expect(n).toBe(1191);
  }, 120_000);
});
