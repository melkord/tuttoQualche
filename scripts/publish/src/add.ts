import { buildPuzzle, PendingPuzzleSchema, translationKey, validateDraft } from '@eulero/core';
import type { PairRelation, PendingPuzzle, PuzzleDraft, Relation, Risk } from '@eulero/core';
import { z } from 'zod';

/**
 * Formato compatto per aggiungere livelli (lo stesso di packages/generator/seed/livelli.ts, più
 * l'inglese):
 *  - concepts: "<articolo> <etichetta>", articolo = i | gli | le   (es. "i cani", "le aquile")
 *  - conceptsEn: le 4 etichette inglesi, nello STESSO ordine; minuscole ma con la maiuscola per aggettivi
 *    e nomi propri ("Italian lakes", "French cities")
 *  - relations: 6 lettere nell'ordine 01 02 03 12 13 23 — T (A⊂B) C (B⊂A) A (alcuni) N (nessuno) U (uguali)
 *  - risks: solo le coppie dubbie, es. { "02": ["medio", "motivo"] }. Un rischio "alto" = non pubblicare.
 */
export const LevelInputSchema = z.object({
  theme: z.string().min(1).max(60),
  themeEn: z.string().min(1).max(60),
  concepts: z
    .array(z.string().regex(/^(i|gli|le) \S.*$/, 'serve "<articolo> <etichetta>"'))
    .length(4),
  conceptsEn: z.array(z.string().min(1).max(40)).length(4),
  relations: z.string().regex(/^[TCANU]{6}$/, 'servono 6 lettere tra T C A N U'),
  risks: z.record(z.string(), z.tuple([z.enum(['medio', 'alto']), z.string().min(1)])).optional(),
});
export type LevelInput = z.infer<typeof LevelInputSchema>;

const REL: Record<string, Relation> = {
  T: 'TUTTI',
  C: 'CONTIENE',
  A: 'ALCUNI',
  N: 'NESSUNO',
  U: 'UGUALI',
};
const PAIRS: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

export function toDraft(input: LevelInput): PuzzleDraft {
  return {
    theme: input.theme.trim().toLowerCase(),
    concepts: input.concepts.map((c) => {
      const [det, ...rest] = c.trim().split(' ');
      return { det: det as 'i' | 'gli' | 'le', label: rest.join(' ').trim().toLowerCase() };
    }),
    relations: PAIRS.map(([a, b], k): PairRelation => ({
      a,
      b,
      rel: REL[input.relations[k] as string] as Relation,
    })),
    translations: {
      en: {
        theme: input.themeEn.trim(),
        concepts: input.conceptsEn.map((c) => c.trim()),
      },
    },
  };
}

/** Firma per i duplicati: gli stessi 4 concetti, in qualunque ordine. */
export const levelSignature = (labels: readonly string[]) =>
  [...labels]
    .map((l) => l.trim().toLowerCase())
    .sort()
    .join('|');

export type Prepared = { ok: true; pending: PendingPuzzle } | { ok: false; error: string };

/** Valida un livello e lo trasforma in una bozza per `data/pending`. `seen` si aggiorna se accettato. */
export function prepareLevel(raw: unknown, seen: Set<string>, now: Date = new Date()): Prepared {
  const parsed = LevelInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  const input = parsed.data;
  const alto = Object.entries(input.risks ?? {}).find(([, [level]]) => level === 'alto');
  if (alto)
    return {
      ok: false,
      error: `rischio alto sulla coppia ${alto[0]} (${alto[1][1]}): scegli concetti meno ambigui`,
    };

  const draft = toDraft(input);
  const report = validateDraft(draft);
  if (!report.ok) return { ok: false, error: report.issues.map((i) => i.message).join(' ') };

  const en = draft.translations?.en?.concepts ?? [];
  if (new Set(en.map((c) => c.toLowerCase())).size !== 4)
    return { ok: false, error: 'le etichette inglesi devono essere 4 e distinte' };

  const sig = levelSignature(draft.concepts.map((c) => c.label));
  if (seen.has(sig))
    return { ok: false, error: `duplicato: ${draft.concepts.map((c) => c.label).join(', ')}` };

  const puzzle = buildPuzzle(draft);
  const risks: Record<string, Risk> = {};
  for (const [a, b] of PAIRS) {
    const key = `${a}${b}`;
    const r = input.risks?.[key];
    risks[key] = r
      ? { level: r[0], reason: r[1] }
      : { level: 'basso', reason: 'Conoscenza comune.' };
  }
  const pending = PendingPuzzleSchema.parse({
    puzzle,
    risks,
    meta: { generatedAt: now.toISOString(), model: 'routine' },
  });
  seen.add(sig);
  return { ok: true, pending };
}

export { translationKey };
