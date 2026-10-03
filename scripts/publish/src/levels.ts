import type { DifficultyLevel, Puzzle } from '@tuttialcuni/core';

export interface LevelEntry {
  id: string;
  theme: string;
  /** Livello dentro il tema (1 = il più facile). */
  level: number;
  difficulty: DifficultyLevel;
  score: number;
}

export interface LevelIndex {
  themes: { theme: string; levels: LevelEntry[] }[];
}

/**
 * Raggruppa i puzzle per tema e li numera per difficoltà crescente (1, 2, 3, …).
 * Deterministico: a parità di difficoltà decide l'id. I temi sono in ordine alfabetico.
 */
export function buildLevels(puzzles: readonly Puzzle[]): LevelIndex {
  const byTheme = new Map<string, Puzzle[]>();
  for (const p of puzzles) byTheme.set(p.theme, [...(byTheme.get(p.theme) ?? []), p]);
  const themes = [...byTheme.keys()]
    .sort((a, b) => a.localeCompare(b, 'it'))
    .map((theme) => ({
      theme,
      levels: (byTheme.get(theme) as Puzzle[])
        .sort((a, b) => a.difficulty.score - b.difficulty.score || a.id.localeCompare(b.id))
        .map((p, i): LevelEntry => ({
          id: p.id,
          theme,
          level: i + 1,
          difficulty: p.difficulty.level,
          score: p.difficulty.score,
        })),
    }));
  return { themes };
}
