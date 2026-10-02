import { forcedPairs } from './consistency';
import { allPairs, relationBetween } from './relations';
import type { Difficulty, DifficultyLevel, Matrix, Question } from './types';

export interface DifficultyFactors {
  /** Coppie ALCUNI (intersezioni parziali). */
  overlaps: number;
  /** Coppie UGUALI (sinonimi: due cerchi coincidenti). */
  equals: number;
  /** Coppie la cui relazione NON è dedotta dalle altre: va conosciuta, non ricavata. */
  freePairs: number;
  /** Numero di tipi di relazione diversi usati (1–5). */
  relationKinds: number;
  /** Domande che richiedono una negazione (NESSUNO / ALCUNI_NON). */
  negativeQuestions: number;
}

export const LEVEL_THRESHOLDS = { medio: 30, difficile: 60 } as const;

export function levelOf(score: number): DifficultyLevel {
  if (score >= LEVEL_THRESHOLDS.difficile) return 'difficile';
  if (score >= LEVEL_THRESHOLDS.medio) return 'medio';
  return 'facile';
}

export function difficultyFactors(m: Matrix, questions: readonly Question[]): DifficultyFactors {
  const rels = allPairs(m.length).map(([i, j]) => relationBetween(m, i, j));
  const kinds = new Set(rels.map((r) => (r === 'CONTIENE' ? 'TUTTI' : r)));
  return {
    overlaps: rels.filter((r) => r === 'ALCUNI').length,
    equals: rels.filter((r) => r === 'UGUALI').length,
    freePairs: rels.length - forcedPairs(m).length,
    relationKinds: kinds.size,
    negativeQuestions: questions.filter((q) => q.kind === 'NESSUNO' || q.kind === 'ALCUNI_NON')
      .length,
  };
}

/**
 * Euristica di difficoltà 0–100 (somma pesata, tagliata a 100):
 *   10·overlaps + 6·equals + 4·freePairs + 6·(relationKinds−1) + 4·negativeQuestions
 * Intersezioni parziali e sinonimi sono i punti dove si sbaglia di più; le relazioni
 * deducibili per transitività aiutano, quelle "libere" richiedono conoscenza del mondo.
 */
export function estimateDifficulty(m: Matrix, questions: readonly Question[]): Difficulty {
  const f = difficultyFactors(m, questions);
  const raw =
    10 * f.overlaps +
    6 * f.equals +
    4 * f.freePairs +
    6 * (f.relationKinds - 1) +
    4 * f.negativeQuestions;
  const score = Math.min(100, raw);
  return { score, level: levelOf(score) };
}
