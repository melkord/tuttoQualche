import { prevDay } from './date';

/** Avanzamento su un singolo puzzle (3 passi a risposta chiusa). */
export interface Progress {
  /** Passo corrente (0-based). */
  step: number;
  /** Risposte sbagliate date in ogni passo. */
  errors: number[];
  phase: 'play' | 'done';
}

export interface Store {
  version: 2;
  progress: Record<string, Progress>;
  /** Giorni (locali) in cui è stato completato almeno un puzzle. */
  finishedDays: string[];
  /** Ultimo livello aperto (per "Continua"). */
  lastPlayed: string | null;
  seenHowTo: boolean;
}

export const emptyProgress = (): Progress => ({ step: 0, errors: [0, 0, 0], phase: 'play' });

export const emptyStore = (): Store => ({
  version: 2,
  progress: {},
  finishedDays: [],
  lastPlayed: null,
  seenHowTo: false,
});

export const totalErrors = (p: Progress) => p.errors.reduce((a, b) => a + b, 0);

/** Stelle: 3 senza errori, 2 con al massimo 2 errori, altrimenti 1. */
export const starsOf = (p: Progress): 1 | 2 | 3 => {
  const n = totalErrors(p);
  return n === 0 ? 3 : n <= 2 ? 2 : 1;
};

const KEY = 'eulero:v2';
/** Chiave usata prima del cambio di nome: i progressi esistenti si leggono da qui. */
const LEGACY_KEY = 'tuttialcuni:v2';

export function loadStore(storage: Pick<Storage, 'getItem'> = localStorage): Store {
  try {
    const raw = storage.getItem(KEY) ?? storage.getItem(LEGACY_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    if (parsed.version !== 2 || typeof parsed.progress !== 'object' || !parsed.progress) {
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

const nextDay = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

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
    for (let cur = start; days.has(cur); cur = nextDay(cur)) len++;
    best = Math.max(best, len);
  }
  return { current, best };
}

export interface Summary {
  played: number;
  perfect: number;
  /** % di livelli completati senza errori. */
  perfectRate: number;
  /** Livelli per numero totale di errori: 0, 1, 2, 3 o più. */
  distribution: [number, number, number, number];
}

export function summarize(store: Store): Summary {
  const done = Object.values(store.progress).filter((p) => p.phase === 'done');
  const distribution: Summary['distribution'] = [0, 0, 0, 0];
  for (const p of done) {
    const k = Math.min(totalErrors(p), 3);
    distribution[k] = (distribution[k] as number) + 1;
  }
  const perfect = distribution[0];
  return {
    played: done.length,
    perfect,
    perfectRate: done.length ? Math.round((perfect / done.length) * 100) : 0,
    distribution,
  };
}
