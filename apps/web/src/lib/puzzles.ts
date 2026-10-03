import { PuzzleSchema } from '@eulero/core';
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
    /** Nome da mostrare per lingua. */
    names?: Partial<Record<Lang, string>>;
    levels: LevelEntry[];
  }[];
}

export type LoadErrorCode = 'NOT_FOUND' | 'UNAVAILABLE' | 'INVALID';

/** Errore di caricamento con un codice: il testo lo sceglie l'interfaccia, nella lingua giusta. */
export class LoadError extends Error {
  constructor(readonly code: LoadErrorCode) {
    super(code);
  }
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new LoadError('NOT_FOUND');
  try {
    return await res.json();
  } catch {
    // su hosting SPA un file mancante restituisce l'index.html
    throw new LoadError('UNAVAILABLE');
  }
}

export async function fetchIndex(): Promise<LevelIndex> {
  const json = (await getJson('/puzzles/index.json')) as Partial<LevelIndex>;
  return { themes: Array.isArray(json.themes) ? json.themes : [] };
}

export async function fetchPuzzle(id: string): Promise<Puzzle> {
  if (!/^p-[a-z0-9]+$/.test(id)) throw new LoadError('INVALID');
  const parsed = PuzzleSchema.safeParse(await getJson(`/puzzles/${id}.json`));
  if (!parsed.success) throw new LoadError('INVALID');
  return parsed.data;
}
