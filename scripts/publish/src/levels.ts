import type { DifficultyLevel, Lang, Puzzle } from '@eulero/core';

export interface LevelEntry {
  id: string;
  theme: string;
  /** Livello dentro il tema (1 = il più facile). */
  level: number;
  difficulty: DifficultyLevel;
  score: number;
}

export interface LevelIndex {
  themes: {
    /** Chiave del tema (italiano): identificatore stabile. */
    theme: string;
    /** Nome da mostrare, per lingua (ripiego sull'italiano se manca la traduzione). */
    names: Record<Lang, string>;
    levels: LevelEntry[];
  }[];
}

/**
 * Raggruppa i puzzle per tema e li numera (1, 2, 3, …).
 *
 * L'ordine è STABILE: con `previous` (l'indice già pubblicato) i livelli e i temi già noti restano
 * dove sono e i nuovi vanno in coda (temi nuovi in fondo alla lista, livelli nuovi in fondo al
 * tema, per difficoltà crescente). Così aggiungere puzzle non sposta i livelli già giocati né
 * rompe lo sblocco in sequenza. Senza `previous`: temi in ordine alfabetico, livelli per difficoltà.
 * Deterministico.
 */
export function buildLevels(puzzles: readonly Puzzle[], previous?: LevelIndex): LevelIndex {
  const byTheme = new Map<string, Puzzle[]>();
  for (const p of puzzles) byTheme.set(p.theme, [...(byTheme.get(p.theme) ?? []), p]);

  const knownThemes = (previous?.themes ?? []).map((t) => t.theme).filter((t) => byTheme.has(t));
  const newThemes = [...byTheme.keys()]
    .filter((t) => !knownThemes.includes(t))
    .sort((a, b) => a.localeCompare(b, 'it'));

  const themes = [...knownThemes, ...newThemes].map((theme) => {
    const list = byTheme.get(theme) as Puzzle[];
    const byId = new Map(list.map((p) => [p.id, p]));
    const prevIds = (previous?.themes.find((t) => t.theme === theme)?.levels ?? [])
      .map((l) => l.id)
      .filter((id) => byId.has(id));
    const fresh = list
      .filter((p) => !prevIds.includes(p.id))
      .sort((a, b) => a.difficulty.score - b.difficulty.score || a.id.localeCompare(b.id));
    const ordered = [...prevIds.map((id) => byId.get(id) as Puzzle), ...fresh];
    return {
      theme,
      names: {
        it: theme,
        en: list.find((p) => p.translations?.en)?.translations?.en?.theme ?? theme,
      },
      levels: ordered.map((p, i): LevelEntry => ({
        id: p.id,
        theme,
        level: i + 1,
        difficulty: p.difficulty.level,
        score: p.difficulty.score,
      })),
    };
  });
  return { themes };
}
