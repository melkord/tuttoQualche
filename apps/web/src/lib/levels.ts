import type { LevelEntry, LevelIndex } from './puzzles';
import { starsOf } from './storage';
import type { Store } from './storage';

export const isDone = (store: Store, id: string) => store.progress[id]?.phase === 'done';

/** Stelle ottenute su un livello completato (0 se non completato). */
export const starsFor = (store: Store, id: string): 0 | 1 | 2 | 3 => {
  const p = store.progress[id];
  return p && p.phase === 'done' ? starsOf(p) : 0;
};

/** Il livello 1 è sempre aperto; gli altri si sbloccano completando il precedente dello stesso tema. */
export function isUnlocked(index: LevelIndex, store: Store, id: string): boolean {
  for (const t of index.themes) {
    const i = t.levels.findIndex((l) => l.id === id);
    if (i === -1) continue;
    return i === 0 || isDone(store, (t.levels[i - 1] as LevelEntry).id);
  }
  return false;
}

/** Livello da proporre in "Continua": quello in corso, il successivo, o il primo non completato. */
export function continueEntry(index: LevelIndex, store: Store): LevelEntry | null {
  const all = index.themes.flatMap((t) => t.levels);
  const open = (l: LevelEntry) => !isDone(store, l.id) && isUnlocked(index, store, l.id);
  const last = all.find((l) => l.id === store.lastPlayed);
  if (last && open(last)) return last;
  if (last) {
    const theme = index.themes.find((t) => t.theme === last.theme);
    const next = theme?.levels.find(open);
    if (next) return next;
  }
  return all.find(open) ?? null;
}

export function nextInTheme(index: LevelIndex, id: string): LevelEntry | null {
  for (const t of index.themes) {
    const i = t.levels.findIndex((l) => l.id === id);
    if (i !== -1) return t.levels[i + 1] ?? null;
  }
  return null;
}
