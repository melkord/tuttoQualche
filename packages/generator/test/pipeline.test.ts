import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PendingPuzzleSchema, validatePuzzle } from '@eulero/core';
import type { GenerateObjectRequest, LlmClient } from '../src/llm';
import {
  conceptSignature,
  generateOne,
  loadSeenSignatures,
  MAX_REPAIR_ATTEMPTS,
  writePending,
} from '../src/pipeline';
import type { CritiqueOutput, DraftOutput } from '../src/schemas';
import { draftFromOutput } from '../src/schemas';

const GOOD: DraftOutput = {
  tema: 'Animali',
  concetti: [
    { etichetta: 'Cani', articolo: 'i' },
    { etichetta: 'mammiferi', articolo: 'i' },
    { etichetta: 'animali domestici', articolo: 'gli' },
    { etichetta: 'pesci', articolo: 'i' },
  ],
  inglese: { tema: 'Animals', concetti: ['Dogs', 'mammals', 'pets', 'fish'] },
  r01: 'TUTTI',
  r02: 'TUTTI',
  r03: 'NESSUNO',
  r12: 'ALCUNI',
  r13: 'NESSUNO',
  r23: 'ALCUNI',
};
// A⊂B, B⊂C ma A∩C=∅ → incoerente
const BAD: DraftOutput = { ...GOOD, r02: 'NESSUNO', r12: 'TUTTI' };

const risk = (livello: 'basso' | 'medio' | 'alto', motivo = 'ok') => ({ livello, motivo });
const CRITIQUE: CritiqueOutput = {
  r01: risk('basso'),
  r02: risk('alto', 'randagi'),
  r03: risk('basso'),
  r12: risk('medio'),
  r13: risk('basso'),
  r23: risk('basso'),
};

class MockLlm implements LlmClient {
  readonly model = 'mock';
  readonly calls: GenerateObjectRequest<unknown>[] = [];
  constructor(private readonly responses: (unknown | null)[]) {}
  async generateObject<T>(req: GenerateObjectRequest<T>): Promise<T | null> {
    this.calls.push(req as GenerateObjectRequest<unknown>);
    const next = this.responses.shift();
    return (next ?? null) as T | null;
  }
}

const fixedNow = () => new Date('2026-10-02T10:00:00Z');

describe('draftFromOutput', () => {
  it('porta con sé la traduzione inglese', () => {
    const d = draftFromOutput(GOOD) as {
      translations: { en: { theme: string; concepts: string[] } };
    };
    expect(d.translations.en.theme).toBe('animals');
    expect(d.translations.en.concepts).toEqual(['dogs', 'mammals', 'pets', 'fish']);
  });

  it('normalizza etichette e costruisce le 6 coppie', () => {
    const d = draftFromOutput(GOOD) as {
      theme: string;
      concepts: { label: string }[];
      relations: unknown[];
    };
    expect(d.theme).toBe('animali');
    expect(d.concepts[0]!.label).toBe('cani');
    expect(d.relations).toHaveLength(6);
  });
});

describe('generateOne', () => {
  it('bozza valida + critica → puzzle in pending con rischi per coppia', async () => {
    const llm = new MockLlm([GOOD, CRITIQUE]);
    const res = await generateOne(llm, { theme: 'animali', seen: new Set(), now: fixedNow });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(PendingPuzzleSchema.safeParse(res.pending).success).toBe(true);
    expect(validatePuzzle(res.pending.puzzle).ok).toBe(true);
    expect(res.pending.risks['02']).toEqual({ level: 'alto', reason: 'randagi' });
    // la traduzione inglese viaggia nel puzzle, normalizzata come l'italiano
    expect(res.pending.puzzle.translations?.en).toEqual({
      theme: 'animals',
      concepts: ['dogs', 'mammals', 'pets', 'fish'],
    });
    expect(Object.keys(res.pending.risks).sort()).toEqual(['01', '02', '03', '12', '13', '23']);
    expect(res.pending.meta).toEqual({ generatedAt: '2026-10-02T10:00:00.000Z', model: 'mock' });
    // il critico vede le relazioni in italiano
    expect(llm.calls[1]!.user).toContain('r02');
  });

  it('bozza incoerente: riprova passando al modello gli errori del validatore', async () => {
    const llm = new MockLlm([BAD, GOOD, CRITIQUE]);
    const res = await generateOne(llm, { theme: 'animali', seen: new Set(), now: fixedNow });
    expect(res.ok).toBe(true);
    expect(llm.calls[1]!.user).toContain('validatore logico');
    expect(llm.calls[1]!.user).toContain('Incoerenza transitiva');
  });

  it('rinuncia dopo i tentativi di riparazione e non chiama il critico', async () => {
    const llm = new MockLlm(Array(MAX_REPAIR_ATTEMPTS + 1).fill(BAD));
    const res = await generateOne(llm, { theme: 'animali', seen: new Set() });
    expect(res).toMatchObject({ ok: false, reason: 'invalid' });
    expect(llm.calls).toHaveLength(MAX_REPAIR_ATTEMPTS + 1);
  });

  it('rifiuto del modello → scartato', async () => {
    const res = await generateOne(new MockLlm([null]), { theme: 'x', seen: new Set() });
    expect(res).toMatchObject({ ok: false, reason: 'refusal' });
  });

  it('duplicato (stesso insieme di concetti) → scartato prima del critico', async () => {
    const seen = new Set([conceptSignature(['pesci', 'Cani', 'animali domestici', 'mammiferi'])]);
    const llm = new MockLlm([GOOD]);
    const res = await generateOne(llm, { theme: 'animali', seen });
    expect(res).toMatchObject({ ok: false, reason: 'duplicate' });
    expect(llm.calls).toHaveLength(1);
  });

  it('critico che rifiuta → scartato, e il puzzle non entra tra i visti', async () => {
    const seen = new Set<string>();
    const res = await generateOne(new MockLlm([GOOD, null]), { theme: 'animali', seen });
    expect(res).toMatchObject({ ok: false, reason: 'critic-failed' });
    expect(seen.size).toBe(0);
  });

  it('il prompt include i concetti già visti da evitare', async () => {
    const llm = new MockLlm([GOOD, CRITIQUE]);
    await generateOne(llm, { theme: 'animali', seen: new Set(['api | fiori | insetti | piante']) });
    expect(llm.calls[0]!.user).toContain('api | fiori | insetti | piante');
  });
});

describe('file I/O', () => {
  it('scrive in pending/<id>.json e rileva i duplicati dai file esistenti', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'eulero-'));
    const res = await generateOne(new MockLlm([GOOD, CRITIQUE]), {
      theme: 'animali',
      seen: new Set(),
    });
    if (!res.ok) throw new Error('atteso ok');
    const file = await writePending(dir, res.pending);
    expect(path.basename(file)).toBe(`${res.pending.puzzle.id}.json`);
    expect(await readdir(dir)).toEqual([`${res.pending.puzzle.id}.json`]);
    expect(PendingPuzzleSchema.parse(JSON.parse(await readFile(file, 'utf8')))).toEqual(
      res.pending,
    );

    const seen = await loadSeenSignatures([dir, path.join(dir, 'non-esiste')]);
    expect(seen.has(conceptSignature(res.pending.puzzle.concepts.map((c) => c.label)))).toBe(true);
  });
});
