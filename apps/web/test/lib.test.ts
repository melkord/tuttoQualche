import { describe, expect, it } from 'vitest';
import { prevDay, todayLocal } from '../src/lib/date';
import { dailyEntry } from '../src/lib/puzzles';
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
    ).toEqual({
      current: 1,
      best: 3,
    });
    expect(computeStreak(['2026-10-01'], '2026-10-03').current).toBe(0);
  });
  it('nessun gioco', () => {
    expect(computeStreak([], '2026-10-03')).toEqual({ current: 0, best: 0 });
  });
});

describe('storage', () => {
  it('round-trip e dati corrotti', () => {
    let raw: string | null = null;
    const mem = { getItem: () => raw, setItem: (_: string, v: string) => void (raw = v) };
    const s = finishPuzzle(
      emptyStore(),
      'p-1',
      { ...emptyProgress(), solved: true, attempts: [[true]] },
      '2026-10-03',
    );
    saveStore(s, mem);
    expect(loadStore(mem)).toEqual(s);
    raw = '{rotto';
    expect(loadStore(mem)).toEqual(emptyStore());
    raw = JSON.stringify({ version: 9 });
    expect(loadStore(mem)).toEqual(emptyStore());
  });

  it('finishPuzzle non duplica i giorni', () => {
    let s = finishPuzzle(emptyStore(), 'p-1', emptyProgress(), '2026-10-03');
    s = finishPuzzle(s, 'p-2', emptyProgress(), '2026-10-03');
    expect(s.finishedDays).toEqual(['2026-10-03']);
    expect(Object.keys(s.progress)).toHaveLength(2);
  });

  it('summarize: partite, vittorie, distribuzione', () => {
    let s = emptyStore();
    s = finishPuzzle(
      s,
      'a',
      { ...emptyProgress(), solved: true, attempts: [[false], [true]] },
      '2026-10-01',
    );
    s = finishPuzzle(
      s,
      'b',
      { ...emptyProgress(), solved: true, attempts: Array(6).fill([true]) },
      '2026-10-02',
    );
    s = finishPuzzle(
      s,
      'c',
      { ...emptyProgress(), gaveUp: true, attempts: [[false]] },
      '2026-10-03',
    );
    expect(summarize(s)).toEqual({ played: 3, solved: 2, winRate: 67, distribution: [0, 1, 0, 1] });
  });
});

describe('dailyEntry', () => {
  const entry = (id: string) => ({
    id,
    theme: 't',
    level: 1,
    difficulty: 'facile' as const,
    score: 0,
  });
  const index = { themes: [{ theme: 't', levels: [entry('p-b'), entry('p-a'), entry('p-c')] }] };
  it('è deterministico per data e cambia ogni giorno', () => {
    expect(dailyEntry(index, '2026-10-03')?.id).toBe(dailyEntry(index, '2026-10-03')?.id);
    const ids = ['2026-10-03', '2026-10-04', '2026-10-05'].map((d) => dailyEntry(index, d)?.id);
    expect(new Set(ids).size).toBe(3);
  });
  it('indice vuoto → null', () => {
    expect(dailyEntry({ themes: [] }, '2026-10-03')).toBeNull();
  });
});

describe('buildShareText', () => {
  it('quadrati per tentativo e riga domande', () => {
    const text = buildShareText({
      title: 'Animali · livello 3',
      url: 'https://x.test',
      progress: {
        ...emptyProgress(),
        solved: true,
        attempts: [
          [true, false, true, true, false, true],
          [true, true, true, true, true, true],
        ],
        answers: [true, true, false],
      },
    });
    expect(text).toBe(
      [
        'TuttiAlcuni · Animali · livello 3',
        '',
        '🟩🟥🟩🟩🟥🟩',
        '🟩🟩🟩🟩🟩🟩',
        '❓ ✅✅❌',
        '',
        'https://x.test',
      ].join('\n'),
    );
  });
  it('soluzione svelata', () => {
    const text = buildShareText({
      title: 't',
      url: 'u',
      progress: {
        ...emptyProgress(),
        gaveUp: true,
        attempts: [[false, false, false, false, false, false]],
      },
    });
    expect(text).toContain('🏳️ Soluzione svelata');
    expect(text).not.toContain('❓');
  });
});
