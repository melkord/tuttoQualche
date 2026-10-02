import { describe, expect, it } from 'vitest';
import { buildPuzzle, InvalidPuzzleError, puzzleId, validateDraft, validatePuzzle } from '../src';
import { ANIMALI, CONCEPTS, draftOf } from './fixtures';

describe('validateDraft', () => {
  it('accetta il puzzle di esempio e fornisce un layout', () => {
    const r = validateDraft(ANIMALI);
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.layout).toHaveLength(4);
  });

  it('schema non valido: messaggi in italiano', () => {
    const r = validateDraft({ theme: 'x', concepts: [], relations: [] });
    expect(r.ok).toBe(false);
    expect(r.issues[0]!.code).toBe('SCHEMA');
    expect(validateDraft(null).ok).toBe(false);
  });

  it('determinante non ammesso', () => {
    const bad = { ...ANIMALI, concepts: ANIMALI.concepts.map((c) => ({ ...c, det: 'il' })) };
    expect(validateDraft(bad).ok).toBe(false);
  });

  it('concetti duplicati (case-insensitive)', () => {
    const concepts = [...CONCEPTS];
    concepts[1] = { label: ' ROSE ', det: 'le' };
    const r = validateDraft(
      draftOf(['ALCUNI', 'NESSUNO', 'NESSUNO', 'NESSUNO', 'NESSUNO', 'NESSUNO'], concepts),
    );
    expect(r.issues.map((i) => i.code)).toContain('DUPLICATE_CONCEPT');
    expect(r.ok).toBe(false);
  });

  it('contraddizione transitiva: messaggio con la terna', () => {
    const r = validateDraft(draftOf(['TUTTI', 'NESSUNO', 'ALCUNI', 'TUTTI', 'ALCUNI', 'ALCUNI']));
    expect(r.ok).toBe(false);
    const t = r.issues.find((i) => i.code === 'TRANSITIVITY');
    expect(t).toBeDefined();
    expect(t!.message).toContain('«rose»');
    expect(r.layout).toBeUndefined();
  });

  it('relazione mancante', () => {
    const d = { ...ANIMALI, relations: ANIMALI.relations.slice(0, 5) };
    const r = validateDraft(d);
    expect(r.ok).toBe(false);
    expect(r.issues[0]!.code).toBe('PAIR_MISSING');
  });
});

describe('buildPuzzle / validatePuzzle', () => {
  it('produce un puzzle completo e valido', () => {
    const p = buildPuzzle(ANIMALI);
    expect(p.questions).toHaveLength(3);
    expect(p.id).toBe(puzzleId(ANIMALI));
    const r = validatePuzzle(p);
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('id stabile e indipendente dall’ordine delle relazioni', () => {
    const shuffled = { ...ANIMALI, relations: [...ANIMALI.relations].reverse() };
    expect(puzzleId(shuffled)).toBe(puzzleId(ANIMALI));
    expect(buildPuzzle(shuffled)).toEqual(buildPuzzle(ANIMALI));
  });

  it('buildPuzzle lancia InvalidPuzzleError per bozze incoerenti', () => {
    expect(() =>
      buildPuzzle(draftOf(['TUTTI', 'NESSUNO', 'ALCUNI', 'TUTTI', 'ALCUNI', 'ALCUNI'])),
    ).toThrow(InvalidPuzzleError);
  });

  it('rileva risposta sbagliata, testo alterato, domanda ripetuta, conteggio', () => {
    const p = buildPuzzle(ANIMALI);
    const wrong = structuredClone(p);
    wrong.questions[0]!.answer = !wrong.questions[0]!.answer;
    expect(validatePuzzle(wrong).issues.map((i) => i.code)).toContain('QUESTION_WRONG_ANSWER');

    const text = structuredClone(p);
    text.questions[1]!.text = 'Boh?';
    expect(validatePuzzle(text).issues.map((i) => i.code)).toContain('QUESTION_TEXT');

    const dup = structuredClone(p);
    dup.questions[1] = structuredClone(dup.questions[0]!);
    expect(validatePuzzle(dup).issues.map((i) => i.code)).toContain('QUESTION_DUPLICATE');

    const few = structuredClone(p);
    few.questions.pop();
    expect(validatePuzzle(few).issues.map((i) => i.code)).toContain('QUESTION_COUNT');
  });

  it('rileva domanda ambigua ("alcuni" con inclusione)', () => {
    const p = structuredClone(buildPuzzle(ANIMALI));
    // cani (0) ⊂ mammiferi (1): "Alcuni cani sono mammiferi?" è logicamente vero ma ambiguo
    p.questions[0] = {
      kind: 'ALCUNI',
      subject: 0,
      object: 1,
      answer: true,
      text: 'Alcuni cani sono mammiferi?',
    };
    const r = validatePuzzle(p);
    expect(r.issues.map((i) => i.code)).toContain('QUESTION_AMBIGUOUS');
    expect(r.ok).toBe(false);
  });

  it('difficoltà non coerente = warning, non errore', () => {
    const p = structuredClone(buildPuzzle(ANIMALI));
    p.difficulty = { score: 5, level: 'facile' };
    const r = validatePuzzle(p);
    expect(r.issues.map((i) => i.code)).toContain('DIFFICULTY_MISMATCH');
    expect(r.ok).toBe(true);
  });
});
