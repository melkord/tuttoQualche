import type { Concept, Lang, PuzzleDraft } from './types';

type Localizable = Pick<PuzzleDraft, 'theme' | 'concepts' | 'translations'>;

/** True se il puzzle ha una traduzione completa per `lang`. */
export function hasLang(puzzle: Localizable, lang: Lang): boolean {
  return lang === 'it' || !!puzzle.translations?.[lang];
}

/**
 * Concetti nella lingua richiesta. Se manca la traduzione si ripiega sull'italiano.
 * L'articolo (`det`) serve solo all'italiano: per le altre lingue è ignorato.
 */
export function localizedConcepts(puzzle: Localizable, lang: Lang): Concept[] {
  const t = lang === 'it' ? undefined : puzzle.translations?.[lang];
  if (!t) return puzzle.concepts;
  return puzzle.concepts.map((c, i) => ({ det: c.det, label: t.concepts[i] ?? c.label }));
}

export function localizedTheme(puzzle: Localizable, lang: Lang): string {
  return (lang === 'it' ? undefined : puzzle.translations?.[lang]?.theme) ?? puzzle.theme;
}

/** Chiave di una traduzione: le etichette italiane dei 4 concetti, in ordine. Non dipende dalle relazioni. */
export function translationKey(italianLabels: readonly string[]): string {
  return italianLabels.map((l) => l.trim().toLowerCase()).join('|');
}
