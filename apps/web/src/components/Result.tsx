import { useState } from 'react';
import type { Circle, Puzzle } from '@tuttialcuni/core';
import { Board } from './Board';
import { Dot } from './Dot';
import { buildShareText, shareResult } from '../lib/share';
import type { Progress } from '../lib/storage';
import { capitalize } from '../lib/text';
import type { LevelEntry } from '../lib/puzzles';

interface Props {
  puzzle: Puzzle;
  entry: LevelEntry;
  onNext: (() => void) | null;
  progress: Progress;
  circles: Circle[] | null;
  streak: number;
  onHome: () => void;
}

export function Result({ puzzle, entry, progress, circles, streak, onHome, onNext }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const good = progress.answers.filter(Boolean).length;
  const text = buildShareText({
    title: `${capitalize(puzzle.theme)} · livello ${entry.level}`,
    progress,
    url: window.location.origin,
  });

  const share = async () => {
    const r = await shareResult(text);
    setMsg(r === 'copied' ? 'Copiato negli appunti ✓' : r === 'shared' ? 'Condiviso ✓' : null);
    if (r !== 'failed') setTimeout(() => setMsg(null), 2000);
  };

  return (
    <div className="result">
      <h1>
        {progress.gaveUp
          ? 'Alla prossima!'
          : good === puzzle.questions.length
            ? 'Perfetto! 🎉'
            : 'Fatto!'}
      </h1>
      <p className="lead">
        {progress.gaveUp
          ? 'Ecco la soluzione del diagramma.'
          : `Diagramma in ${progress.attempts.length} ${progress.attempts.length === 1 ? 'tentativo' : 'tentativi'} · domande ${good}/${puzzle.questions.length}`}
      </p>

      {circles && (
        <div className="mini mini--big">
          <Board circles={circles} readOnly />
        </div>
      )}
      <ul className="legend">
        {puzzle.concepts.map((c, i) => (
          <li key={i}>
            <Dot i={i} />
            <span>{c.label}</span>
          </li>
        ))}
      </ul>

      <pre className="grid" aria-label="Il tuo risultato">
        {text.split('\n').slice(0, -2).join('\n')}
      </pre>

      {streak > 0 && (
        <p className="streak-note">
          🔥 Serie di {streak} {streak === 1 ? 'giorno' : 'giorni'}
        </p>
      )}

      <div className="result__btns">
        <button className="btn btn--primary btn--block" onClick={share}>
          {msg ?? 'Condividi risultato'}
        </button>
        {onNext && (
          <button className="btn btn--block" onClick={onNext}>
            Livello successivo →
          </button>
        )}
        <button className="btn btn--block" onClick={onHome}>
          Torna alla home
        </button>
      </div>
    </div>
  );
}
