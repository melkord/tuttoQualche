import { describe, expect, it } from 'vitest';
import { validatePuzzle } from '@eulero/core';
import { LevelInputSchema, levelSignature, prepareLevel, toDraft } from '../src/add';
import type { LevelInput } from '../src/add';

const GOOD: LevelInput = {
  theme: 'Animali',
  themeEn: 'Animals',
  concepts: ['i cani', 'i mammiferi', 'gli animali domestici', 'i pesci'],
  conceptsEn: ['Dogs', 'mammals', 'pets', 'fish'],
  relations: 'TTNANA',
  risks: { '02': ['medio', 'Esistono cani randagi.'] },
};
const NOW = new Date('2026-10-04T03:00:00Z');

describe('toDraft', () => {
  it('articoli, normalizzazione, relazioni e traduzione', () => {
    const d = toDraft(GOOD);
    expect(d.theme).toBe('animali');
    expect(d.concepts[2]).toEqual({ det: 'gli', label: 'animali domestici' });
    expect(d.relations.map((r) => r.rel)).toEqual([
      'TUTTI',
      'TUTTI',
      'NESSUNO',
      'ALCUNI',
      'NESSUNO',
      'ALCUNI',
    ]);
    expect(d.translations?.en).toEqual({
      theme: 'animals',
      concepts: ['dogs', 'mammals', 'pets', 'fish'],
    });
  });
});

describe('LevelInputSchema', () => {
  it('rifiuta articoli mancanti, relazioni malformate e numero sbagliato di concetti', () => {
    expect(LevelInputSchema.safeParse(GOOD).success).toBe(true);
    expect(LevelInputSchema.safeParse({ ...GOOD, concepts: ['cani', 'a', 'b', 'c'] }).success).toBe(
      false,
    );
    expect(LevelInputSchema.safeParse({ ...GOOD, relations: 'TTNAN' }).success).toBe(false);
    expect(LevelInputSchema.safeParse({ ...GOOD, relations: 'TTNANX' }).success).toBe(false);
    expect(LevelInputSchema.safeParse({ ...GOOD, conceptsEn: ['a', 'b'] }).success).toBe(false);
  });
});

describe('prepareLevel', () => {
  it('accetta un livello valido: puzzle completo con traduzione, rischi e meta', () => {
    const seen = new Set<string>();
    const res = prepareLevel(GOOD, seen, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(validatePuzzle(res.pending.puzzle).ok).toBe(true);
    expect(res.pending.puzzle.translations?.en?.theme).toBe('animals');
    expect(res.pending.risks['02']).toEqual({ level: 'medio', reason: 'Esistono cani randagi.' });
    expect(res.pending.risks['01']?.level).toBe('basso');
    expect(res.pending.meta).toEqual({ generatedAt: NOW.toISOString(), model: 'routine' });
    expect(seen.has(levelSignature(['cani', 'mammiferi', 'animali domestici', 'pesci']))).toBe(
      true,
    );
  });

  it('scarta i duplicati (stessi concetti in qualunque ordine)', () => {
    const seen = new Set<string>();
    expect(prepareLevel(GOOD, seen, NOW).ok).toBe(true);
    const shuffled = {
      ...GOOD,
      concepts: [...GOOD.concepts].reverse(),
      conceptsEn: [...GOOD.conceptsEn].reverse(),
      relations: 'TTNANA',
    };
    const again = prepareLevel(shuffled, seen, NOW);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toContain('duplicato');
  });

  it('scarta relazioni incoerenti con un messaggio chiaro', () => {
    // A⊂B, A∩C=∅, B⊂C → impossibile
    const res = prepareLevel({ ...GOOD, relations: 'TNNTNN' }, new Set(), NOW);
    expect(res.ok).toBe(false);
  });

  it('scarta il rischio "alto" e le traduzioni duplicate', () => {
    const alto = prepareLevel(
      { ...GOOD, risks: { '01': ['alto', 'discutibile'] } },
      new Set(),
      NOW,
    );
    expect(alto.ok).toBe(false);
    if (!alto.ok) expect(alto.error).toContain('rischio alto');
    const dupEn = prepareLevel(
      { ...GOOD, conceptsEn: ['dogs', 'dogs', 'pets', 'fish'] },
      new Set(),
      NOW,
    );
    expect(dupEn.ok).toBe(false);
  });

  it('un livello scartato non entra tra i visti', () => {
    const seen = new Set<string>();
    prepareLevel({ ...GOOD, relations: 'TNNTNN' }, seen, NOW);
    expect(seen.size).toBe(0);
  });
});
