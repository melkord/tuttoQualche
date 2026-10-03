import { solveRegions } from './consistency';
import { fitCircles, layoutCircles } from './geometry';
import { buildMatrix, relationBetween } from './relations';
import { hashString, mulberry32 } from './rng';
import type { Circle, Concept, Difficulty, PairRelation, Relation } from './types';
import { RELATIONS } from './types';

/**
 * Modalità di gioco "risposta chiusa": ogni puzzle è una sequenza di 3 passi. In ogni passo si
 * vedono 3 dei 4 concetti e si sceglie, tra 4 diagrammi, quello che li rappresenta.
 */
export const STEP_COUNT = 3;
export const OPTION_COUNT = 4;

/** Relazioni di una terna (i < j < k): (i,j), (i,k), (j,k). */
export type Triple = [Relation, Relation, Relation];

export interface StepOption {
  relations: Triple;
  /** Cerchi, nell'ordine dei concetti del passo. */
  circles: Circle[];
}

export interface Step {
  /** Indici (nel puzzle) dei 3 concetti mostrati, in ordine crescente. */
  concepts: [number, number, number];
  options: StepOption[];
  /** Indice dell'opzione corretta in `options`. */
  correct: number;
}

const PAIRS_OF_TRIPLE = [
  [0, 1],
  [0, 2],
  [1, 2],
] as const;

let consistent: Triple[] | undefined;

/** Tutte le terne di relazioni logicamente coerenti (e quindi disegnabili). */
export function consistentTriples(): Triple[] {
  if (consistent) return consistent;
  const out: Triple[] = [];
  for (const a of RELATIONS)
    for (const b of RELATIONS)
      for (const c of RELATIONS) {
        const t: Triple = [a, b, c];
        const ok = solveRegions(
          3,
          (i, j) => t[PAIRS_OF_TRIPLE.findIndex(([x, y]) => x === i && y === j)] as Relation,
        ).satisfiable;
        if (ok) out.push(t);
      }
  consistent = out;
  return out;
}

const hamming = (a: Triple, b: Triple) => a.filter((r, i) => r !== b[i]).length;
const same = (a: Triple, b: Triple) => hamming(a, b) === 0;

export function tripleMatrix(t: Triple) {
  const relations: PairRelation[] = PAIRS_OF_TRIPLE.map(([a, b], k) => ({
    a,
    b,
    rel: t[k] as Relation,
  }));
  return buildMatrix(relations, 3).matrix;
}

/** Quanto è "facile da sbagliare": più intersezioni parziali = più difficile. */
const triplePenalty = (t: Triple) => t.filter((r) => r === 'ALCUNI').length;

/** Distanza preferita tra risposta giusta e sbagliate, per livello (1 = differiscono per una coppia). */
const TARGET_DISTANCE: Record<Difficulty['level'], number> = {
  facile: 2,
  medio: 1.4,
  difficile: 1,
};

export function drawTriple(t: Triple, seed: number): Circle[] {
  const m = tripleMatrix(t);
  const circles = m ? layoutCircles(m, seed) : null;
  if (!circles) throw new Error(`Terna non disegnabile: ${t.join(',')}`);
  const rotation = mulberry32(seed ^ 0x9e3779b9)() * Math.PI * 2;
  return fitCircles(circles, rotation);
}

export function buildSteps(
  puzzle: { id: string; relations: PairRelation[]; difficulty: Pick<Difficulty, 'level'> },
  seed: string = puzzle.id,
): Step[] {
  const m = buildMatrix(puzzle.relations).matrix;
  if (!m) throw new Error('Puzzle senza matrice valida');
  const rng = mulberry32(hashString(`${seed}|steps`));

  // 3 terne distinte: si omette ogni volta un concetto diverso (3 dei 4). Prima le più semplici.
  const omit = [0, 1, 2, 3].sort(() => rng() - 0.5).slice(0, STEP_COUNT);
  const triples = omit.map((o) => {
    const concepts = [0, 1, 2, 3].filter((c) => c !== o) as [number, number, number];
    const relations: Triple = [
      relationBetween(m, concepts[0], concepts[1]),
      relationBetween(m, concepts[0], concepts[2]),
      relationBetween(m, concepts[1], concepts[2]),
    ];
    return { concepts, relations };
  });
  triples.sort((a, b) => triplePenalty(a.relations) - triplePenalty(b.relations));

  const target = TARGET_DISTANCE[puzzle.difficulty.level];
  const all = consistentTriples();

  return triples.map(({ concepts, relations }, stepIndex): Step => {
    const stepSeed = hashString(`${seed}|${stepIndex}`);
    const stepRng = mulberry32(stepSeed);
    const hasEqual = relations.includes('UGUALI');
    const wrong = all
      .filter((t) => !same(t, relations) && (hasEqual || !t.includes('UGUALI')))
      .map((t) => ({ t, key: Math.abs(hamming(t, relations) - target) + stepRng() * 0.9 }))
      .sort((a, b) => a.key - b.key)
      .slice(0, OPTION_COUNT - 1)
      .map((x) => x.t);

    const correct = Math.floor(stepRng() * OPTION_COUNT);
    const ordered: Triple[] = [...wrong];
    ordered.splice(correct, 0, relations);
    return {
      concepts,
      correct,
      options: ordered.map((t, i) => ({
        relations: t,
        circles: drawTriple(t, stepSeed + i * 7919),
      })),
    };
  });
}

/** Etichetta breve di un concetto, per i test e i messaggi. */
export const conceptLabel = (concepts: readonly Concept[], i: number) =>
  concepts[i]?.label ?? `#${i}`;
