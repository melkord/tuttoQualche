import { describe, expect, it } from 'vitest';
import { buildPuzzle } from '@eulero/core';
import type { PuzzleDraft } from '@eulero/core';
import { buildLevels } from '../src/levels';

const R = { T: 'TUTTI', A: 'ALCUNI', N: 'NESSUNO' } as const;
const pairs = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
] as const;
const mk = (theme: string, tag: string, rels: string) => {
  const draft: PuzzleDraft = {
    theme,
    concepts: ['a', 'b', 'c', 'd'].map((l) => ({ label: l + tag, det: 'i' as const })),
    relations: pairs.map(([a, b], k) => ({ a, b, rel: R[rels[k] as keyof typeof R] })),
  };
  return buildPuzzle(draft);
};

describe('buildLevels: nomi dei temi', () => {
  it('names.en dalla traduzione del puzzle, altrimenti ripiego sull’italiano', () => {
    const base = mk('sport', '9', 'NNNNNN');
    const tr = {
      ...base,
      translations: { en: { theme: 'sports', concepts: ['a', 'b', 'c', 'd'] } },
    };
    expect(buildLevels([tr]).themes[0]!.names).toEqual({ it: 'sport', en: 'sports' });
    expect(buildLevels([base]).themes[0]!.names).toEqual({ it: 'sport', en: 'sport' });
  });
});

describe('buildLevels', () => {
  const easy = mk('sport', '1', 'NNNNNN');
  const hard = mk('sport', '2', 'AAAAAA');
  const other = mk('animali', '3', 'NNNNNN');

  it('raggruppa per tema (alfabetico) e numera per difficoltà crescente', () => {
    const idx = buildLevels([hard, other, easy]);
    expect(idx.themes.map((t) => t.theme)).toEqual(['animali', 'sport']);
    const sport = idx.themes[1]!.levels;
    expect(sport.map((l) => l.level)).toEqual([1, 2]);
    expect(sport.map((l) => l.id)).toEqual([easy.id, hard.id]);
    expect(sport[0]!.score).toBeLessThan(sport[1]!.score);
  });

  it('è deterministico rispetto all’ordine di ingresso', () => {
    expect(buildLevels([hard, other, easy])).toEqual(buildLevels([easy, hard, other]));
  });
});
