import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildPuzzle, InvalidPuzzleError, validateDraft } from '@eulero/core';
import type { PendingPuzzle } from '@eulero/core';
import type { LlmClient } from './llm';
import { CRITIC_SYSTEM, criticUser, DRAFT_SYSTEM, draftUser } from './prompts';
import {
  CritiqueOutputSchema,
  DraftOutputSchema,
  draftFromOutput,
  risksFromOutput,
} from './schemas';

export const MAX_REPAIR_ATTEMPTS = 2;

export type SkipReason = 'refusal' | 'invalid' | 'duplicate' | 'critic-failed';

export type GenerateResult =
  { ok: true; pending: PendingPuzzle } | { ok: false; reason: SkipReason; detail?: string };

/** Firma di un puzzle per il controllo duplicati: insieme ordinato di etichette. */
export function conceptSignature(labels: readonly string[]): string {
  return [...labels]
    .map((l) => l.trim().toLowerCase())
    .sort()
    .join(' | ');
}

/**
 * Passaggio (a) bozza + validazione di core (con riparazione guidata dagli errori),
 * passaggio (b) critico con livello di rischio per coppia.
 */
export async function generateOne(
  llm: LlmClient,
  opts: { theme: string; seen: Set<string>; now?: () => Date },
): Promise<GenerateResult> {
  let feedback: string | undefined;
  let puzzle: ReturnType<typeof buildPuzzle> | undefined;
  let lastDetail: string | undefined;

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    const out = await llm.generateObject({
      system: DRAFT_SYSTEM,
      user: draftUser({ theme: opts.theme, avoid: [...opts.seen], feedback }),
      schema: DraftOutputSchema,
    });
    if (!out) return { ok: false, reason: 'refusal' };

    const draft = draftFromOutput(out);
    const report = validateDraft(draft);
    if (!report.ok) {
      lastDetail = report.issues.map((i) => i.message).join(' ');
      feedback = report.issues.map((i) => `- ${i.message}`).join('\n');
      continue;
    }
    try {
      puzzle = buildPuzzle(draft);
    } catch (e) {
      if (!(e instanceof InvalidPuzzleError)) throw e;
      lastDetail = e.message;
      feedback = e.issues.map((i) => `- ${i.message}`).join('\n');
      continue;
    }
    break;
  }
  if (!puzzle) return { ok: false, reason: 'invalid', detail: lastDetail };

  const signature = conceptSignature(puzzle.concepts.map((c) => c.label));
  if (opts.seen.has(signature)) return { ok: false, reason: 'duplicate', detail: signature };

  const critique = await llm.generateObject({
    system: CRITIC_SYSTEM,
    user: criticUser(puzzle),
    schema: CritiqueOutputSchema,
  });
  if (!critique) return { ok: false, reason: 'critic-failed' };

  opts.seen.add(signature);
  return {
    ok: true,
    pending: {
      puzzle,
      risks: risksFromOutput(critique),
      meta: { generatedAt: (opts.now?.() ?? new Date()).toISOString(), model: llm.model },
    },
  };
}

/** Firme dei puzzle già presenti nelle cartelle indicate (pending, approved, …). */
export async function loadSeenSignatures(dirs: string[]): Promise<Set<string>> {
  const seen = new Set<string>();
  for (const dir of dirs) {
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const f of files.filter((n) => n.endsWith('.json'))) {
      try {
        const json = JSON.parse(await readFile(path.join(dir, f), 'utf8')) as {
          puzzle?: { concepts?: { label: string }[] };
          concepts?: { label: string }[];
        };
        const concepts = json.puzzle?.concepts ?? json.concepts;
        if (concepts) seen.add(conceptSignature(concepts.map((c) => c.label)));
      } catch {
        // file illeggibile: ignorato
      }
    }
  }
  return seen;
}

export async function writePending(dir: string, pending: PendingPuzzle): Promise<string> {
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${pending.puzzle.id}.json`);
  await writeFile(file, JSON.stringify(pending, null, 2) + '\n', 'utf8');
  return file;
}
