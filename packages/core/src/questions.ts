import { hashString, mulberry32 } from './rng';
import { allPairs, relationBetween } from './relations';
import type { Concept, Determiner, Matrix, Question, QuestionKind, Relation } from './types';
import { QUESTION_KINDS } from './types';

/**
 * Semantica LOGICA delle domande (r = relazione del soggetto verso l'oggetto):
 *  - TUTTI:      vero se S ⊆ O            (TUTTI, UGUALI)
 *  - ALCUNI:     vero se S ∩ O ≠ ∅        (tutte tranne NESSUNO)
 *  - NESSUNO:    vero se S ∩ O = ∅        (NESSUNO)
 *  - ALCUNI_NON: vero se S ⊄ O            (ALCUNI, CONTIENE, NESSUNO)
 */
export function answerOf(kind: QuestionKind, r: Relation): boolean {
  switch (kind) {
    case 'TUTTI':
      return r === 'TUTTI' || r === 'UGUALI';
    case 'ALCUNI':
      return r !== 'NESSUNO';
    case 'NESSUNO':
      return r === 'NESSUNO';
    case 'ALCUNI_NON':
      return r === 'ALCUNI' || r === 'CONTIENE' || r === 'NESSUNO';
  }
}

/**
 * "Alcuni" nel parlato implica "non tutti": una domanda logicamente corretta può quindi
 * ingannare. Queste combinazioni non vengono mai generate né accettate:
 *  - "Alcuni S sono O?" con S ⊆ O (TUTTI, UGUALI) o O ⊆ S (CONTIENE)
 *  - "Alcuni S non sono O?" con S e O disgiunti (NESSUNO)
 */
export function isAmbiguousQuestion(kind: QuestionKind, r: Relation): boolean {
  if (kind === 'ALCUNI') return r === 'TUTTI' || r === 'UGUALI' || r === 'CONTIENE';
  if (kind === 'ALCUNI_NON') return r === 'NESSUNO';
  return false;
}

const DEL: Record<Determiner, string> = { i: 'dei', gli: 'degli', le: 'delle' };
const TUTTI_F: Record<Determiner, string> = { i: 'Tutti', gli: 'Tutti', le: 'Tutte' };
const ALCUNI_F: Record<Determiner, string> = { i: 'Alcuni', gli: 'Alcuni', le: 'Alcune' };
const NESSUNO_F: Record<Determiner, string> = { i: 'Nessuno', gli: 'Nessuno', le: 'Nessuna' };

/** Testo italiano della domanda. */
export function renderQuestion(kind: QuestionKind, subject: Concept, object: Concept): string {
  const s = subject.label;
  const o = object.label;
  switch (kind) {
    case 'TUTTI':
      return `${TUTTI_F[subject.det]} ${subject.det} ${s} sono ${o}?`;
    case 'ALCUNI':
      return `${ALCUNI_F[subject.det]} ${s} sono ${o}?`;
    case 'NESSUNO':
      return `${NESSUNO_F[subject.det]} ${DEL[subject.det]} ${s} è tra ${object.det} ${o}?`;
    case 'ALCUNI_NON':
      return `${ALCUNI_F[subject.det]} ${s} non sono ${o}?`;
  }
}

export const QUESTIONS_PER_PUZZLE = 3;

interface Candidate {
  kind: QuestionKind;
  subject: number;
  object: number;
  answer: boolean;
}

function candidates(m: Matrix): Candidate[] {
  const out: Candidate[] = [];
  for (const [i, j] of allPairs(m.length)) {
    for (const [s, o] of [
      [i, j],
      [j, i],
    ] as const) {
      const r = relationBetween(m, s, o);
      for (const kind of QUESTION_KINDS) {
        if (isAmbiguousQuestion(kind, r)) continue;
        out.push({ kind, subject: s, object: o, answer: answerOf(kind, r) });
      }
    }
  }
  return out;
}

const pairKey = (c: Candidate) =>
  `${Math.min(c.subject, c.object)}-${Math.max(c.subject, c.object)}`;

function score(set: Candidate[]): number {
  let s = 0;
  const pairs = new Set(set.map(pairKey));
  const kinds = new Set(set.map((c) => c.kind));
  const trues = set.filter((c) => c.answer).length;
  s += pairs.size * 4; // coppie diverse: copre più del diagramma
  s += kinds.size * 3; // tipi di domanda vari
  if (trues > 0 && trues < set.length) s += 5; // almeno un vero e un falso
  if (trues === 1 || trues === 2) s += 1;
  return s;
}

/**
 * Genera 3 domande vero/falso dalla matrice, in modo deterministico per un dato seed.
 * Preferisce coppie diverse, tipi di domanda vari e un mix di risposte; non produce mai
 * domande ambigue (vedi isAmbiguousQuestion).
 */
export function generateQuestions(
  m: Matrix,
  concepts: readonly Concept[],
  seed: number | string = 0,
): Question[] {
  const rng = mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
  const cs = candidates(m);
  if (cs.length < QUESTIONS_PER_PUZZLE) {
    throw new Error('Troppo poche domande non ambigue per questa matrice.');
  }
  const tie = cs.map(() => rng());
  let best: number[] = [];
  let bestScore = -1;
  let bestTie = -1;
  for (let a = 0; a < cs.length; a++)
    for (let b = a + 1; b < cs.length; b++)
      for (let c = b + 1; c < cs.length; c++) {
        const set = [cs[a], cs[b], cs[c]] as Candidate[];
        const sc = score(set);
        const tb = (tie[a] as number) + (tie[b] as number) + (tie[c] as number);
        if (sc > bestScore || (sc === bestScore && tb > bestTie)) {
          best = [a, b, c];
          bestScore = sc;
          bestTie = tb;
        }
      }
  const chosen = best.map((i) => cs[i] as Candidate);
  // Ordine di presentazione deterministico ma non legato all'indice dei concetti.
  chosen.sort((x, y) => (tie[cs.indexOf(x)] as number) - (tie[cs.indexOf(y)] as number));
  return chosen.map((c) => ({
    kind: c.kind,
    subject: c.subject,
    object: c.object,
    answer: c.answer,
    text: renderQuestion(c.kind, concepts[c.subject] as Concept, concepts[c.object] as Concept),
  }));
}
