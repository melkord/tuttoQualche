import { describe, expect, it } from 'vitest';
import type { Concept } from '../src';
import {
  answerOf,
  describeRelation,
  buildMatrix,
  generateQuestions,
  isAmbiguousQuestion,
  isConsistent,
  relationBetween,
  renderQuestion,
  RELATIONS,
  QUESTION_KINDS,
} from '../src';
import { allRelationCombos, ANIMALI, CONCEPTS, draftOf } from './fixtures';

describe('answerOf', () => {
  it('tabella di verità attesa', () => {
    const expected = {
      TUTTI: { TUTTI: true, CONTIENE: false, ALCUNI: false, NESSUNO: false, UGUALI: true },
      ALCUNI: { TUTTI: true, CONTIENE: true, ALCUNI: true, NESSUNO: false, UGUALI: true },
      NESSUNO: { TUTTI: false, CONTIENE: false, ALCUNI: false, NESSUNO: true, UGUALI: false },
      ALCUNI_NON: { TUTTI: false, CONTIENE: true, ALCUNI: true, NESSUNO: true, UGUALI: false },
    } as const;
    for (const k of QUESTION_KINDS)
      for (const r of RELATIONS) expect(answerOf(k, r)).toBe(expected[k][r]);
  });

  it('"alcuni" ambiguo è escluso', () => {
    expect(isAmbiguousQuestion('ALCUNI', 'TUTTI')).toBe(true);
    expect(isAmbiguousQuestion('ALCUNI', 'CONTIENE')).toBe(true);
    expect(isAmbiguousQuestion('ALCUNI', 'ALCUNI')).toBe(false);
    expect(isAmbiguousQuestion('ALCUNI', 'NESSUNO')).toBe(false);
    expect(isAmbiguousQuestion('ALCUNI_NON', 'NESSUNO')).toBe(true);
    expect(isAmbiguousQuestion('ALCUNI_NON', 'CONTIENE')).toBe(false);
  });
});

describe('renderQuestion', () => {
  const [cani, mammiferi, domestici] = ANIMALI.concepts as [Concept, Concept, Concept];
  const [rose, fiori] = CONCEPTS as [Concept, Concept];
  it('frasi italiane corrette (maschile)', () => {
    expect(renderQuestion('TUTTI', cani, mammiferi)).toBe('Tutti i cani sono mammiferi?');
    expect(renderQuestion('ALCUNI', domestici, cani)).toBe('Alcuni animali domestici sono cani?');
    expect(renderQuestion('NESSUNO', cani, domestici)).toBe(
      'Nessuno dei cani è tra gli animali domestici?',
    );
    expect(renderQuestion('ALCUNI_NON', mammiferi, cani)).toBe('Alcuni mammiferi non sono cani?');
  });
  it('accordo femminile', () => {
    expect(renderQuestion('TUTTI', rose, fiori)).toBe('Tutte le rose sono fiori?');
    expect(renderQuestion('ALCUNI', rose, fiori)).toBe('Alcune rose sono fiori?');
    expect(renderQuestion('NESSUNO', rose, fiori)).toBe('Nessuna delle rose è tra i fiori?');
    expect(renderQuestion('ALCUNI_NON', rose, fiori)).toBe('Alcune rose non sono fiori?');
  });
});

describe('describeRelation', () => {
  const [cani, mammiferi] = ANIMALI.concepts as [Concept, Concept];
  const [rose, fiori] = CONCEPTS as [Concept, Concept];
  it('descrive ogni relazione in italiano', () => {
    expect(describeRelation(cani, mammiferi, 'TUTTI')).toBe('Tutti i cani sono mammiferi');
    expect(describeRelation(cani, mammiferi, 'CONTIENE')).toBe('Tutti i mammiferi sono cani');
    expect(describeRelation(cani, mammiferi, 'ALCUNI')).toBe(
      'Alcuni cani sono mammiferi, altri no',
    );
    expect(describeRelation(cani, mammiferi, 'NESSUNO')).toBe('Nessuno dei cani è tra i mammiferi');
    expect(describeRelation(rose, fiori, 'TUTTI')).toBe('Tutte le rose sono fiori');
    expect(describeRelation(rose, fiori, 'UGUALI')).toBe('rose e fiori coincidono');
  });
});

describe('generateQuestions', () => {
  const matrix = buildMatrix(ANIMALI.relations).matrix!;

  it('produce 3 domande deterministiche, con risposte corrette e testo coerente', () => {
    const q1 = generateQuestions(matrix, ANIMALI.concepts, 'seed');
    const q2 = generateQuestions(matrix, ANIMALI.concepts, 'seed');
    expect(q1).toEqual(q2);
    expect(q1).toHaveLength(3);
    for (const q of q1) {
      const r = relationBetween(matrix, q.subject, q.object);
      expect(q.answer).toBe(answerOf(q.kind, r));
      expect(isAmbiguousQuestion(q.kind, r)).toBe(false);
      expect(q.text).toBe(
        renderQuestion(q.kind, ANIMALI.concepts[q.subject]!, ANIMALI.concepts[q.object]!),
      );
    }
  });

  it('seed diversi possono dare domande diverse', () => {
    const sets = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((s) =>
        JSON.stringify(generateQuestions(matrix, ANIMALI.concepts, s).map((q) => q.text)),
      ),
    );
    expect(sets.size).toBeGreaterThan(1);
  });

  it('per ogni matrice coerente: 3 domande distinte, non ambigue, mix di risposte vere e false', () => {
    for (const rels of allRelationCombos()) {
      const mx = buildMatrix(draftOf(rels).relations).matrix!;
      if (!isConsistent(mx)) continue;
      const qs = generateQuestions(mx, CONCEPTS, 'x');
      expect(qs).toHaveLength(3);
      expect(new Set(qs.map((q) => `${q.kind}${q.subject}${q.object}`)).size).toBe(3);
      for (const q of qs) {
        expect(q.subject).not.toBe(q.object);
        expect(isAmbiguousQuestion(q.kind, relationBetween(mx, q.subject, q.object))).toBe(false);
      }
      expect(new Set(qs.map((q) => q.answer)).size).toBe(2);
    }
  }, 120_000);
});
