import { PuzzleSchema } from '@tuttialcuni/core';
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

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Non trovato (${res.status})`);
  try {
    return await res.json();
  } catch {
    // su hosting SPA un file mancante restituisce l'index.html
    throw new Error('Puzzle non disponibile');
  }
}

export async function fetchIndex(): Promise<LevelIndex> {
  const json = (await getJson('/puzzles/index.json')) as Partial<LevelIndex>;
  return { themes: Array.isArray(json.themes) ? json.themes : [] };
}

export async function fetchPuzzle(id: string): Promise<Puzzle> {
  if (!/^p-[a-z0-9]+$/.test(id)) throw new Error('Puzzle non valido');
  const parsed = PuzzleSchema.safeParse(await getJson(`/puzzles/${id}.json`));
  if (!parsed.success) throw new Error('Puzzle non valido');
  return parsed.data;
}
