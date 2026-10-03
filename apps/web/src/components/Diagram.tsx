import type { Circle } from '@tuttialcuni/core';
import { colorOf } from '../palette';

interface Props {
  circles: Circle[];
  /** Indice (nel puzzle) del concetto di ciascun cerchio, per il colore. */
  concepts: readonly number[];
}

/** Diagramma statico: contorni colorati su fondo scuro, come le opzioni del gioco. */
export function Diagram({ circles, concepts }: Props) {
  return (
    <svg className="diagram" viewBox="0 0 1 1" aria-hidden>
      {circles.map((c, j) => {
        const color = colorOf(concepts[j] ?? j);
        return (
          <circle
            key={j}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill={color}
            fillOpacity={0.14}
            stroke={color}
            strokeWidth={0.018}
          />
        );
      })}
    </svg>
  );
}
