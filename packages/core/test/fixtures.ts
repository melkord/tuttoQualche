import type { Concept, PairRelation, PuzzleDraft, Relation } from '../src';
import { allPairs, RELATIONS } from '../src';

export const ANIMALI: PuzzleDraft = {
  theme: 'animali',
  concepts: [
    { label: 'cani', det: 'i' },
    { label: 'mammiferi', det: 'i' },
    { label: 'animali domestici', det: 'gli' },
    { label: 'pesci', det: 'i' },
  ],
  relations: [
    { a: 0, b: 1, rel: 'TUTTI' },
    { a: 0, b: 2, rel: 'TUTTI' },
    { a: 0, b: 3, rel: 'NESSUNO' },
    { a: 1, b: 2, rel: 'ALCUNI' },
    { a: 1, b: 3, rel: 'NESSUNO' },
    { a: 2, b: 3, rel: 'ALCUNI' },
  ],
};

export const CONCEPTS: Concept[] = [
  { label: 'rose', det: 'le' },
  { label: 'fiori', det: 'i' },
  { label: 'piante', det: 'le' },
  { label: 'alberi', det: 'gli' },
];

export function draftOf(rels: Relation[], concepts: Concept[] = CONCEPTS): PuzzleDraft {
  const relations: PairRelation[] = allPairs(4).map(([a, b], k) => ({
    a,
    b,
    rel: rels[k] as Relation,
  }));
  return { theme: 'test', concepts, relations };
}

/** Tutte le 5^6 combinazioni di relazioni per le 6 coppie (ordine di allPairs). */
export function* allRelationCombos(): Generator<Relation[]> {
  const total = 5 ** 6;
  for (let x = 0; x < total; x++) {
    let v = x;
    const rels: Relation[] = [];
    for (let k = 0; k < 6; k++) {
      rels.push(RELATIONS[v % 5] as Relation);
      v = Math.floor(v / 5);
    }
    yield rels;
  }
}
