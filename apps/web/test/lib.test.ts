import { describe, expect, it } from 'vitest';
import { prevDay, todayLocal } from '../src/lib/date';
import { continueEntry, isUnlocked, nextInTheme } from '../src/lib/levels';
import type { LevelEntry, LevelIndex } from '../src/lib/puzzles';
import { buildShareText } from '../src/lib/share';
import {
  computeStreak,
  emptyProgress,
  emptyStore,
  finishPuzzle,
  loadStore,
  saveStore,
  summarize,
} from '../src/lib/storage';
import type { Progress } from '../src/lib/storage';

const done = (errors: [number, number, number]): Progress => ({ step: 2, errors, phase: 'done' });

describe('date', () => {
  it('todayLocal e prevDay', () => {
    expect(todayLocal(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
    expect(prevDay('2026-10-01')).toBe('2026-09-30');
    expect(prevDay('2026-01-01')).toBe('2025-12-31');
  });
});

describe('computeStreak', () => {
  it('conta i giorni consecutivi fino a oggi', () => {
    expect(computeStreak(['2026-10-01', '2026-10-02', '2026-10-03'], '2026-10-03')).toEqual({
      current: 3,
      best: 3,
    });
  });
  it('resta viva se oggi non hai ancora giocato ma ieri sì', () => {
    expect(computeStreak(['2026-10-01', '2026-10-02'], '2026-10-03').current).toBe(2);
  });
  it('si azzera dopo un giorno saltato, ma ricorda il record', () => {
    expect(
      computeStreak(['2026-09-20', '2026-09-21', '2026-09-22', '2026-10-03'], '2026-10-03'),
    ).toEqual({ current: 1, best: 3 });
    expect(computeStreak(['2026-10-01'], '2026-10-03').current).toBe(0);
  });
  it('nessun gioco', () => {
    expect(computeStreak([], '2026-10-03')).toEqual({ current: 0, best: 0 });
  });
});

describe('storage', () => {
  it('round-trip e dati corrotti o di versioni vecchie', () => {
    let raw: string | null = null;
    const mem = { getItem: () => raw, setItem: (_: string, v: string) => void (raw = v) };
    const s = finishPuzzle(emptyStore(), 'p-1', done([0, 1, 0]), '2026-10-03');
    saveStore(s, mem);
    expect(loadStore(mem)).toEqual(s);
    raw = '{rotto';
    expect(loadStore(mem)).toEqual(emptyStore());
    raw = JSON.stringify({ version: 1 });
    expect(loadStore(mem)).toEqual(emptyStore());
  });

  it('finishPuzzle non duplica i giorni', () => {
    let s = finishPuzzle(emptyStore(), 'p-1', emptyProgress(), '2026-10-03');
    s = finishPuzzle(s, 'p-2', emptyProgress(), '2026-10-03');
    expect(s.finishedDays).toEqual(['2026-10-03']);
    expect(Object.keys(s.progress)).toHaveLength(2);
    expect(s.progress['p-1']?.phase).toBe('done');
  });

  it('summarize: livelli, perfetti, distribuzione degli errori', () => {
    let s = emptyStore();
    s = finishPuzzle(s, 'a', done([0, 0, 0]), '2026-10-01');
    s = finishPuzzle(s, 'b', done([1, 0, 0]), '2026-10-02');
    s = finishPuzzle(s, 'c', done([2, 2, 1]), '2026-10-03');
    s = { ...s, progress: { ...s.progress, d: emptyProgress() } }; // in corso: non conta
    expect(summarize(s)).toEqual({
      played: 3,
      perfect: 1,
      perfectRate: 33,
      distribution: [1, 1, 0, 1],
    });
  });
});

describe('buildShareText', () => {
  it('una riga per passo: 🟥 per ogni errore, poi 🟩', () => {
    const text = buildShareText({
      title: 'Animali · livello 3',
      url: 'https://x.test',
      progress: done([0, 2, 1]),
    });
    expect(text.split('\n')).toEqual([
      'TuttiAlcuni · Animali · livello 3',
      '',
      '1  🟩',
      '2  🟥🟥🟩',
      '3  🟥🟩',
      '',
      '3 errori',
      '',
      'https://x.test',
    ]);
  });
  it('zero errori', () => {
    const text = buildShareText({ title: 't', url: 'u', progress: done([0, 0, 0]) });
    expect(text).toContain('✨ Perfetto, zero errori');
    expect(text).not.toContain('🟥');
  });
  it('singolare', () => {
    expect(buildShareText({ title: 't', url: 'u', progress: done([1, 0, 0]) })).toContain(
      '1 errore\n',
    );
  });
});

describe('livelli in sequenza', () => {
  const lv = (theme: string, level: number): LevelEntry => ({
    id: `p-${theme}${level}`,
    theme,
    level,
    difficulty: 'facile',
    score: level,
  });
  const index: LevelIndex = {
    themes: [
      { theme: 'a', levels: [lv('a', 1), lv('a', 2), lv('a', 3)] },
      { theme: 'b', levels: [lv('b', 1), lv('b', 2)] },
    ],
  };
  const finished = (...ids: string[]) =>
    ids.reduce((s, id) => finishPuzzle(s, id, done([0, 0, 0]), '2026-10-03'), emptyStore());

  it('il livello 1 è sempre aperto, gli altri si sbloccano a catena per tema', () => {
    const s = finished('p-a1');
    expect(isUnlocked(index, emptyStore(), 'p-a1')).toBe(true);
    expect(isUnlocked(index, emptyStore(), 'p-b1')).toBe(true);
    expect(isUnlocked(index, emptyStore(), 'p-a2')).toBe(false);
    expect(isUnlocked(index, s, 'p-a2')).toBe(true);
    expect(isUnlocked(index, s, 'p-a3')).toBe(false);
    expect(isUnlocked(index, s, 'p-b2')).toBe(false); // un altro tema non sblocca
    expect(isUnlocked(index, s, 'p-sconosciuto')).toBe(false);
  });

  it('continueEntry: inizio, livello in corso, successivo, tutto completato', () => {
    expect(continueEntry(index, emptyStore())?.id).toBe('p-a1');
    const playing = { ...emptyStore(), lastPlayed: 'p-b1' };
    expect(continueEntry(index, playing)?.id).toBe('p-b1');
    const after = { ...finished('p-b1'), lastPlayed: 'p-b1' };
    expect(continueEntry(index, after)?.id).toBe('p-b2');
    expect(continueEntry(index, finished('p-a1', 'p-a2', 'p-a3', 'p-b1', 'p-b2'))).toBeNull();
  });

  it('nextInTheme', () => {
    expect(nextInTheme(index, 'p-a1')?.id).toBe('p-a2');
    expect(nextInTheme(index, 'p-a3')).toBeNull();
    expect(nextInTheme(index, 'boh')).toBeNull();
  });
});
