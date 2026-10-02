import type { Issue, Matrix, PairRelation, Relation } from './types';
import { CONCEPT_COUNT } from './types';

export const INVERSE: Record<Relation, Relation> = {
  TUTTI: 'CONTIENE',
  CONTIENE: 'TUTTI',
  ALCUNI: 'ALCUNI',
  NESSUNO: 'NESSUNO',
  UGUALI: 'UGUALI',
};

/** Tutte le coppie non ordinate (i < j) di n concetti. */
export function allPairs(n: number = CONCEPT_COUNT): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
  return out;
}

export function relationBetween(m: Matrix, i: number, j: number): Relation {
  const row = m[i];
  const rel = row?.[j];
  if (!rel) throw new RangeError(`Coppia fuori dalla matrice: ${i},${j}`);
  return rel;
}

/** Costruisce la matrice da una lista di sei coppie; riporta problemi strutturali. */
export function buildMatrix(
  relations: readonly PairRelation[],
  n: number = CONCEPT_COUNT,
): { matrix: Matrix | null; issues: Issue[] } {
  const issues: Issue[] = [];
  const seen = new Map<string, Relation>();
  for (const { a, b, rel } of relations) {
    if (a === b || a < 0 || b < 0 || a >= n || b >= n) {
      issues.push({
        code: 'PAIR_ORDER',
        severity: 'error',
        message: `Coppia non valida (${a}, ${b}).`,
        concepts: [a, b],
      });
      continue;
    }
    if (a > b) {
      issues.push({
        code: 'PAIR_ORDER',
        severity: 'error',
        message: `La coppia (${a}, ${b}) deve avere indici ordinati (a < b).`,
        concepts: [a, b],
      });
      continue;
    }
    const key = `${a}-${b}`;
    if (seen.has(key)) {
      issues.push({
        code: 'PAIR_DUPLICATE',
        severity: 'error',
        message: `Coppia (${a}, ${b}) definita più volte.`,
        concepts: [a, b],
      });
      continue;
    }
    seen.set(key, rel);
  }
  for (const [i, j] of allPairs(n)) {
    if (!seen.has(`${i}-${j}`)) {
      issues.push({
        code: 'PAIR_MISSING',
        severity: 'error',
        message: `Manca la relazione tra i concetti ${i} e ${j}.`,
        concepts: [i, j],
      });
    }
  }
  if (issues.length > 0) return { matrix: null, issues };

  const matrix: Matrix = Array.from({ length: n }, () =>
    Array.from({ length: n }, (): Relation => 'UGUALI'),
  );
  for (const [i, j] of allPairs(n)) {
    const rel = seen.get(`${i}-${j}`) as Relation;
    (matrix[i] as Relation[])[j] = rel;
    (matrix[j] as Relation[])[i] = INVERSE[rel];
  }
  return { matrix, issues };
}

/** Inverso di buildMatrix: lista di coppie (a < b) dalla matrice. */
export function matrixToRelations(m: Matrix): PairRelation[] {
  return allPairs(m.length).map(([a, b]) => ({ a, b, rel: relationBetween(m, a, b) }));
}
