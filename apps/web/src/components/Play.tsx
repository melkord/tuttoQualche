import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSteps, STEP_COUNT } from '@tuttialcuni/core';
import type { Puzzle } from '@tuttialcuni/core';
import { Diagram } from './Diagram';
import type { Progress } from '../lib/storage';
import { colorOf } from '../palette';

const LETTERS = ['A', 'B', 'C', 'D'];
const ADVANCE_MS = 700;

interface Props {
  puzzle: Puzzle;
  progress: Progress;
  onProgress: (p: Progress) => void;
  onFinish: (p: Progress) => void;
}

export function Play({ puzzle, progress, onProgress, onFinish }: Props) {
  const steps = useMemo(() => buildSteps(puzzle), [puzzle]);
  const step = steps[Math.min(progress.step, STEP_COUNT - 1)];
  const [wrong, setWrong] = useState<number[]>([]);
  const [right, setRight] = useState<number | null>(null);
  const latest = useRef(progress);
  latest.current = progress;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  if (!step) return null;

  const pick = (i: number) => {
    if (right !== null || wrong.includes(i)) return;
    if (i === step.correct) {
      setRight(i);
      timer.current = setTimeout(() => {
        const p = latest.current;
        setWrong([]);
        setRight(null);
        if (p.step + 1 >= STEP_COUNT) onFinish({ ...p, phase: 'done' });
        else onProgress({ ...p, step: p.step + 1 });
      }, ADVANCE_MS);
    } else {
      setWrong((w) => [...w, i]);
      const p = latest.current;
      onProgress({ ...p, errors: p.errors.map((e, k) => (k === p.step ? e + 1 : e)) });
    }
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

      <p className="prompt">Quale diagramma rappresenta questi insiemi?</p>
      <ul className="pills" key={`p${progress.step}`}>
        {step.concepts.map((c) => (
          <li key={c} className="pill-set" style={{ ['--c' as string]: colorOf(c) }}>
            {puzzle.concepts[c]?.label}
          </li>
        ))}
      </ul>

      <div className="options" key={`o${progress.step}`} role="group" aria-label="Diagrammi">
        {step.options.map((o, i) => {
          const state =
            right === i ? 'right' : wrong.includes(i) ? 'wrong' : right !== null ? 'off' : '';
          return (
            <button
              key={i}
              type="button"
              className={`option-card${state ? ` is-${state}` : ''}`}
              data-letter={LETTERS[i]}
              data-state={state || 'idle'}
              aria-label={`Opzione ${LETTERS[i]}`}
              aria-disabled={state === 'wrong' || right !== null}
              onClick={() => pick(i)}
            >
              <Diagram circles={o.circles} concepts={step.concepts} />
              <span className="option-card__letter">{LETTERS[i]}</span>
              {state === 'right' && <span className="option-card__mark">✓</span>}
              {state === 'wrong' && <span className="option-card__mark">✕</span>}
            </button>
          );
        })}
      </div>
      {wrong.length > 0 && right === null && (
        <p className="oops" role="status">
          Non è questo, riprova.
        </p>
      )}
    </div>
  );
}
