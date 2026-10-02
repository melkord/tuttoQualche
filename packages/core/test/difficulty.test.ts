import { describe, expect, it } from 'vitest';
import {
  buildMatrix,
  difficultyFactors,
  estimateDifficulty,
  generateQuestions,
  levelOf,
} from '../src';
import { ANIMALI, CONCEPTS, draftOf } from './fixtures';

const mk = (rels: Parameters<typeof draftOf>[0]) => {
  const m = buildMatrix(draftOf(rels).relations).matrix!;
  return { m, q: generateQuestions(m, CONCEPTS, 's') };
};

describe('estimateDifficulty', () => {
  it('catena di inclusioni = facile', () => {
    const { m, q } = mk(Array(6).fill('TUTTI'));
    const d = estimateDifficulty(m, q);
    expect(d.level).toBe('facile');
  });

  it('tutti disgiunti = molto facile', () => {
    const { m, q } = mk(Array(6).fill('NESSUNO'));
    expect(estimateDifficulty(m, q).score).toBeLessThan(30);
  });

  it('molte intersezioni parziali = difficile', () => {
    const { m, q } = mk(Array(6).fill('ALCUNI'));
    const d = estimateDifficulty(m, q);
    expect(d.level).toBe('difficile');
  });

  it('puzzle di esempio = medio, e il punteggio è in [0,100]', () => {
    const m = buildMatrix(ANIMALI.relations).matrix!;
    const q = generateQuestions(m, ANIMALI.concepts, 's');
    const d = estimateDifficulty(m, q);
    expect(d.level).toBe('medio');
    expect(d.score).toBeGreaterThanOrEqual(0);
    expect(d.score).toBeLessThanOrEqual(100);
  });

  it('più intersezioni ⇒ non più facile', () => {
    const easy = mk(['TUTTI', 'TUTTI', 'NESSUNO', 'TUTTI', 'NESSUNO', 'NESSUNO']);
    const harder = mk(['ALCUNI', 'ALCUNI', 'NESSUNO', 'ALCUNI', 'NESSUNO', 'NESSUNO']);
    expect(estimateDifficulty(harder.m, harder.q).score).toBeGreaterThan(
      estimateDifficulty(easy.m, easy.q).score,
    );
  });

  it('i fattori sono contati correttamente', () => {
    const m = buildMatrix(ANIMALI.relations).matrix!;
    const f = difficultyFactors(m, []);
    expect(f.overlaps).toBe(2);
    expect(f.equals).toBe(0);
    expect(f.relationKinds).toBe(3);
  });

  it('soglie dei livelli', () => {
    expect(levelOf(0)).toBe('facile');
    expect(levelOf(29)).toBe('facile');
    expect(levelOf(30)).toBe('medio');
    expect(levelOf(59)).toBe('medio');
    expect(levelOf(60)).toBe('difficile');
  });
});
