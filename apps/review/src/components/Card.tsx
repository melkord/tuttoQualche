import type {
  Circle,
  Concept,
  Issue,
  PairRelation,
  PendingPuzzle,
  Relation,
} from '@tuttialcuni/core';
import { Diagram } from './Diagram';
import { Dot, RelationEditor, RelationList } from './Relations';

interface Props {
  item: PendingPuzzle;
  circles: Circle[] | null;
  hover: [number, number] | null;
  onHover: (p: [number, number] | null) => void;
  edit: { rels: Relation[]; sel: number } | null;
  editIssues: Issue[];
  editValid: boolean;
  onEditSelect: (k: number) => void;
  onEditChange: (k: number, rel: Relation) => void;
}

const LEVEL_LABEL = { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' } as const;

export function Card({
  item,
  circles,
  hover,
  onHover,
  edit,
  editIssues,
  editValid,
  ...handlers
}: Props) {
  const { puzzle, risks } = item;
  const riskCount = Object.values(risks).filter((r) => r.level !== 'basso').length;
  const pairs: PairRelation[] = puzzle.relations;

  return (
    <article className={`card${edit ? ' card--editing' : ''}`}>
      <section className="stage">
        {circles ? (
          <Diagram circles={circles} highlight={hover} dimmed={!!edit && !editValid} />
        ) : (
          <div className="empty">Diagramma non disponibile</div>
        )}
        <ul className="legend">
          {puzzle.concepts.map((c: Concept, i: number) => (
            <li key={i} className="legend__item">
              <Dot i={i} />
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="info">
        <header className="card__head">
          <span className="chip chip--theme">{puzzle.theme}</span>
          <span className={`chip chip--level chip--${puzzle.difficulty.level}`}>
            {LEVEL_LABEL[puzzle.difficulty.level]} · {Math.round(puzzle.difficulty.score)}
          </span>
          {riskCount > 0 && <span className="chip chip--warn">⚠ {riskCount} da controllare</span>}
          <code className="card__id">{puzzle.id}</code>
        </header>

        <h3 className="section-title">{edit ? 'Modifica le relazioni' : 'Relazioni'}</h3>
        {edit ? (
          <>
            <RelationEditor
              concepts={puzzle.concepts}
              pairs={pairs}
              rels={edit.rels}
              selected={edit.sel}
              onSelect={handlers.onEditSelect}
              onChange={handlers.onEditChange}
            />
            <div className={`validation ${editValid ? 'validation--ok' : 'validation--bad'}`}>
              {editValid ? (
                <span>✓ Coerente e rappresentabile — premi Invio per salvare</span>
              ) : (
                <ul>
                  {editIssues.slice(0, 3).map((i, k) => (
                    <li key={k}>✕ {i.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <RelationList puzzle={puzzle} risks={risks} onHover={onHover} />
        )}

        <h3 className="section-title">Domande</h3>
        <ol className="questions">
          {puzzle.questions.map((q, i) => (
            <li key={i} className="question">
              <span className="question__text">{q.text}</span>
              <span className={`pill ${q.answer ? 'pill--true' : 'pill--false'}`}>
                {q.answer ? 'VERO' : 'FALSO'}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
