import { useEffect, useMemo, useState } from 'react';
import {
  buildMatrix,
  describeRelation,
  evaluateDiagram,
  layoutCircles,
  relationBetween,
} from '@tuttialcuni/core';
import type { Circle, Concept, Puzzle } from '@tuttialcuni/core';
import { Board, initialCircles, R_MAX, R_MIN } from './Board';
import { Dot } from './Dot';
import type { Progress } from '../lib/storage';

const MAX_FREE_ATTEMPTS = 3;
const OPTS = { equalTolerance: 0.06, slack: 0.012 };

interface Props {
  puzzle: Puzzle;
  progress: Progress;
  onProgress: (p: Progress) => void;
  onFinish: (p: Progress, circles: Circle[]) => void;
}

export function Play({ puzzle, progress, onProgress, onFinish }: Props) {
  const matrix = useMemo(() => buildMatrix(puzzle.relations).matrix, [puzzle]);
  const [circles, setCircles] = useState<Circle[]>(initialCircles);
  const [selected, setSelected] = useState(0);
  const [wrongPairs, setWrongPairs] = useState<[number, number][]>([]);
  const [shake, setShake] = useState(0);
  const [qIndex, setQIndex] = useState(progress.answers.length);
  const [picked, setPicked] = useState<boolean | null>(null);

  useEffect(() => {
    setCircles(initialCircles());
    setWrongPairs([]);
  }, [puzzle.id]);

  if (!matrix) return <p className="empty">Puzzle non valido.</p>;

  const wrongSet = new Set(wrongPairs.flat());

  const check = () => {
    const ev = evaluateDiagram(matrix, circles, OPTS);
    const attempt = ev.pairs.map((p) => p.correct);
    const attempts = [...progress.attempts, attempt];
    if (ev.correct) {
      setWrongPairs([]);
      onProgress({ ...progress, attempts, solved: true, phase: 'questions' });
    } else {
      setWrongPairs(ev.pairs.filter((p) => !p.correct).map((p) => [p.a, p.b]));
      setShake((s) => s + 1);
      onProgress({ ...progress, attempts });
    }
  };

  const reveal = () => {
    const solution = layoutCircles(matrix) ?? circles;
    onFinish({ ...progress, gaveUp: true, solved: false, phase: 'done' }, solution);
  };

  const resize = (d: number) =>
    setCircles((cs) =>
      cs.map((c, i) =>
        i === selected ? { ...c, r: Math.min(R_MAX, Math.max(R_MIN, c.r + d)) } : c,
      ),
    );

  /* ---------- Fase domande ---------- */
  if (progress.phase === 'questions') {
    const q = puzzle.questions[qIndex];
    if (!q) return null;
    const subject = puzzle.concepts[q.subject] as Concept;
    const object = puzzle.concepts[q.object] as Concept;
    const rel = relationBetween(matrix, q.subject, q.object);
    const answer = (value: boolean) => {
      if (picked !== null) return;
      setPicked(value);
      onProgress({ ...progress, answers: [...progress.answers, value === q.answer] });
    };
    const next = () => {
      const answers = progress.answers;
      setPicked(null);
      if (qIndex + 1 >= puzzle.questions.length)
        onFinish({ ...progress, answers, phase: 'done' }, circles);
      else setQIndex(qIndex + 1);
    };
    return (
      <div className="play">
        <div className="qdots" aria-label="Avanzamento domande">
          {puzzle.questions.map((_, i) => (
            <span
              key={i}
              className={`qdot${i < progress.answers.length ? (progress.answers[i] ? ' ok' : ' bad') : i === qIndex ? ' now' : ''}`}
            />
          ))}
        </div>
        <div className="mini">
          <Board circles={circles} readOnly highlight={[q.subject, q.object]} />
        </div>
        <div className="qcard" key={qIndex}>
          <p className="qcard__n">
            Domanda {qIndex + 1} di {puzzle.questions.length}
          </p>
          <h2>{q.text}</h2>
          <div className="qcard__btns">
            {[true, false].map((v) => {
              const state =
                picked === null
                  ? ''
                  : v === q.answer
                    ? ' is-right'
                    : picked === v
                      ? ' is-wrong'
                      : ' is-off';
              return (
                <button
                  key={String(v)}
                  className={`btn btn--answer${state}`}
                  onClick={() => answer(v)}
                >
                  {v ? 'Vero' : 'Falso'}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className={`reveal ${picked === q.answer ? 'reveal--ok' : 'reveal--bad'}`}>
              <b>{picked === q.answer ? 'Esatto!' : 'Peccato.'}</b>
              <span>
                {q.answer ? 'È vero' : 'È falso'}:{' '}
                {describeRelation(subject, object, rel).toLowerCase()}.
              </span>
              <button className="btn btn--primary" onClick={next}>
                {qIndex + 1 >= puzzle.questions.length ? 'Vedi il risultato' : 'Avanti'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Fase costruzione ---------- */
  const attemptsLeft = progress.attempts.length;
  return (
    <div className="play">
      <p className="hint">Trascina i cerchi. Ridimensionali con la maniglia numerata.</p>
      <div key={shake} className={shake ? 'shake' : ''}>
        <Board
          circles={circles}
          selected={selected}
          onSelect={setSelected}
          onChange={setCircles}
          wrong={wrongSet}
        />
      </div>

      <ul className="chips">
        {puzzle.concepts.map((c, i) => (
          <li key={i}>
            <button
              className={`chip-btn${selected === i ? ' is-on' : ''}`}
              style={{ ['--c' as string]: `var(--c${i})` }}
              onClick={() => setSelected(i)}
            >
              <Dot i={i} />
              <span>{c.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {wrongPairs.length > 0 && (
        <div className="wrong" role="status">
          <b>Da rivedere:</b>
          {wrongPairs.map(([a, b]) => (
            <span key={`${a}${b}`} className="wrong__pair">
              <Dot i={a} /> ✕ <Dot i={b} />
            </span>
          ))}
        </div>
      )}

      <div className="toolbar">
        <div className="size">
          <button className="icon-btn" onClick={() => resize(-0.02)} aria-label="Rimpicciolisci">
            −
          </button>
          <span>
            <Dot i={selected} /> misura
          </span>
          <button className="icon-btn" onClick={() => resize(0.02)} aria-label="Ingrandisci">
            +
          </button>
        </div>
        <button className="btn" onClick={() => setCircles(initialCircles())}>
          Ricomincia
        </button>
        <button className="btn btn--primary" onClick={check}>
          Controlla
        </button>
      </div>
      <p className="tries">
        Tentativi: <b>{attemptsLeft}</b>
        {attemptsLeft >= MAX_FREE_ATTEMPTS && (
          <button className="link" onClick={reveal}>
            Mostra la soluzione
          </button>
        )}
      </p>
    </div>
  );
}
