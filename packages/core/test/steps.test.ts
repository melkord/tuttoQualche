import { describe, expect, it } from 'vitest';
import {
  allPairs,
  assignmentMatrix,
  buildMatrix,
  buildSteps,
  classifyCircles,
  consistentAssignments,
  explainMistake,
  fitCircles,
  isConsistent,
  OPTION_COUNT,
  revealOrder,
  STEP_COUNT,
} from '../src';
import type { Circle, Relation } from '../src';
import { allRelationCombos, ANIMALI, draftOf } from './fixtures';

const animals = {
  id: 'p-test',
  relations: ANIMALI.relations,
  difficulty: { level: 'medio' as const },
};

const relationsOf = (circles: Circle[]): Relation[] =>
  allPairs(circles.length).map(([i, j]) => classifyCircles(circles[i]!, circles[j]!));

describe('consistentAssignments', () => {
  it('2 parole: 5; 3 parole: sottoinsieme delle 125; 4 parole: 1191', () => {
    expect(consistentAssignments(2)).toHaveLength(5);
    const t = consistentAssignments(3);
    expect(t.length).toBeGreaterThan(20);
    expect(t.length).toBeLessThan(125);
    expect(consistentAssignments(4)).toHaveLength(1191);
  });
  it('sono tutte disegnabili e non contengono impossibili', () => {
    for (const a of consistentAssignments(3)) expect(assignmentMatrix(a, 3)).not.toBeNull();
    const has = (a: Relation[]) => consistentAssignments(3).some((x) => x.join() === a.join());
    expect(has(['TUTTI', 'TUTTI', 'TUTTI'])).toBe(true);
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
  it('3 passi con 2, 3 e 4 cerchi; 4 opzioni; una sola corretta; deterministico', () => {
    const steps = buildSteps(animals);
    expect(steps).toHaveLength(STEP_COUNT);
    expect(buildSteps(animals)).toEqual(steps);
    steps.forEach((s, k) => {
      expect(s.words).toHaveLength(k + 2);
      expect(s.options).toHaveLength(OPTION_COUNT);
      expect(s.correct).toBeGreaterThanOrEqual(0);
      expect(s.correct).toBeLessThan(OPTION_COUNT);
      for (const o of s.options) expect(o.circles).toHaveLength(k + 2);
    });
  });

  it('le parole si aggiungono: ogni passo estende il precedente', () => {
    const steps = buildSteps(animals);
    expect(steps[1]!.words.slice(0, 2)).toEqual(steps[0]!.words);
    expect(steps[2]!.words.slice(0, 3)).toEqual(steps[1]!.words);
    expect(new Set(steps[2]!.words).size).toBe(4);
  });

  it('i diagrammi realizzano esattamente le relazioni dichiarate per ogni opzione', () => {
    for (const s of buildSteps(animals)) {
      for (const o of s.options) expect(relationsOf(o.circles)).toEqual(o.relations);
    }
  });

  it('l’opzione giusta corrisponde alle relazioni del puzzle per quelle parole', () => {
    const m = buildMatrix(ANIMALI.relations).matrix!;
    for (const s of buildSteps(animals)) {
      const expected = allPairs(s.words.length).map(([i, j]) => m[s.words[i]!]![s.words[j]!]);
      expect(s.options[s.correct]!.relations).toEqual(expected);
    }
  });

  it('opzioni tutte diverse tra loro', () => {
    for (const s of buildSteps(animals)) {
      expect(new Set(s.options.map((o) => o.relations.join())).size).toBe(OPTION_COUNT);
    }
  });

  it('livelli difficili hanno risposte sbagliate più vicine a quella giusta', () => {
    const dist = (level: 'facile' | 'difficile') => {
      let sum = 0;
      let n = 0;
      for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
        for (const s of buildSteps({ ...animals, id, difficulty: { level } }).slice(1)) {
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
        expect(new Set(s.options.map((o) => o.relations.join())).size).toBe(OPTION_COUNT);
      }
      n++;
    }
    expect(n).toBe(1191);
  }, 180_000);
});

describe('revealOrder', () => {
  it('permutazione di 0..3, deterministica, evita la prima coppia disgiunta se possibile', () => {
    const m = buildMatrix(ANIMALI.relations).matrix!;
    const o = revealOrder(m, 'x');
    expect([...o].sort()).toEqual([0, 1, 2, 3]);
    expect(revealOrder(m, 'x')).toEqual(o);
    expect(m[o[0]!]![o[1]!]).not.toBe('NESSUNO');
  });
});

describe('explainMistake (lingue)', () => {
  it('in inglese usa frasi e virgolette inglesi', () => {
    const en = [
      { label: 'dogs', det: 'i' as const },
      { label: 'mammals', det: 'i' as const },
      { label: 'domestic animals', det: 'gli' as const },
      { label: 'fish', det: 'i' as const },
    ];
    const text = explainMistake(
      en,
      { words: [0, 1, 3] },
      ['TUTTI', 'NESSUNO', 'NESSUNO'],
      ['TUTTI', 'ALCUNI', 'NESSUNO'],
      'en',
    );
    expect(text).toBe('No dogs are fish: the “dogs” and “fish” circles don’t touch.');
  });
});

describe('explainMistake', () => {
  it('spiega la relazione vera di una coppia sbagliata, preferendo l’ultima parola', () => {
    // cani(0)⊂mammiferi(1); cani(0)∩pesci(3)=∅
    const step = { words: [0, 1, 3] };
    const truth: Relation[] = ['TUTTI', 'NESSUNO', 'NESSUNO']; // (0,1) (0,2) (1,2)
    const chosen: Relation[] = ['TUTTI', 'ALCUNI', 'NESSUNO'];
    const text = explainMistake(ANIMALI.concepts, step, truth, chosen);
    expect(text).toBe('Nessuno dei cani è tra i pesci: i cerchi «cani» e «pesci» non si toccano.');
  });
  it('vuoto se non ci sono differenze', () => {
    expect(explainMistake(ANIMALI.concepts, { words: [0, 1] }, ['TUTTI'], ['TUTTI'])).toBe('');
  });
});
