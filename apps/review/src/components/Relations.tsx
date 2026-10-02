import { describeRelation, RELATIONS } from '@tuttialcuni/core';
import type { Concept, PairRelation, PendingPuzzle, Relation } from '@tuttialcuni/core';
import { colorOf } from '../palette';

export const REL_SYMBOL: Record<Relation, string> = {
  TUTTI: '⊂',
  CONTIENE: '⊃',
  ALCUNI: '∩',
  NESSUNO: '∅',
  UGUALI: '=',
};
const REL_NAME: Record<Relation, string> = {
  TUTTI: 'Il primo è contenuto nel secondo',
  CONTIENE: 'Il primo contiene il secondo',
  ALCUNI: 'Intersezione parziale',
  NESSUNO: 'Disgiunti',
  UGUALI: 'Uguali',
};

export const Dot = ({ i }: { i: number }) => (
  <span className="dot" style={{ background: colorOf(i) }}>
    {i + 1}
  </span>
);

interface ListProps {
  puzzle: PendingPuzzle['puzzle'];
  risks: PendingPuzzle['risks'];
  onHover: (pair: [number, number] | null) => void;
}

export function RelationList({ puzzle, risks, onHover }: ListProps) {
  return (
    <ul className="relations">
      {puzzle.relations.map((r) => {
        const risk = risks[`${r.a}${r.b}`];
        const risky = risk && risk.level !== 'basso';
        const a = puzzle.concepts[r.a] as Concept;
        const b = puzzle.concepts[r.b] as Concept;
        return (
          <li
            key={`${r.a}${r.b}`}
            className={`relation${risky ? ` relation--risk relation--${risk.level}` : ''}`}
            onMouseEnter={() => onHover([r.a, r.b])}
            onMouseLeave={() => onHover(null)}
          >
            <div className="relation__pair">
              <Dot i={r.a} />
              <span className="relation__sym" title={REL_NAME[r.rel]}>
                {REL_SYMBOL[r.rel]}
              </span>
              <Dot i={r.b} />
            </div>
            <div className="relation__text">
              <span>{describeRelation(a, b, r.rel)}</span>
              {risky && (
                <small className="relation__risk">
                  ⚠ rischio {risk.level}: {risk.reason}
                </small>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface EditProps {
  concepts: Concept[];
  pairs: PairRelation[];
  rels: Relation[];
  selected: number;
  onSelect: (k: number) => void;
  onChange: (k: number, rel: Relation) => void;
}

export function RelationEditor({ concepts, pairs, rels, selected, onSelect, onChange }: EditProps) {
  return (
    <ul className="relations relations--edit">
      {pairs.map((p, k) => (
        <li
          key={`${p.a}${p.b}`}
          className={`relation relation--editable${k === selected ? ' is-selected' : ''}`}
          onClick={() => onSelect(k)}
        >
          <div className="relation__pair">
            <Dot i={p.a} />
            <span className="relation__label">{concepts[p.a]?.label}</span>
          </div>
          <div className="seg" role="radiogroup">
            {RELATIONS.map((rel) => (
              <button
                key={rel}
                type="button"
                role="radio"
                aria-checked={rels[k] === rel}
                className={`seg__btn${rels[k] === rel ? ' is-on' : ''}`}
                title={REL_NAME[rel]}
                onClick={() => onChange(k, rel)}
              >
                {REL_SYMBOL[rel]}
              </button>
            ))}
          </div>
          <div className="relation__pair relation__pair--end">
            <span className="relation__label">{concepts[p.b]?.label}</span>
            <Dot i={p.b} />
          </div>
        </li>
      ))}
    </ul>
  );
}
