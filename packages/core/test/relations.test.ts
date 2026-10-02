import { describe, expect, it } from 'vitest';
import { allPairs, buildMatrix, INVERSE, matrixToRelations, relationBetween } from '../src';
import { ANIMALI } from './fixtures';

describe('buildMatrix', () => {
  it('costruisce una matrice simmetrica rispetto all’inverso', () => {
    const { matrix, issues } = buildMatrix(ANIMALI.relations);
    expect(issues).toEqual([]);
    expect(matrix).not.toBeNull();
    const m = matrix!;
    expect(relationBetween(m, 0, 1)).toBe('TUTTI');
    expect(relationBetween(m, 1, 0)).toBe('CONTIENE');
    for (const [i, j] of allPairs(4)) {
      expect(relationBetween(m, j, i)).toBe(INVERSE[relationBetween(m, i, j)]);
    }
    for (let i = 0; i < 4; i++) expect(relationBetween(m, i, i)).toBe('UGUALI');
  });

  it('round-trip con matrixToRelations', () => {
    const { matrix } = buildMatrix(ANIMALI.relations);
    expect(matrixToRelations(matrix!)).toEqual(ANIMALI.relations);
  });

  it('segnala coppie mancanti, duplicate e con indici non ordinati', () => {
    const missing = buildMatrix(ANIMALI.relations.slice(1));
    expect(missing.matrix).toBeNull();
    expect(missing.issues.map((i) => i.code)).toEqual(['PAIR_MISSING']);

    const dup = buildMatrix([...ANIMALI.relations, { a: 0, b: 1, rel: 'ALCUNI' }]);
    expect(dup.issues.map((i) => i.code)).toContain('PAIR_DUPLICATE');

    const unordered = buildMatrix([{ a: 1, b: 0, rel: 'TUTTI' }, ...ANIMALI.relations.slice(1)]);
    expect(unordered.issues.map((i) => i.code)).toContain('PAIR_ORDER');
  });

  it('INVERSE è un’involuzione', () => {
    for (const r of Object.keys(INVERSE) as (keyof typeof INVERSE)[]) {
      expect(INVERSE[INVERSE[r]]).toBe(r);
    }
  });
});
