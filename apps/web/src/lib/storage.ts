import { prevDay } from './date';

/** Avanzamento su un singolo puzzle. */
export interface Progress {
  /** Un array per tentativo: esito (giusto/sbagliato) delle 6 coppie. */
  attempts: boolean[][];
  phase: 'build' | 'questions' | 'done';
  /** Per ogni domanda già risposta: era corretta? */
  answers: boolean[];
  solved: boolean;
  gaveUp: boolean;
}

export interface Store {
  version: 1;
  progress: Record<string, Progress>;
  /** Giorni (locali) in cui è stato completato almeno un puzzle. */
  finishedDays: string[];
  seenHowTo: boolean;
}

export const emptyProgress = (): Progress => ({
  attempts: [],
  phase: 'build',
  answers: [],
  solved: false,
  gaveUp: false,
});

export const emptyStore = (): Store => ({
  version: 1,
  progress: {},
  finishedDays: [],
  seenHowTo: false,
});

const KEY = 'tuttialcuni:v1';

export function loadStore(storage: Pick<Storage, 'getItem'> = localStorage): Store {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    if (parsed.version !== 1 || typeof parsed.progress !== 'object' || !parsed.progress) {
      return emptyStore();
    }
    return {
      ...emptyStore(),
      ...parsed,
      progress: parsed.progress,
      finishedDays: Array.isArray(parsed.finishedDays) ? parsed.finishedDays : [],
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage pieno o bloccato (navigazione privata): il gioco funziona comunque
  }
}

/** Segna il puzzle come concluso `day` (il giorno conta per la streak). */
export function finishPuzzle(store: Store, id: string, progress: Progress, day: string): Store {
  return {
    ...store,
    progress: { ...store.progress, [id]: { ...progress, phase: 'done' } },
    finishedDays: store.finishedDays.includes(day)
      ? store.finishedDays
      : [...store.finishedDays, day],
  };
}

/**
 * Streak = giorni consecutivi con almeno un puzzle completato. Resta viva se oggi non hai
 * ancora giocato ma hai giocato ieri.
 */
export function computeStreak(
  finishedDays: readonly string[],
  today: string,
): { current: number; best: number } {
  const days = new Set(finishedDays);
  let current = 0;
  let d = days.has(today) ? today : prevDay(today);
  while (days.has(d)) {
    current++;
    d = prevDay(d);
  }
  let best = 0;
  for (const start of days) {
    if (days.has(prevDay(start))) continue; // non è l'inizio di una serie
    let len = 0;
    let cur = start;
    // avanza di un giorno alla volta finché la serie continua
    while (days.has(cur)) {
      len++;
      const next = new Date(`${cur}T12:00:00`);
      next.setDate(next.getDate() + 1);
      cur = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    }
    best = Math.max(best, len);
  }
  return { current, best };
}

export interface Summary {
  played: number;
  solved: number;
  winRate: number;
  /** Distribuzione dei tentativi per i puzzle risolti: indice 0 = 1 tentativo, … 3 = 4 o più. */
  distribution: [number, number, number, number];
}

export function summarize(store: Store): Summary {
  const done = Object.values(store.progress).filter((p) => p.phase === 'done');
  const solved = done.filter((p) => p.solved);
  const distribution: Summary['distribution'] = [0, 0, 0, 0];
  for (const p of solved) {
    const k = Math.min(Math.max(p.attempts.length, 1), 4) - 1;
    distribution[k] = (distribution[k] as number) + 1;
  }
  return {
    played: done.length,
    solved: solved.length,
    winRate: done.length ? Math.round((solved.length / done.length) * 100) : 0,
    distribution,
  };
}
