import type { Circle } from '@eulero/core';
import { colorOf } from '../palette';

/** Diagramma statico: un contorno colorato per parola (colore = posizione di rivelazione). */
export function Diagram({ circles }: { circles: Circle[] }) {
  return (
    <svg className="diagram" viewBox="0 0 1 1" aria-hidden>
      {circles.map((c, slot) => {
        const color = colorOf(slot);
        return (
          <circle
            key={slot}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="none"
            stroke={color}
            strokeWidth={0.02}
          />
        );
      })}
    </svg>
  );
}
