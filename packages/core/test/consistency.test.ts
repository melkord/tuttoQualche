import { describe, expect, it } from 'vitest';
import {
  buildMatrix,
  compositionTable,
  findTransitivityViolations,
  forcedPairs,
  isConsistent,
  solveMatrix,
} from '../src';
import { allRelationCombos, ANIMALI, draftOf } from './fixtures';

const m = (rels: Parameters<typeof draftOf>[0]) => buildMatrix(draftOf(rels).relations).matrix!;
// ordine coppie: 01 02 03 12 13 23

describe('tabella di composizione (derivata dal modello)', () => {
  const t = compositionTable();
  it('TUTTI ∘ TUTTI = TUTTI', () => expect(t.TUTTI.TUTTI).toEqual(['TUTTI']));
  it('CONTIENE ∘ CONTIENE = CONTIENE', () => expect(t.CONTIENE.CONTIENE).toEqual(['CONTIENE']));
  it('TUTTI ∘ NESSUNO = NESSUNO (A⊂B, B∩C=∅ ⇒ A∩C=∅)', () =>
    expect(t.TUTTI.NESSUNO).toEqual(['NESSUNO']));
  it('NESSUNO ∘ CONTIENE = NESSUNO', () => expect(t.NESSUNO.CONTIENE).toEqual(['NESSUNO']));
  it('UGUALI è elemento neutro', () => {
    for (const r of ['TUTTI', 'CONTIENE', 'ALCUNI', 'NESSUNO', 'UGUALI'] as const) {
      expect(t.UGUALI[r]).toEqual([r]);
      expect(t[r].UGUALI).toEqual([r]);
    }
  });
  it('TUTTI ∘ CONTIENE (A⊂B, C⊂B) lascia aperte tutte le relazioni', () =>
    expect(t.TUTTI.CONTIENE).toHaveLength(5));
  it('ALCUNI ∘ ALCUNI è completamente libero', () => expect(t.ALCUNI.ALCUNI).toHaveLength(5));
});

describe('coerenza', () => {
  it('accetta il puzzle di esempio', () => {
    const matrix = buildMatrix(ANIMALI.relations).matrix!;
    expect(isConsistent(matrix)).toBe(true);
    expect(findTransitivityViolations(matrix)).toEqual([]);
  });

  it('A⊂B, B⊂C ma A∩C=∅ è contraddittorio (e A resterebbe vuoto)', () => {
    // 01 TUTTI, 12 TUTTI, 02 NESSUNO
    const matrix = m(['TUTTI', 'NESSUNO', 'ALCUNI', 'TUTTI', 'ALCUNI', 'ALCUNI']);
    expect(isConsistent(matrix)).toBe(false);
    const v = findTransitivityViolations(matrix);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0]!.triple).toEqual([0, 1, 2]);
  });

  it('due concetti UGUALI devono avere le stesse relazioni con gli altri', () => {
    const matrix = m(['UGUALI', 'TUTTI', 'NESSUNO', 'ALCUNI', 'ALCUNI', 'NESSUNO']);
    expect(isConsistent(matrix)).toBe(false);
  });

  it('TUTTI e UGUALI sono distinti: inclusione propria richiede un elemento in più', () => {
    const ok = m(['TUTTI', 'NESSUNO', 'NESSUNO', 'NESSUNO', 'NESSUNO', 'NESSUNO']);
    expect(isConsistent(ok)).toBe(true);
    expect(solveMatrix(ok).allowed).toContain(0b0011);
  });

  it('tutti disgiunti è coerente; tutti ALCUNI è coerente', () => {
    expect(isConsistent(m(Array(6).fill('NESSUNO')))).toBe(true);
    expect(isConsistent(m(Array(6).fill('ALCUNI')))).toBe(true);
    expect(isConsistent(m(Array(6).fill('UGUALI')))).toBe(true);
  });

  it('la verifica a terne coincide con la verifica semantica completa su tutte le 15625 matrici', () => {
    let consistent = 0;
    for (const rels of allRelationCombos()) {
      const matrix = m(rels);
      const semantic = isConsistent(matrix);
      const triples = findTransitivityViolations(matrix).length === 0;
      expect(triples).toBe(semantic);
      if (semantic) consistent++;
    }
    expect(consistent).toBe(1191);
  });
});

describe('coppie deducibili', () => {
  it('catena A⊂B⊂C⊂D: solo le 3 inclusioni adiacenti sono libere', () => {
    const matrix = m(['TUTTI', 'TUTTI', 'TUTTI', 'TUTTI', 'TUTTI', 'TUTTI']);
    expect(forcedPairs(matrix)).toEqual([
      [0, 2],
      [0, 3],
      [1, 3],
    ]);
  });
});
