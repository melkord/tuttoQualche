import { useMemo, useState } from 'react';
import { buildSteps, localizedConcepts, localizedTheme, STEP_COUNT } from '@eulero/core';
import type { Puzzle } from '@eulero/core';
import { Diagram } from './Diagram';
import { WordChips } from './WordChips';
import { buildShareText, shareResult } from '../lib/share';
import { starsOf, totalErrors } from '../lib/storage';
import type { Progress } from '../lib/storage';
import { useI18n } from '../i18n';
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
  const { lang, t } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);
  const concepts = useMemo(() => localizedConcepts(puzzle, lang), [puzzle, lang]);
  const steps = useMemo(() => buildSteps(puzzle), [puzzle]);
  const last = steps[STEP_COUNT - 1];
  const n = totalErrors(progress);
  const stars = starsOf(progress);
  const phrases = t.result.phrases[stars];
  const phrase = phrases[(entry.level + puzzle.id.length) % phrases.length];
  const text = buildShareText({
    title: t.levelTitle(localizedTheme(puzzle, lang), entry.level),
    progress,
    url: window.location.origin,
    strings: t.share,
  });

  const share = async () => {
    const r = await shareResult(text);
    setMsg(r === 'copied' ? t.result.copied : r === 'shared' ? t.result.shared : null);
    if (r !== 'failed') setTimeout(() => setMsg(null), 2000);
  };

  return (
    <div className="result">
      <div className="stars" role="img" aria-label={t.result.stars(stars)}>
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
      <p className="lead">{n === 0 ? t.result.perfectLine : t.result.mistakes(n)}</p>

      {last && (
        <>
          <div className="final" aria-label={t.result.finalAria}>
            <Diagram circles={last.options[last.correct]!.circles} />
          </div>
          <WordChips key="final" words={last.words.map((w) => concepts[w]?.label ?? '')} />
        </>
      )}

      <pre className="grid" aria-label={t.result.yourResult}>
        {text.split('\n').slice(0, -2).join('\n')}
      </pre>

      {streak > 0 && <p className="streak-note">{t.result.streak(streak)}</p>}

      <div className="result__btns">
        <button className="btn btn--primary btn--block" onClick={share}>
          {msg ?? t.result.share}
        </button>
        {onNext && (
          <button className="btn btn--block" onClick={onNext}>
            {t.result.next}
          </button>
        )}
        <button className="btn btn--block" onClick={onHome}>
          {t.result.home}
        </button>
      </div>
    </div>
  );
}
