import { useMemo, useState } from 'react';
import { buildSteps, STEP_COUNT } from '@tuttialcuni/core';
import type { Puzzle } from '@tuttialcuni/core';
import { Diagram } from './Diagram';
import { WordChips } from './WordChips';
import { buildShareText, shareResult } from '../lib/share';
import { starsOf, totalErrors } from '../lib/storage';
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

const PHRASES = {
  3: ['Impeccabile!', 'Perfetto!', 'Bravissimo!'],
  2: ['Bel lavoro!', 'Ben fatto!', 'Quasi perfetto!'],
  1: ['Si può fare di meglio!', 'Continua così!', 'Ci sei arrivato!'],
} as const;

export function Result({ puzzle, entry, progress, streak, onHome, onNext }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const steps = useMemo(() => buildSteps(puzzle), [puzzle]);
  const last = steps[STEP_COUNT - 1];
  const n = totalErrors(progress);
  const stars = starsOf(progress);
  const phrases = PHRASES[stars];
  const phrase = phrases[(entry.level + puzzle.id.length) % phrases.length];
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
      <div className="stars" role="img" aria-label={`${stars} stelle su 3`}>
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={s <= stars ? 'star is-on' : 'star'}
            style={{ animationDelay: `${s * 160}ms` }}
          >
            ★
          </span>
        ))}
      </div>
      <h1>{phrase}</h1>
      <p className="lead">
        {n === 0
          ? 'Tre su tre al primo colpo.'
          : `${n} ${n === 1 ? 'errore' : 'errori'} in totale.`}
      </p>

      {last && (
        <>
          <div className="final" aria-label="Il diagramma completo">
            <Diagram circles={last.options[last.correct]!.circles} />
          </div>
          <WordChips key="final" words={last.words.map((w) => puzzle.concepts[w]?.label ?? '')} />
        </>
      )}

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
