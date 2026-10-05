import { z } from 'zod';
import { ALL_PAIR_KEYS, RELATIONS, RISK_LEVELS } from '@eulero/core';
import type { PairKey, PuzzleDraft, Risk } from '@eulero/core';

/*
 * Schemi per l'output strutturato di Claude. Volutamente "piatti" (una chiave per coppia,
 * niente vincoli di lunghezza): la correttezza vera è decisa dal validatore di core.
 */

const Rel = z.enum(RELATIONS);
const Det = z.enum(['i', 'gli', 'le']);

export const DraftOutputSchema = z.object({
  tema: z.string(),
  concetti: z.array(z.object({ etichetta: z.string(), articolo: Det })),
  /** Traduzione inglese: tema e le 4 etichette, nello stesso ordine di `concetti`. */
  inglese: z.object({ tema: z.string(), concetti: z.array(z.string()) }),
  r01: Rel,
  r02: Rel,
  r03: Rel,
  r12: Rel,
  r13: Rel,
  r23: Rel,
});
export type DraftOutput = z.infer<typeof DraftOutputSchema>;

const RiskItem = z.object({ livello: z.enum(RISK_LEVELS), motivo: z.string() });
export const CritiqueOutputSchema = z.object({
  r01: RiskItem,
  r02: RiskItem,
  r03: RiskItem,
  r12: RiskItem,
  r13: RiskItem,
  r23: RiskItem,
});
export type CritiqueOutput = z.infer<typeof CritiqueOutputSchema>;

export function draftFromOutput(out: DraftOutput): unknown {
  const draft: PuzzleDraft = {
    theme: out.tema.trim().toLowerCase(),
    concepts: out.concetti.map((c) => ({
      label: c.etichetta.trim().toLowerCase(),
      det: c.articolo,
    })),
    translations: {
      en: {
        theme: out.inglese.tema.trim(),
        concepts: out.inglese.concetti.map((c) => c.trim()),
      },
    },
    relations: ALL_PAIR_KEYS.map((k) => ({
      a: Number(k[0]),
      b: Number(k[1]),
      rel: out[`r${k}` as keyof DraftOutput] as PuzzleDraft['relations'][number]['rel'],
    })),
  };
  return draft;
}

export function risksFromOutput(out: CritiqueOutput): Record<PairKey, Risk> {
  const risks = {} as Record<PairKey, Risk>;
  for (const k of ALL_PAIR_KEYS) {
    const item = out[`r${k}` as keyof CritiqueOutput];
    risks[k] = { level: item.livello, reason: item.motivo };
  }
  return risks;
}
