import type { Circle } from '@eulero/core';
import { colorOf } from '../palette';

interface Props {
  circles: Circle[];
  /** Coppia evidenziata (hover su una relazione): gli altri cerchi si attenuano. */
  highlight?: [number, number] | null;
  dimmed?: boolean;
}

/** Posizione del numero-badge: sul bordo del cerchio, lontano dagli altri cerchi. */
function badgeAngle(circles: Circle[], i: number): number {
  const me = circles[i] as Circle;
  const others = circles.filter(
    (c, j) => j !== i && (c.cx !== me.cx || c.cy !== me.cy || c.r !== me.r),
  );
  let angle = -Math.PI / 2;
  if (others.length > 0) {
    const ox = others.reduce((s, c) => s + c.cx, 0) / others.length;
    const oy = others.reduce((s, c) => s + c.cy, 0) / others.length;
    if (Math.hypot(me.cx - ox, me.cy - oy) > 0.01) angle = Math.atan2(me.cy - oy, me.cx - ox);
  }
  // cerchi coincidenti (UGUALI): ventaglio di badge
  const twinsBefore = circles
    .slice(0, i)
    .filter((c) => c.cx === me.cx && c.cy === me.cy && c.r === me.r).length;
  return angle + twinsBefore * 0.55;
}

export function Diagram({ circles, highlight, dimmed }: Props) {
  return (
    <svg
      className={`diagram${dimmed ? ' diagram--dim' : ''}`}
      viewBox="-0.07 -0.07 1.14 1.14"
      role="img"
      aria-label="Diagramma di Eulero"
    >
      <defs>
        <pattern id="grid" width="0.1" height="0.1" patternUnits="userSpaceOnUse">
          <path d="M0.1 0H0V0.1" fill="none" stroke="currentColor" strokeWidth="0.002" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="1" height="1" rx="0.04" className="diagram__bg" />
      <rect
        x="0"
        y="0"
        width="1"
        height="1"
        rx="0.04"
        fill="url(#grid)"
        className="diagram__grid"
      />
      {circles.map((c, i) => {
        const faded = highlight && !highlight.includes(i);
        const color = colorOf(i);
        return (
          <g
            key={i}
            className={`diagram__circle${faded ? ' is-faded' : ''}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={color}
              fillOpacity={0.26}
              stroke={color}
              strokeWidth={0.008}
            />
          </g>
        );
      })}
      {circles.map((c, i) => {
        const a = badgeAngle(circles, i);
        const x = c.cx + Math.cos(a) * c.r;
        const y = c.cy + Math.sin(a) * c.r;
        const faded = highlight && !highlight.includes(i);
        return (
          <g key={`b${i}`} className={`diagram__badge${faded ? ' is-faded' : ''}`}>
            <circle cx={x} cy={y} r={0.04} fill={colorOf(i)} />
            <text
              x={x}
              y={y}
              className="diagram__num"
              dy="0.015"
              textAnchor="middle"
              fontSize="0.048"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
