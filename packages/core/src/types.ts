import { z } from 'zod';

/**
 * Relazione di A verso B (A = primo concetto, B = secondo).
 * - TUTTI:    tutti gli A sono B, ma non viceversa (A ⊂ B, proprio)
 * - CONTIENE: tutti i B sono A, ma non viceversa (B ⊂ A, proprio)
 * - ALCUNI:   intersezione parziale (né A ⊆ B, né B ⊆ A, né disgiunti)
 * - NESSUNO:  disgiunti
 * - UGUALI:   stessa estensione
 */
export const RELATIONS = ['TUTTI', 'CONTIENE', 'ALCUNI', 'NESSUNO', 'UGUALI'] as const;
export const RelationSchema = z.enum(RELATIONS);
export type Relation = z.infer<typeof RelationSchema>;

/** Articolo determinativo plurale del concetto (serve a costruire frasi corrette). */
export const DETERMINERS = ['i', 'gli', 'le'] as const;
export const DeterminerSchema = z.enum(DETERMINERS);
export type Determiner = z.infer<typeof DeterminerSchema>;

export const CONCEPT_COUNT = 4;

export const ConceptSchema = z.object({
  /** Etichetta al plurale, minuscola: "cani", "animali domestici". */
  label: z.string().min(1).max(40),
  det: DeterminerSchema,
});
export type Concept = z.infer<typeof ConceptSchema>;

export const ConceptIndexSchema = z
  .number()
  .int()
  .min(0)
  .max(CONCEPT_COUNT - 1);
export type ConceptIndex = z.infer<typeof ConceptIndexSchema>;

/** Relazione di `a` verso `b`; per convenzione a < b. */
export const PairRelationSchema = z.object({
  a: ConceptIndexSchema,
  b: ConceptIndexSchema,
  rel: RelationSchema,
});
export type PairRelation = z.infer<typeof PairRelationSchema>;

export const QUESTION_KINDS = ['TUTTI', 'ALCUNI', 'NESSUNO', 'ALCUNI_NON'] as const;
export const QuestionKindSchema = z.enum(QUESTION_KINDS);
/**
 * - TUTTI:      "Tutti i S sono O?"
 * - ALCUNI:     "Alcuni S sono O?"
 * - NESSUNO:    "Nessuno dei S è tra gli O?"
 * - ALCUNI_NON: "Alcuni S non sono O?"
 */
export type QuestionKind = z.infer<typeof QuestionKindSchema>;

export const QuestionSchema = z.object({
  kind: QuestionKindSchema,
  subject: ConceptIndexSchema,
  object: ConceptIndexSchema,
  answer: z.boolean(),
  text: z.string().min(1),
});
export type Question = z.infer<typeof QuestionSchema>;

export const DIFFICULTY_LEVELS = ['facile', 'medio', 'difficile'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DifficultySchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(DIFFICULTY_LEVELS),
});
export type Difficulty = z.infer<typeof DifficultySchema>;

/** Bozza: ciò che produce un generatore (o un autore) prima delle domande. */
export const PuzzleDraftSchema = z.object({
  theme: z.string().min(1).max(60),
  concepts: z.array(ConceptSchema).length(CONCEPT_COUNT),
  relations: z.array(PairRelationSchema),
});
export type PuzzleDraft = z.infer<typeof PuzzleDraftSchema>;

export const PuzzleSchema = PuzzleDraftSchema.extend({
  id: z.string().min(1),
  questions: z.array(QuestionSchema),
  difficulty: DifficultySchema,
});
export type Puzzle = z.infer<typeof PuzzleSchema>;

/** Matrice n×n: m[i][j] = relazione di i verso j. Diagonale = UGUALI. */
export type Matrix = Relation[][];

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

export type Severity = 'error' | 'warning';

export type IssueCode =
  | 'SCHEMA'
  | 'DUPLICATE_CONCEPT'
  | 'PAIR_MISSING'
  | 'PAIR_DUPLICATE'
  | 'PAIR_ORDER'
  | 'TRANSITIVITY'
  | 'EMPTY_CONCEPT'
  | 'INCONSISTENT'
  | 'NOT_REPRESENTABLE'
  | 'NOT_UNIQUE'
  | 'QUESTION_COUNT'
  | 'QUESTION_WRONG_ANSWER'
  | 'QUESTION_AMBIGUOUS'
  | 'QUESTION_DUPLICATE'
  | 'QUESTION_TEXT'
  | 'DIFFICULTY_MISMATCH';

export interface Issue {
  code: IssueCode;
  severity: Severity;
  message: string;
  /** Indici dei concetti coinvolti, se pertinente. */
  concepts?: number[];
}
