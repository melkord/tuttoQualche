import { useMemo, useState } from 'react';
import { buildSteps } from '@tuttialcuni/core';
import type { Puzzle } from '@tuttialcuni/core';
import { Diagram } from './Diagram';
import { Dot } from './Dot';
import { buildShareText, shareResult } from '../lib/share';
import { totalErrors } from '../lib/storage';
import type { Progress } from '../lib/storage';
import { capitalize } from '../lib/text';
import type { LevelEntry } from '../lib/puzzles';

interface Props {
  puzzle: Puzzle;
  entry: LevelEntry;
  progress: Progress;
  streak: number;
  onHome: () => void;
  onNext: (() => void) | null;
}

export function Result({ puzzle, entry, progress, streak, onHome, onNext }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const steps = useMemo(() => buildSteps(puzzle), [puzzle]);
  const n = totalErrors(progress);
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
      <h1>{n === 0 ? 'Perfetto! 🎉' : 'Fatto!'}</h1>
      <p className="lead">
        {n === 0
          ? 'Tre su tre al primo colpo.'
          : `${n} ${n === 1 ? 'errore' : 'errori'} in totale.`}
      </p>

      <ul className="solved" aria-label="Le soluzioni">
        {steps.map((s, i) => (
          <li key={i} className="solved__item">
            <div className="solved__fig">
              <Diagram circles={s.options[s.correct]!.circles} concepts={s.concepts} />
            </div>
            <ul className="solved__legend">
              {s.concepts.map((c) => (
                <li key={c}>
                  <Dot i={c} />
                  <span>{puzzle.concepts[c]?.label}</span>
                </li>
              ))}
            </ul>
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
