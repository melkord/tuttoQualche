import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSteps, explainMistake, STEP_COUNT } from '@tuttialcuni/core';
import type { Puzzle } from '@tuttialcuni/core';
import { Diagram } from './Diagram';
import { WordChips } from './WordChips';
import type { Progress } from '../lib/storage';

const LETTERS = ['A', 'B', 'C', 'D'];
const ADVANCE_MS = 950;

type Status = 'question' | 'wrong' | 'correct';

interface Props {
  puzzle: Puzzle;
  progress: Progress;
  onProgress: (p: Progress) => void;
  onFinish: (p: Progress) => void;
}

export function Play({ puzzle, progress, onProgress, onFinish }: Props) {
  const steps = useMemo(() => buildSteps(puzzle), [puzzle]);
  const step = steps[Math.min(progress.step, STEP_COUNT - 1)];
  const [status, setStatus] = useState<Status>('question');
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState<number[]>([]);
  const [explanation, setExplanation] = useState('');
  const latest = useRef(progress);
  latest.current = progress;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  if (!step) return null;

  const words = step.words.map((w) => puzzle.concepts[w]?.label ?? '');

  const pick = (i: number) => {
    if (locked.includes(i) || status === 'correct') return;
    // con il pannello d'errore aperto, scegliere un'altra carta lo chiude e conta subito
    setSelected(i);
    if (i === step.correct) {
      setStatus('correct');
      timer.current = setTimeout(() => {
        const p = latest.current;
        setStatus('question');
        setSelected(null);
        setLocked([]);
        if (p.step + 1 >= STEP_COUNT) onFinish({ ...p, phase: 'done' });
        else onProgress({ ...p, step: p.step + 1 });
      }, ADVANCE_MS);
    } else {
      setLocked((l) => [...l, i]);
      setExplanation(
        explainMistake(
          puzzle.concepts,
          step,
          (step.options[step.correct] as (typeof step.options)[number]).relations,
          (step.options[i] as (typeof step.options)[number]).relations,
        ),
      );
      setStatus('wrong');
      const p = latest.current;
      onProgress({ ...p, errors: p.errors.map((e, k) => (k === p.step ? e + 1 : e)) });
    }
  };

  const stateOf = (i: number) => {
    if (status === 'correct') return selected === i ? 'correct' : 'dimmed';
    if (status === 'wrong') {
      if (selected === i) return 'wrong';
      return locked.includes(i) ? 'locked' : 'idle';
    }
    return locked.includes(i) ? 'locked' : 'idle';
  };

  return (
    <div className="play" data-step={progress.step + 1}>
      <ol className="stepper" aria-label="Avanzamento">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <li
            key={i}
            className={`stepper__dot${i < progress.step ? ' is-done' : i === progress.step ? ' is-now' : ''}`}
            aria-current={i === progress.step ? 'step' : undefined}
          >
            {i < progress.step ? '✓' : i + 1}
          </li>
        ))}
      </ol>

      <WordChips key={`w${progress.step}`} words={words} />

      <div className="options" key={`o${progress.step}`} role="group" aria-label="Diagrammi">
        {step.options.map((o, i) => {
          const state = stateOf(i);
          return (
            <button
              key={i}
              type="button"
              className={`option-card is-${state}`}
              style={{ animationDelay: `${i * 90}ms` }}
              data-letter={LETTERS[i]}
              data-state={state}
              aria-label={`Opzione ${LETTERS[i]}`}
              aria-disabled={state === 'locked' || status === 'correct'}
              onClick={() => pick(i)}
            >
              <Diagram circles={o.circles} />
              <span className="option-card__letter">{LETTERS[i]}</span>
              {state === 'correct' && (
                <span className="option-card__mark option-card__mark--ok">✓</span>
              )}
              {(state === 'locked' || state === 'wrong') && (
                <span className="option-card__mark">✕</span>
              )}
            </button>
          );
        })}
      </div>

      {status === 'wrong' && (
        <section className="feedback" role="alert">
          <h2>No!</h2>
          <p>{explanation}</p>
          <button className="btn btn--ink" onClick={() => setStatus('question')}>
            Riprova
          </button>
        </section>
      )}
    </div>
  );
}
