import { z } from 'zod';
import { allPairs } from './relations';
import { PuzzleSchema } from './types';

export const RISK_LEVELS = ['basso', 'medio', 'alto'] as const;
export const RiskLevelSchema = z.enum(RISK_LEVELS);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RiskSchema = z.object({
  level: RiskLevelSchema,
  reason: z.string(),
});
export type Risk = z.infer<typeof RiskSchema>;

/** Chiave di coppia usata nei rischi: "01", "02", … (indici a<b). */
export type PairKey = `${number}${number}`;
export const pairKey = (a: number, b: number): PairKey => `${a}${b}` as PairKey;
export const ALL_PAIR_KEYS: PairKey[] = allPairs().map(([a, b]) => pairKey(a, b));

/** Puzzle in attesa di revisione: puzzle + rischio di ambiguità per ciascuna relazione. */
export const PendingPuzzleSchema = z.object({
  puzzle: PuzzleSchema,
  /** Rischio di ambiguità per coppia ("01"…"23"), dal passaggio critico. */
  risks: z.record(z.string(), RiskSchema),
  meta: z.object({
    generatedAt: z.string(),
    model: z.string(),
  }),
});
export type PendingPuzzle = z.infer<typeof PendingPuzzleSchema>;
