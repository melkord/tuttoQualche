import { isConsistent } from './consistency';
import { mulberry32 } from './rng';
import { allPairs, relationBetween } from './relations';
import type { Circle, Matrix, Relation } from './types';

export interface ClassifyOptions {
  /** Distanza dei centri e differenza dei raggi sotto cui due cerchi sono "uguali". */
  equalTolerance?: number;
  /** Indulgenza per i bordi quasi tangenti (giocatore): conta come disgiunti/inclusi. Default 0. */
  slack?: number;
}

/** Relazione geometrica del cerchio `a` rispetto al cerchio `b` (funzione totale). */
export function classifyCircles(a: Circle, b: Circle, opts: ClassifyOptions = {}): Relation {
  const tol = opts.equalTolerance ?? 1e-6;
  const slack = opts.slack ?? 0;
  const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
  if (d <= tol && Math.abs(a.r - b.r) <= tol) return 'UGUALI';
  if (d >= a.r + b.r - slack) return 'NESSUNO';
  if (d + a.r <= b.r + slack) return 'TUTTI';
  if (d + b.r <= a.r + slack) return 'CONTIENE';
  return 'ALCUNI';
}

export interface PairVerdict {
  a: number;
  b: number;
  expected: Relation;
  actual: Relation;
  correct: boolean;
}

/** Confronta un diagramma disegnato dal giocatore con la matrice del puzzle. */
export function evaluateDiagram(
  matrix: Matrix,
  circles: readonly Circle[],
  opts: ClassifyOptions = {},
): { correct: boolean; pairs: PairVerdict[] } {
  const pairs = allPairs(matrix.length).map(([a, b]) => {
    const ca = circles[a];
    const cb = circles[b];
    if (!ca || !cb) throw new RangeError('Servono tanti cerchi quanti sono i concetti.');
    const expected = relationBetween(matrix, a, b);
    const actual = classifyCircles(ca, cb, opts);
    return { a, b, expected, actual, correct: expected === actual };
  });
  return { correct: pairs.every((p) => p.correct), pairs };
}

const MARGIN = 0.025;
const R_MIN = 0.08;
const R_MAX = 0.46;
const RESTARTS = 120;
const ITERATIONS = 2500;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function pairPenalty(rel: Relation, p: Circle, q: Circle): number {
  const d = Math.hypot(p.cx - q.cx, p.cy - q.cy);
  switch (rel) {
    case 'NESSUNO':
      return Math.max(0, p.r + q.r + MARGIN - d);
    case 'TUTTI':
      return Math.max(0, d + p.r + MARGIN - q.r);
    case 'CONTIENE':
      return Math.max(0, d + q.r + MARGIN - p.r);
    case 'ALCUNI':
      return Math.max(0, Math.abs(p.r - q.r) + MARGIN - d) + Math.max(0, d - (p.r + q.r) + MARGIN);
    case 'UGUALI':
      return d + Math.abs(p.r - q.r);
  }
}

function boundsPenalty(c: Circle): number {
  return (
    Math.max(0, c.r - c.cx) +
    Math.max(0, c.cx + c.r - 1) +
    Math.max(0, c.r - c.cy) +
    Math.max(0, c.cy + c.r - 1)
  );
}

const round = (x: number) => Math.round(x * 1e4) / 1e4;

/**
 * Cerca un diagramma di Eulero a cerchi nel quadrato unitario che realizzi ESATTAMENTE la
 * matrice (con un margine visivo tra i bordi). Concetti UGUALI condividono lo stesso cerchio.
 * Ricerca stocastica con seed fisso: il risultato è deterministico. `null` se non trovato
 * entro il budget (la matrice può essere incoerente o non rappresentabile con cerchi).
 */
export function layoutCircles(matrix: Matrix, seed = 1): Circle[] | null {
  const n = matrix.length;

  // Classi di concetti UGUALI → un solo cerchio per classe.
  const classOf: number[] = [];
  const reps: number[] = [];
  for (let i = 0; i < n; i++) {
    const found = reps.findIndex((r) => relationBetween(matrix, r, i) === 'UGUALI');
    if (found >= 0) classOf[i] = found;
    else {
      classOf[i] = reps.length;
      reps.push(i);
    }
  }
  const k = reps.length;
  const constraints: { p: number; q: number; rel: Relation }[] = [];
  for (let p = 0; p < k; p++)
    for (let q = p + 1; q < k; q++)
      constraints.push({
        p,
        q,
        rel: relationBetween(matrix, reps[p] as number, reps[q] as number),
      });

  const total = (cs: Circle[]): number => {
    let s = 0;
    for (const c of cs) s += boundsPenalty(c);
    for (const { p, q, rel } of constraints)
      s += pairPenalty(rel, cs[p] as Circle, cs[q] as Circle);
    return s;
  };

  const rng = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(rng(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };

  for (let attempt = 0; attempt < RESTARTS; attempt++) {
    let cs: Circle[] = Array.from({ length: k }, () => {
      const r = R_MIN + rng() * 0.25;
      return { cx: r + rng() * (1 - 2 * r), cy: r + rng() * (1 - 2 * r), r };
    });
    let cost = total(cs);
    let step = 0.25;
    for (let it = 0; it < ITERATIONS && cost > 0; it++) {
      const idx = Math.floor(rng() * k);
      const old = cs[idx] as Circle;
      const next: Circle = {
        cx: clamp(old.cx + gauss() * step, 0, 1),
        cy: clamp(old.cy + gauss() * step, 0, 1),
        r: clamp(old.r + gauss() * step * 0.5, R_MIN, R_MAX),
      };
      const candidate = cs.slice();
      candidate[idx] = next;
      const c2 = total(candidate);
      if (c2 <= cost) {
        cs = candidate;
        cost = c2;
      }
      if (it % 100 === 99) step = Math.max(0.01, step * 0.8);
    }
    if (cost === 0) {
      const rounded = cs.map((c) => ({ cx: round(c.cx), cy: round(c.cy), r: round(c.r) }));
      const result = Array.from({ length: n }, (_, i) => ({
        ...(rounded[classOf[i] as number] as Circle),
      }));
      if (layoutMatches(matrix, result)) return result;
    }
  }
  return null;
}

/**
 * Ruota (attorno al centro) e poi centra/scala i cerchi per riempire il quadrato unitario
 * lasciando `padding` ai bordi. È una similitudine: le relazioni tra i cerchi non cambiano.
 */
export function fitCircles(circles: readonly Circle[], rotation = 0, padding = 0.07): Circle[] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rotated = circles.map((c) => {
    const x = c.cx - 0.5;
    const y = c.cy - 0.5;
    return { cx: 0.5 + x * cos - y * sin, cy: 0.5 + x * sin + y * cos, r: c.r };
  });
  const minX = Math.min(...rotated.map((c) => c.cx - c.r));
  const maxX = Math.max(...rotated.map((c) => c.cx + c.r));
  const minY = Math.min(...rotated.map((c) => c.cy - c.r));
  const maxY = Math.max(...rotated.map((c) => c.cy + c.r));
  const scale = (1 - 2 * padding) / Math.max(maxX - minX, maxY - minY);
  const offX = 0.5 - ((minX + maxX) / 2) * scale;
  const offY = 0.5 - ((minY + maxY) / 2) * scale;
  return rotated.map((c) => ({
    cx: round(c.cx * scale + offX),
    cy: round(c.cy * scale + offY),
    r: round(c.r * scale),
  }));
}

/** Verifica indipendente: la classificazione geometrica riproduce esattamente la matrice. */
export function layoutMatches(matrix: Matrix, circles: readonly Circle[]): boolean {
  return evaluateDiagram(matrix, circles).correct;
}

/** Rappresentabile con cerchi = coerente + esiste un layout (ricerca con budget fisso). */
export function isRepresentable(matrix: Matrix): boolean {
  return isConsistent(matrix) && layoutCircles(matrix) !== null;
}
