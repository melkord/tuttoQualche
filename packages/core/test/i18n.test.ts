import { describe, expect, it } from 'vitest';
import { buildPuzzle, hasLang, localizedConcepts, localizedTheme, PuzzleDraftSchema } from '../src';
import { ANIMALI } from './fixtures';

const withEn = {
  ...ANIMALI,
  translations: {
    en: { theme: 'animals', concepts: ['dogs', 'mammals', 'domestic animals', 'fish'] },
  },
};

describe('traduzioni', () => {
  it('localizedConcepts/localizedTheme: lingua richiesta, ripiego sull’italiano', () => {
    expect(localizedConcepts(withEn, 'en').map((c) => c.label)).toEqual([
      'dogs',
      'mammals',
      'domestic animals',
      'fish',
    ]);
    expect(localizedConcepts(withEn, 'it').map((c) => c.label)).toEqual(
      ANIMALI.concepts.map((c) => c.label),
    );
    expect(localizedConcepts(ANIMALI, 'en').map((c) => c.label)).toEqual(
      ANIMALI.concepts.map((c) => c.label),
    );
    expect(localizedTheme(withEn, 'en')).toBe('animals');
    expect(localizedTheme(ANIMALI, 'en')).toBe('animali');
    expect(hasLang(withEn, 'en')).toBe(true);
    expect(hasLang(ANIMALI, 'en')).toBe(false);
    expect(hasLang(ANIMALI, 'it')).toBe(true);
  });

  it('buildPuzzle conserva le traduzioni e l’id non dipende da esse', () => {
    const a = buildPuzzle(withEn);
    const b = buildPuzzle(ANIMALI);
    expect(a.translations?.en?.theme).toBe('animals');
    expect(b.translations).toBeUndefined();
    expect(a.id).toBe(b.id);
  });

  it('lo schema rifiuta traduzioni con un numero sbagliato di concetti', () => {
    const bad = { ...ANIMALI, translations: { en: { theme: 'x', concepts: ['a', 'b'] } } };
    expect(PuzzleDraftSchema.safeParse(bad).success).toBe(false);
    expect(PuzzleDraftSchema.safeParse(withEn).success).toBe(true);
  });
});
