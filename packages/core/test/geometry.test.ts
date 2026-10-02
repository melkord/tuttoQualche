import { describe, expect, it } from 'vitest';
import {
  buildMatrix,
  classifyCircles,
  evaluateDiagram,
  isConsistent,
  isRepresentable,
  layoutCircles,
  layoutMatches,
} from '../src';
import { allRelationCombos, ANIMALI, draftOf } from './fixtures';

const matrixOf = (rels: Parameters<typeof draftOf>[0]) =>
  buildMatrix(draftOf(rels).relations).matrix!;
const c = (cx: number, cy: number, r: number) => ({ cx, cy, r });

describe('classifyCircles', () => {
  it('riconosce le cinque relazioni', () => {
    expect(classifyCircles(c(0.3, 0.5, 0.1), c(0.35, 0.5, 0.3))).toBe('TUTTI');
    expect(classifyCircles(c(0.35, 0.5, 0.3), c(0.3, 0.5, 0.1))).toBe('CONTIENE');
    expect(classifyCircles(c(0.3, 0.5, 0.2), c(0.6, 0.5, 0.2))).toBe('ALCUNI');
    expect(classifyCircles(c(0.2, 0.5, 0.1), c(0.8, 0.5, 0.1))).toBe('NESSUNO');
    expect(classifyCircles(c(0.5, 0.5, 0.2), c(0.5, 0.5, 0.2))).toBe('UGUALI');
  });

  it('tangenti esterne = disgiunti; tangenti interne = inclusione', () => {
    expect(classifyCircles(c(0.2, 0.5, 0.1), c(0.4, 0.5, 0.1))).toBe('NESSUNO');
    expect(classifyCircles(c(0.4, 0.5, 0.1), c(0.5, 0.5, 0.2))).toBe('TUTTI');
  });

  it('la tolleranza permette cerchi "quasi uguali" (per il gioco)', () => {
    const a = c(0.5, 0.5, 0.2);
    const b = c(0.51, 0.5, 0.205);
    expect(classifyCircles(a, b)).toBe('ALCUNI');
    expect(classifyCircles(a, b, { equalTolerance: 0.02 })).toBe('UGUALI');
  });

  it('è totale e antisimmetrica rispetto all’inverso', () => {
    const cs = [c(0.3, 0.3, 0.2), c(0.5, 0.4, 0.15), c(0.8, 0.8, 0.1), c(0.35, 0.3, 0.05)];
    const inv = {
      TUTTI: 'CONTIENE',
      CONTIENE: 'TUTTI',
      ALCUNI: 'ALCUNI',
      NESSUNO: 'NESSUNO',
      UGUALI: 'UGUALI',
    };
    for (const a of cs)
      for (const b of cs) expect(classifyCircles(b, a)).toBe(inv[classifyCircles(a, b)]);
  });
});

describe('layoutCircles', () => {
  it('trova un diagramma per il puzzle di esempio, deterministico', () => {
    const matrix = buildMatrix(ANIMALI.relations).matrix!;
    const l1 = layoutCircles(matrix);
    const l2 = layoutCircles(matrix);
    expect(l1).not.toBeNull();
    expect(l1).toEqual(l2);
    expect(layoutMatches(matrix, l1!)).toBe(true);
    for (const k of l1!) {
      expect(k.cx - k.r).toBeGreaterThanOrEqual(0);
      expect(k.cx + k.r).toBeLessThanOrEqual(1);
      expect(k.cy - k.r).toBeGreaterThanOrEqual(0);
      expect(k.cy + k.r).toBeLessThanOrEqual(1);
    }
  });

  it('concetti UGUALI condividono lo stesso cerchio', () => {
    const matrix = matrixOf(['UGUALI', 'ALCUNI', 'NESSUNO', 'ALCUNI', 'NESSUNO', 'ALCUNI']);
    expect(isConsistent(matrix)).toBe(true);
    const l = layoutCircles(matrix)!;
    expect(l[0]).toEqual(l[1]);
    expect(layoutMatches(matrix, l)).toBe(true);
  });

  it('rifiuta una matrice incoerente', () => {
    const bad = matrixOf(['TUTTI', 'NESSUNO', 'ALCUNI', 'TUTTI', 'ALCUNI', 'ALCUNI']);
    expect(layoutCircles(bad)).toBeNull();
    expect(isRepresentable(bad)).toBe(false);
  });

  it('evaluateDiagram segnala le coppie sbagliate', () => {
    const matrix = buildMatrix(ANIMALI.relations).matrix!;
    const good = layoutCircles(matrix)!;
    expect(evaluateDiagram(matrix, good).correct).toBe(true);
    const bad = [...good];
    bad[3] = { ...good[0]! }; // pesci sovrapposto ai cani
    const ev = evaluateDiagram(matrix, bad);
    expect(ev.correct).toBe(false);
    expect(ev.pairs.filter((p) => !p.correct).length).toBeGreaterThan(0);
  });

  it('OGNI matrice coerente (tutte le 1191) è rappresentabile con cerchi', () => {
    let n = 0;
    for (const rels of allRelationCombos()) {
      const matrix = matrixOf(rels);
      if (!isConsistent(matrix)) continue;
      const l = layoutCircles(matrix);
      expect(l, rels.join(',')).not.toBeNull();
      expect(layoutMatches(matrix, l!)).toBe(true);
      n++;
    }
    expect(n).toBe(1191);
  }, 60_000);
});
