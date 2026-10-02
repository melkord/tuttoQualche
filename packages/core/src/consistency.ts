import { allPairs, relationBetween } from './relations';
import type { Matrix, Relation } from './types';
import { RELATIONS } from './types';

/**
 * Modello semantico: ogni elemento dell'universo cade in una "regione" di Venn, cioè in un
 * sottoinsieme (maschera di bit) dei concetti che lo contengono. Le relazioni a coppie si
 * traducono in
 *  - vincoli universali (regioni vietate): NESSUNO, TUTTI, CONTIENE, UGUALI;
 *  - vincoli esistenziali (regioni richieste): ogni concetto non vuoto, ALCUNI, e la stretta
 *    inclusione di TUTTI/CONTIENE.
 * I vincoli universali possono solo togliere regioni, quelli esistenziali solo richiederne:
 * esiste un modello se e solo se l'insieme MASSIMO di regioni non vietate soddisfa tutte le
 * richieste. Il controllo è quindi completo e deterministico (nessuna euristica).
 */

export type FailureKind = 'EMPTY_CONCEPT' | 'MISSING_REGION';

export interface Failure {
  kind: FailureKind;
  /** Concetti coinvolti (uno per EMPTY_CONCEPT, due per MISSING_REGION). */
  concepts: number[];
  /** Per MISSING_REGION: relazione dichiarata che non trova una regione per esistere. */
  relation?: Relation;
}

export interface RegionSolution {
  satisfiable: boolean;
  failures: Failure[];
  /** Regioni (maschere) non vietate. */
  allowed: number[];
}

function bit(mask: number, i: number): boolean {
  return ((mask >> i) & 1) === 1;
}

export function solveRegions(n: number, rel: (i: number, j: number) => Relation): RegionSolution {
  const pairs = allPairs(n);
  const allowed: number[] = [];
  for (let m = 1; m < 1 << n; m++) {
    let ok = true;
    for (const [i, j] of pairs) {
      const bi = bit(m, i);
      const bj = bit(m, j);
      switch (rel(i, j)) {
        case 'NESSUNO':
          if (bi && bj) ok = false;
          break;
        case 'TUTTI':
          if (bi && !bj) ok = false;
          break;
        case 'CONTIENE':
          if (bj && !bi) ok = false;
          break;
        case 'UGUALI':
          if (bi !== bj) ok = false;
          break;
        case 'ALCUNI':
          break;
      }
      if (!ok) break;
    }
    if (ok) allowed.push(m);
  }

  const failures: Failure[] = [];
  const has = (pred: (m: number) => boolean) => allowed.some(pred);

  for (let i = 0; i < n; i++) {
    if (!has((m) => bit(m, i))) failures.push({ kind: 'EMPTY_CONCEPT', concepts: [i] });
  }
  for (const [i, j] of pairs) {
    const r = rel(i, j);
    const need = (pred: (m: number) => boolean) => {
      if (!has(pred)) failures.push({ kind: 'MISSING_REGION', concepts: [i, j], relation: r });
    };
    if (r === 'ALCUNI') {
      need((m) => bit(m, i) && bit(m, j));
      need((m) => bit(m, i) && !bit(m, j));
      need((m) => bit(m, j) && !bit(m, i));
    } else if (r === 'TUTTI') {
      need((m) => bit(m, j) && !bit(m, i));
    } else if (r === 'CONTIENE') {
      need((m) => bit(m, i) && !bit(m, j));
    }
  }
  return { satisfiable: failures.length === 0, failures, allowed };
}

export function solveMatrix(m: Matrix): RegionSolution {
  return solveRegions(m.length, (i, j) => relationBetween(m, i, j));
}

export function isConsistent(m: Matrix): boolean {
  return solveMatrix(m).satisfiable;
}

type CompositionTable = Record<Relation, Record<Relation, Relation[]>>;

let composition: CompositionTable | undefined;

/**
 * Tabella di composizione: dati r(A→B) e r(B→C), le relazioni r(A→C) compatibili.
 * Derivata dal modello semantico su 3 concetti (non scritta a mano).
 */
export function compositionTable(): CompositionTable {
  if (composition) return composition;
  const table = {} as CompositionTable;
  for (const r1 of RELATIONS) {
    table[r1] = {} as Record<Relation, Relation[]>;
    for (const r2 of RELATIONS) {
      table[r1][r2] = RELATIONS.filter(
        (r3) =>
          solveRegions(3, (i, j) => (i === 0 && j === 1 ? r1 : i === 1 && j === 2 ? r2 : r3))
            .satisfiable,
      );
    }
  }
  composition = table;
  return table;
}

export interface TransitivityViolation {
  /** Terna i < j < k. */
  triple: [number, number, number];
  /** Relazione dichiarata tra i e k. */
  actual: Relation;
  /** Relazioni tra i e k ammesse da r(i,j) e r(j,k). */
  expected: Relation[];
}

/** Controllo di coerenza transitiva su ogni terna di concetti. */
export function findTransitivityViolations(m: Matrix): TransitivityViolation[] {
  const table = compositionTable();
  const out: TransitivityViolation[] = [];
  const n = m.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        const actual = relationBetween(m, i, k);
        const expected = table[relationBetween(m, i, j)][relationBetween(m, j, k)];
        if (!expected.includes(actual)) out.push({ triple: [i, j, k], actual, expected });
      }
  return out;
}

/** Coppie la cui relazione è imposta dalle altre cinque (nessuna alternativa coerente). */
export function forcedPairs(m: Matrix): [number, number][] {
  const out: [number, number][] = [];
  for (const [i, j] of allPairs(m.length)) {
    const current = relationBetween(m, i, j);
    const hasAlternative = RELATIONS.some(
      (alt) =>
        alt !== current &&
        solveRegions(m.length, (a, b) => (a === i && b === j ? alt : relationBetween(m, a, b)))
          .satisfiable,
    );
    if (!hasAlternative) out.push([i, j]);
  }
  return out;
}
