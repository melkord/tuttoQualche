import { solveRegions } from './consistency';
import { fitCircles, layoutCircles } from './geometry';
import { describeRelation } from './questions';
import { allPairs, buildMatrix, relationBetween } from './relations';
import { hashString, mulberry32 } from './rng';
import type { Circle, Concept, Difficulty, Lang, Matrix, PairRelation, Relation } from './types';
import { RELATIONS } from './types';

/**
 * Modalità "risposta chiusa" con insiemi che si compongono: 4 parole, 3 domande.
 * Alla domanda k si vedono le prime k+2 parole (2, 3, poi 4) e si sceglie, tra 4 diagrammi
 * con quel numero di cerchi, quello che rappresenta correttamente le relazioni tra loro.
 */
export const STEP_COUNT = 3;
export const OPTION_COUNT = 4;

/** Relazioni tra le parole di un passo, nell'ordine di `allPairs(n)`: (0,1), (0,2), (0,3), (1,2)… */
export type Assignment = Relation[];

export interface StepOption {
  relations: Assignment;
  /** Un cerchio per parola, nell'ordine di rivelazione (slot 0, 1, …). */
  circles: Circle[];
}

export interface Step {
  /** Indici dei concetti del puzzle mostrati in questo passo, nell'ordine di rivelazione. */
  words: number[];
  options: StepOption[];
  /** Indice dell'opzione corretta in `options`. */
  correct: number;
}

const cache = new Map<number, Assignment[]>();

/** Tutte le assegnazioni di relazioni coerenti (quindi disegnabili) per `n` parole. */
export function consistentAssignments(n: number): Assignment[] {
  const hit = cache.get(n);
  if (hit) return hit;
  const pairs = allPairs(n);
  const out: Assignment[] = [];
  const cur: Relation[] = [];
  const lookup = new Map<string, number>(pairs.map(([i, j], k) => [`${i}-${j}`, k]));
  const rec = (k: number) => {
    if (k === pairs.length) {
      const snapshot = cur.slice();
      if (
        solveRegions(n, (i, j) => snapshot[lookup.get(`${i}-${j}`) as number] as Relation)
          .satisfiable
      ) {
        out.push(snapshot);
      }
      return;
    }
    for (const r of RELATIONS) {
      cur[k] = r;
      rec(k + 1);
    }
  };
  rec(0);
  cache.set(n, out);
  return out;
}

export function assignmentMatrix(a: Assignment, n: number): Matrix | null {
  const relations: PairRelation[] = allPairs(n).map(([x, y], k) => ({
    a: x,
    b: y,
    rel: a[k] as Relation,
  }));
  return buildMatrix(relations, n).matrix;
}

const hamming = (a: Assignment, b: Assignment) => a.filter((r, i) => r !== b[i]).length;

/** Distanza media preferita tra la risposta giusta e le sbagliate (1 = differiscono per una coppia). */
const TARGET_DISTANCE: Record<Difficulty['level'], number> = {
  facile: 2.6,
  medio: 1.8,
  difficile: 1.1,
};

export function drawAssignment(a: Assignment, n: number, seed: number): Circle[] {
  const m = assignmentMatrix(a, n);
  const circles = m ? layoutCircles(m, seed) : null;
  if (!circles) throw new Error(`Configurazione non disegnabile: ${a.join(',')}`);
  const rotation = mulberry32(seed ^ 0x9e3779b9)() * Math.PI * 2;
  return fitCircles(circles, rotation);
}

/**
 * Ordine di rivelazione delle 4 parole: casuale ma deterministico, evitando se possibile che
 * le prime due siano disgiunte (la domanda 1 sarebbe banale).
 */
export function revealOrder(matrix: Matrix, seed: string): number[] {
  const rng = mulberry32(hashString(`${seed}|order`));
  const perms: number[][] = [];
  const rec = (rest: number[], acc: number[]) => {
    if (rest.length === 0) return void perms.push(acc);
    for (const x of rest)
      rec(
        rest.filter((y) => y !== x),
        [...acc, x],
      );
  };
  rec(
    Array.from({ length: matrix.length }, (_, i) => i),
    [],
  );
  const score = (p: number[]) =>
    relationBetween(matrix, p[0] as number, p[1] as number) === 'NESSUNO' ? 1 : 0;
  const best = Math.min(...perms.map(score));
  const pool = perms.filter((p) => score(p) === best);
  return pool[Math.floor(rng() * pool.length)] as number[];
}

export function buildSteps(
  puzzle: { id: string; relations: PairRelation[]; difficulty: Pick<Difficulty, 'level'> },
  seed: string = puzzle.id,
): Step[] {
  const m = buildMatrix(puzzle.relations).matrix;
  if (!m) throw new Error('Puzzle senza matrice valida');
  const order = revealOrder(m, seed);
  const target = TARGET_DISTANCE[puzzle.difficulty.level];

  return Array.from({ length: STEP_COUNT }, (_, stepIndex): Step => {
    const n = stepIndex + 2;
    const words = order.slice(0, n);
    const truth: Assignment = allPairs(n).map(([i, j]) =>
      relationBetween(m, words[i] as number, words[j] as number),
    );
    const stepSeed = hashString(`${seed}|${stepIndex}`);
    const rng = mulberry32(stepSeed);
    const hasEqual = truth.includes('UGUALI');
    const maxDist = allPairs(n).length;
    const wrong = consistentAssignments(n)
      .filter((a) => hamming(a, truth) > 0 && (hasEqual || !a.includes('UGUALI')))
      .map((a) => ({
        a,
        key: Math.abs(Math.min(hamming(a, truth), maxDist) - target) + rng() * 0.9,
      }))
      .sort((x, y) => x.key - y.key)
      .slice(0, OPTION_COUNT - 1)
      .map((x) => x.a);

    const correct = Math.floor(rng() * OPTION_COUNT);
    const ordered: Assignment[] = [...wrong];
    ordered.splice(correct, 0, truth);
    return {
      words,
      correct,
      options: ordered.map((a, i) => ({
        relations: a,
        circles: drawAssignment(a, n, stepSeed + i * 7919),
      })),
    };
  });
}

const SHAPE_HINT: Record<Lang, Record<Relation, (a: string, b: string) => string>> = {
  it: {
    TUTTI: (a, b) => `il cerchio «${a}» sta tutto dentro «${b}»`,
    CONTIENE: (a, b) => `il cerchio «${b}» sta tutto dentro «${a}»`,
    ALCUNI: (a, b) => `i cerchi «${a}» e «${b}» si sovrappongono solo in parte`,
    NESSUNO: (a, b) => `i cerchi «${a}» e «${b}» non si toccano`,
    UGUALI: (a, b) => `i cerchi «${a}» e «${b}» coincidono`,
  },
  en: {
    TUTTI: (a, b) => `the “${a}” circle sits entirely inside “${b}”`,
    CONTIENE: (a, b) => `the “${b}” circle sits entirely inside “${a}”`,
    ALCUNI: (a, b) => `the “${a}” and “${b}” circles overlap only partly`,
    NESSUNO: (a, b) => `the “${a}” and “${b}” circles don’t touch`,
    UGUALI: (a, b) => `the “${a}” and “${b}” circles coincide`,
  },
};

/**
 * Spiegazione mostrata dopo una scelta sbagliata: prende una coppia in cui l'opzione scelta
 * sbaglia (preferendo quelle che coinvolgono l'ultima parola arrivata) e dice com'è davvero.
 */
export function explainMistake(
  concepts: readonly Concept[],
  step: Pick<Step, 'words'>,
  truth: Assignment,
  chosen: Assignment,
  lang: Lang = 'it',
): string {
  const n = step.words.length;
  const pairs = allPairs(n);
  const wrongPairs = pairs
    .map(([i, j], k) => ({ i, j, k }))
    .filter(({ k }) => truth[k] !== chosen[k]);
  const pick = wrongPairs.find(({ j }) => j === n - 1) ?? wrongPairs[0];
  if (!pick) return '';
  const a = concepts[step.words[pick.i] as number] as Concept;
  const b = concepts[step.words[pick.j] as number] as Concept;
  const rel = truth[pick.k] as Relation;
  const sentence = describeSentence(a, b, rel, lang);
  return `${sentence}: ${SHAPE_HINT[lang][rel](a.label, b.label)}.`;
}

const describeSentence = (a: Concept, b: Concept, rel: Relation, lang: Lang) => {
  const s = describeRelation(a, b, rel, lang);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
