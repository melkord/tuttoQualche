import { useRef } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import type { Circle } from '@tuttialcuni/core';
import { colorOf } from '../palette';

export const R_MIN = 0.05;
export const R_MAX = 0.48;
/** Angoli (rad) delle maniglie numerate: distinti, così cerchi coincidenti non le sovrappongono. */
const KNOB_ANGLE = [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

interface Props {
  circles: Circle[];
  selected?: number;
  onSelect?: (i: number) => void;
  onChange?: (next: Circle[]) => void;
  readOnly?: boolean;
  /** Indici dei cerchi coinvolti in coppie sbagliate (evidenziati dopo "Controlla"). */
  wrong?: ReadonlySet<number>;
  /** Coppia evidenziata. */
  highlight?: readonly number[] | null;
}

type Drag = { mode: 'move' | 'resize'; i: number; dx: number; dy: number };

export function Board({
  circles,
  selected = -1,
  onSelect,
  onChange,
  readOnly,
  wrong,
  highlight,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);

  const toSvg = (e: RPointerEvent) => {
    const svg = svgRef.current as SVGSVGElement;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };

  const begin = (e: RPointerEvent, i: number, mode: Drag['mode']) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    (svgRef.current as SVGSVGElement).setPointerCapture(e.pointerId);
    const p = toSvg(e);
    const c = circles[i] as Circle;
    drag.current = { mode, i, dx: c.cx - p.x, dy: c.cy - p.y };
    onSelect?.(i);
  };

  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d || !onChange) return;
    const p = toSvg(e);
    const next = circles.slice();
    const c = circles[d.i] as Circle;
    if (d.mode === 'move') {
      next[d.i] = { ...c, cx: clamp(p.x + d.dx, 0, 1), cy: clamp(p.y + d.dy, 0, 1) };
    } else {
      next[d.i] = { ...c, r: clamp(Math.hypot(p.x - c.cx, p.y - c.cy), R_MIN, R_MAX) };
    }
    onChange(next);
  };

  const end = () => {
    drag.current = null;
  };

  // I cerchi grandi stanno sotto: quelli piccoli restano sempre afferrabili.
  const order = circles
    .map((_, i) => i)
    .sort((a, b) => (circles[b] as Circle).r - (circles[a] as Circle).r);

  return (
    <svg
      ref={svgRef}
      className={`board${readOnly ? ' board--ro' : ''}`}
      viewBox="-0.04 -0.04 1.08 1.08"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      role="img"
      aria-label="Area di gioco: diagramma di Eulero"
    >
      <defs>
        <pattern id="bgrid" width="0.1" height="0.1" patternUnits="userSpaceOnUse">
          <path d="M0.1 0H0V0.1" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.002" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="1" height="1" rx="0.04" className="board__bg" />
      <rect x="0" y="0" width="1" height="1" rx="0.04" fill="url(#bgrid)" />

      {order.map((i) => {
        const c = circles[i] as Circle;
        const color = colorOf(i);
        const dim = highlight && !highlight.includes(i);
        return (
          <g key={i} className={`board__circle${dim ? ' is-dim' : ''}`}>
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={color}
              fillOpacity={selected === i ? 0.36 : 0.24}
              stroke={color}
              strokeWidth={selected === i ? 0.012 : 0.008}
              strokeDasharray={wrong?.has(i) ? '0.03 0.02' : undefined}
              onPointerDown={(e) => begin(e, i, 'move')}
              className={`board__body${wrong?.has(i) ? ' is-wrong' : ''}`}
            />
          </g>
        );
      })}

      {order.map((i) => {
        const c = circles[i] as Circle;
        const a = KNOB_ANGLE[i % 4] as number;
        const x = c.cx + Math.cos(a) * c.r;
        const y = c.cy + Math.sin(a) * c.r;
        const dim = highlight && !highlight.includes(i);
        return (
          <g
            key={`k${i}`}
            className={`board__knob${selected === i ? ' is-sel' : ''}${dim ? ' is-dim' : ''}`}
            onPointerDown={(e) => begin(e, i, 'resize')}
          >
            {!readOnly && <circle cx={x} cy={y} r={0.07} fill="transparent" />}
            <circle
              cx={x}
              cy={y}
              r={0.042}
              fill={colorOf(i)}
              stroke="#0a0b1a"
              strokeWidth={0.008}
            />
            <text x={x} y={y} dy="0.016" textAnchor="middle" fontSize="0.05" className="board__num">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Disposizione iniziale: quattro cerchi uguali, separati, uno per quadrante. */
export function initialCircles(): Circle[] {
  const r = 0.15;
  return [
    { cx: 0.27, cy: 0.27, r },
    { cx: 0.73, cy: 0.27, r },
    { cx: 0.27, cy: 0.73, r },
    { cx: 0.73, cy: 0.73, r },
  ];
}
