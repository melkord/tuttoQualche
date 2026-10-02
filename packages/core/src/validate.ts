import type { z } from 'zod';
import { findTransitivityViolations, solveMatrix } from './consistency';
import { estimateDifficulty } from './difficulty';
import { layoutCircles, layoutMatches } from './geometry';
import {
  answerOf,
  generateQuestions,
  isAmbiguousQuestion,
  renderQuestion,
  QUESTIONS_PER_PUZZLE,
} from './questions';
import { hashString } from './rng';
import { buildMatrix, relationBetween } from './relations';
import type { Circle, Concept, Difficulty, Issue, Matrix, Puzzle, PuzzleDraft } from './types';
import { PuzzleDraftSchema, PuzzleSchema } from './types';

const REL_IT = {
  TUTTI: 'tutti sono contenuti in',
  CONTIENE: 'contiene tutti',
  ALCUNI: 'alcuni in comune con',
  NESSUNO: 'nessuno in comune con',
  UGUALI: 'uguali a',
} as const;

const name = (concepts: readonly Concept[], i: number) => `«${concepts[i]?.label ?? `#${i}`}»`;

export interface ValidationReport {
  ok: boolean;
  issues: Issue[];
  matrix?: Matrix;
  /** Diagramma di riferimento trovato (utile alla revisione e ai test). */
  layout?: Circle[];
}

function zodIssues(error: z.ZodError): Issue[] {
  return error.issues.map((i) => ({
    code: 'SCHEMA' as const,
    severity: 'error' as const,
    message: `Formato non valido in "${i.path.join('.') || 'radice'}": ${i.message}`,
  }));
}

/**
 * Validazione logica deterministica di una bozza (concetti + relazioni):
 * schema, concetti distinti, matrice completa, coerenza transitiva, nessuna contraddizione
 * (modello a regioni di Venn), rappresentabilità con cerchi, unicità.
 *
 * Unicità: ogni coppia ha UNA sola relazione e la classificazione geometrica è una funzione
 * totale; il layout trovato deve quindi riprodurre esattamente la matrice e nessun'altra.
 */
export function validateDraft(input: unknown): ValidationReport {
  const parsed = PuzzleDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issues: zodIssues(parsed.error) };
  return validateParsedDraft(parsed.data);
}

function validateParsedDraft(draft: PuzzleDraft): ValidationReport {
  const issues: Issue[] = [];
  const { concepts } = draft;

  // Concetti distinti.
  const seen = new Map<string, number>();
  concepts.forEach((c, i) => {
    const key = c.label.trim().toLowerCase();
    const prev = seen.get(key);
    if (prev !== undefined) {
      issues.push({
        code: 'DUPLICATE_CONCEPT',
        severity: 'error',
        message: `Il concetto ${name(concepts, i)} è ripetuto.`,
        concepts: [prev, i],
      });
    }
    seen.set(key, i);
  });

  const { matrix, issues: matrixIssues } = buildMatrix(draft.relations);
  issues.push(...matrixIssues);
  if (!matrix) return { ok: false, issues };

  // Coerenza transitiva (messaggi per terna) …
  const violations = findTransitivityViolations(matrix);
  for (const v of violations) {
    const [i, j, k] = v.triple;
    issues.push({
      code: 'TRANSITIVITY',
      severity: 'error',
      message:
        `Incoerenza transitiva tra ${name(concepts, i)}, ${name(concepts, j)} e ${name(concepts, k)}: ` +
        `${name(concepts, i)} e ${name(concepts, k)} risultano "${v.actual}", ma dalle altre due ` +
        `relazioni sono ammessi solo: ${v.expected.join(', ')}.`,
      concepts: [i, j, k],
    });
  }

  // … e controllo semantico completo (nessuna contraddizione, nessun concetto vuoto).
  const solution = solveMatrix(matrix);
  for (const f of solution.failures) {
    if (f.kind === 'EMPTY_CONCEPT') {
      issues.push({
        code: 'EMPTY_CONCEPT',
        severity: 'error',
        message: `${name(concepts, f.concepts[0] as number)} dovrebbe essere vuoto per soddisfare le relazioni.`,
        concepts: f.concepts,
      });
    } else if (violations.length === 0) {
      const [i, j] = f.concepts as [number, number];
      issues.push({
        code: 'INCONSISTENT',
        severity: 'error',
        message: `Le relazioni sono contraddittorie: ${name(concepts, i)} ${REL_IT[f.relation ?? 'ALCUNI']} ${name(concepts, j)} non può valere insieme alle altre.`,
        concepts: f.concepts,
      });
    }
  }
  if (
    !solution.satisfiable &&
    !issues.some(
      (i) => i.code === 'INCONSISTENT' || i.code === 'TRANSITIVITY' || i.code === 'EMPTY_CONCEPT',
    )
  ) {
    issues.push({
      code: 'INCONSISTENT',
      severity: 'error',
      message: 'Le relazioni sono contraddittorie.',
    });
  }
  if (!solution.satisfiable) return { ok: false, issues, matrix };

  // Rappresentabilità e unicità.
  const layout = layoutCircles(matrix);
  if (!layout) {
    issues.push({
      code: 'NOT_REPRESENTABLE',
      severity: 'error',
      message: 'Nessun diagramma a cerchi realizza queste relazioni.',
    });
    return { ok: false, issues, matrix };
  }
  if (!layoutMatches(matrix, layout)) {
    issues.push({
      code: 'NOT_UNIQUE',
      severity: 'error',
      message: 'Il diagramma trovato non riproduce esattamente le relazioni dichiarate.',
    });
  }

  return { ok: !issues.some((i) => i.severity === 'error'), issues, matrix, layout };
}

/** Seed stabile per le domande: dipende solo dai contenuti del puzzle. */
export function puzzleSeed(draft: PuzzleDraft): string {
  return `${draft.theme}|${draft.concepts.map((c) => c.label).join('|')}`;
}

/** Identificativo stabile derivato dal contenuto (concetti + relazioni). */
export function puzzleId(draft: PuzzleDraft): string {
  const rels = [...draft.relations]
    .sort((x, y) => x.a - y.a || x.b - y.b)
    .map((r) => `${r.a}${r.b}${r.rel[0]}`)
    .join('');
  return `p-${hashString(puzzleSeed(draft) + rels)
    .toString(36)
    .padStart(7, '0')}`;
}

export class InvalidPuzzleError extends Error {
  constructor(public readonly issues: Issue[]) {
    super(`Puzzle non valido: ${issues.map((i) => i.message).join(' | ')}`);
  }
}

/** Valida la bozza e produce un puzzle completo (domande + difficoltà). Lancia se non valida. */
export function buildPuzzle(input: unknown, seed?: string): Puzzle {
  const report = validateDraft(input);
  if (!report.ok || !report.matrix) throw new InvalidPuzzleError(report.issues);
  const draft = PuzzleDraftSchema.parse(input);
  const questions = generateQuestions(report.matrix, draft.concepts, seed ?? puzzleSeed(draft));
  return {
    id: puzzleId(draft),
    theme: draft.theme,
    concepts: draft.concepts,
    relations: [...draft.relations].sort((x, y) => x.a - y.a || x.b - y.b),
    questions,
    difficulty: estimateDifficulty(report.matrix, questions),
  };
}

/** Validazione di un puzzle completo: bozza + domande + difficoltà dichiarata. */
export function validatePuzzle(input: unknown): ValidationReport {
  const parsed = PuzzleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issues: zodIssues(parsed.error) };
  const puzzle = parsed.data;
  const report = validateParsedDraft(puzzle);
  const issues = [...report.issues];
  const { matrix } = report;
  if (!matrix) return { ...report, ok: false };

  if (puzzle.questions.length !== QUESTIONS_PER_PUZZLE) {
    issues.push({
      code: 'QUESTION_COUNT',
      severity: 'error',
      message: `Servono esattamente ${QUESTIONS_PER_PUZZLE} domande (trovate ${puzzle.questions.length}).`,
    });
  }
  const statements = new Set<string>();
  puzzle.questions.forEach((q, idx) => {
    const label = `Domanda ${idx + 1}`;
    if (q.subject === q.object) {
      issues.push({
        code: 'QUESTION_WRONG_ANSWER',
        severity: 'error',
        message: `${label}: soggetto e oggetto coincidono.`,
      });
      return;
    }
    const key = `${q.kind}|${q.subject}|${q.object}`;
    if (statements.has(key)) {
      issues.push({
        code: 'QUESTION_DUPLICATE',
        severity: 'error',
        message: `${label}: ripetuta.`,
      });
    }
    statements.add(key);
    const r = relationBetween(matrix, q.subject, q.object);
    if (answerOf(q.kind, r) !== q.answer) {
      issues.push({
        code: 'QUESTION_WRONG_ANSWER',
        severity: 'error',
        message: `${label}: la risposta dichiarata (${q.answer ? 'vero' : 'falso'}) contraddice le relazioni.`,
      });
    }
    if (isAmbiguousQuestion(q.kind, r)) {
      issues.push({
        code: 'QUESTION_AMBIGUOUS',
        severity: 'error',
        message: `${label}: formulazione ambigua per questa relazione (${r}).`,
      });
    }
    const expectedText = renderQuestion(
      q.kind,
      puzzle.concepts[q.subject] as Concept,
      puzzle.concepts[q.object] as Concept,
    );
    if (q.text !== expectedText) {
      issues.push({
        code: 'QUESTION_TEXT',
        severity: 'error',
        message: `${label}: il testo non corrisponde ("${q.text}" invece di "${expectedText}").`,
      });
    }
  });

  const expectedDifficulty: Difficulty = estimateDifficulty(matrix, puzzle.questions);
  if (
    expectedDifficulty.score !== puzzle.difficulty.score ||
    expectedDifficulty.level !== puzzle.difficulty.level
  ) {
    issues.push({
      code: 'DIFFICULTY_MISMATCH',
      severity: 'warning',
      message: `Difficoltà dichiarata ${puzzle.difficulty.score}/${puzzle.difficulty.level}, calcolata ${expectedDifficulty.score}/${expectedDifficulty.level}.`,
    });
  }

  return { ...report, issues, ok: !issues.some((i) => i.severity === 'error') };
}
