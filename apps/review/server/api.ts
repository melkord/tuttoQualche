import { appendFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { PendingPuzzleSchema, validatePuzzle } from '@tuttialcuni/core';
import type { PendingPuzzle } from '@tuttialcuni/core';

export const REJECT_REASONS = ['ambiguo', 'troppo facile', 'concetti deboli'] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export interface ReviewState {
  pending: PendingPuzzle[];
  approved: number;
  rejected: number;
}

const ID = /^p-[a-z0-9]+$/;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra?: unknown,
  ) {
    super(message);
  }
}

async function readJsonFiles(dir: string): Promise<{ file: string; json: unknown }[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const out: { file: string; json: unknown }[] = [];
  for (const n of names.filter((x) => x.endsWith('.json')).sort()) {
    try {
      out.push({ file: n, json: JSON.parse(await readFile(path.join(dir, n), 'utf8')) });
    } catch {
      // file illeggibile: ignorato
    }
  }
  return out;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 1_000_000) throw new HttpError(413, 'Corpo troppo grande');
    chunks.push(c as Buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON non valido');
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

/** API locale per la revisione: legge/scrive solo file dentro `dataDir`. */
export function createApi({ dataDir }: { dataDir: string }) {
  const pendingDir = path.join(dataDir, 'pending');
  const approvedDir = path.join(dataDir, 'approved');
  const rejectedLog = path.join(dataDir, 'rejected.log.jsonl');

  const pendingFile = (id: string) => {
    if (!ID.test(id)) throw new HttpError(400, 'Id non valido');
    return path.join(pendingDir, `${id}.json`);
  };

  async function loadPending(id: string): Promise<PendingPuzzle> {
    const file = pendingFile(id);
    let raw: string;
    try {
      raw = await readFile(file, 'utf8');
    } catch {
      throw new HttpError(404, 'Puzzle non trovato');
    }
    return PendingPuzzleSchema.parse(JSON.parse(raw));
  }

  async function state(): Promise<ReviewState> {
    const pending: PendingPuzzle[] = [];
    for (const { json } of await readJsonFiles(pendingDir)) {
      const parsed = PendingPuzzleSchema.safeParse(json);
      if (parsed.success) pending.push(parsed.data);
    }
    let rejected = 0;
    try {
      rejected = (await readFile(rejectedLog, 'utf8')).split('\n').filter(Boolean).length;
    } catch {
      // nessun log ancora
    }
    return { pending, approved: (await readJsonFiles(approvedDir)).length, rejected };
  }

  function assertValid(p: PendingPuzzle) {
    const report = validatePuzzle(p.puzzle);
    if (!report.ok) throw new HttpError(422, 'Puzzle non valido', { issues: report.issues });
  }

  async function route(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    const method = req.method ?? 'GET';

    if (method === 'GET' && parts[1] === 'state' && parts.length === 2) {
      return send(res, 200, await state());
    }

    const id = parts[2];
    if (parts[1] === 'pending' && id && method === 'PUT') {
      // Salva un puzzle modificato (l'id deriva dal contenuto: può cambiare).
      const body = PendingPuzzleSchema.safeParse(await readBody(req));
      if (!body.success) throw new HttpError(400, 'Formato non valido');
      assertValid(body.data);
      await loadPending(id);
      await mkdir(pendingDir, { recursive: true });
      await writeFile(
        pendingFile(body.data.puzzle.id),
        JSON.stringify(body.data, null, 2) + '\n',
        'utf8',
      );
      if (body.data.puzzle.id !== id) await unlink(pendingFile(id));
      return send(res, 200, body.data);
    }

    if (parts[1] === 'approve' && id && method === 'POST') {
      const p = await loadPending(id);
      assertValid(p);
      await mkdir(approvedDir, { recursive: true });
      const dest = path.join(approvedDir, `${p.puzzle.id}.json`);
      await writeFile(dest, JSON.stringify(p.puzzle, null, 2) + '\n', 'utf8');
      await unlink(pendingFile(id));
      return send(res, 200, { ok: true });
    }

    if (parts[1] === 'reject' && id && method === 'POST') {
      const body = (await readBody(req)) as { reason?: string };
      if (!REJECT_REASONS.includes(body.reason as RejectReason)) {
        throw new HttpError(400, 'Motivo non valido');
      }
      const p = await loadPending(id);
      const entry = {
        id: p.puzzle.id,
        reason: body.reason,
        at: new Date().toISOString(),
        theme: p.puzzle.theme,
        concepts: p.puzzle.concepts.map((c) => c.label),
        relations: p.puzzle.relations.map((r) => `${r.a}${r.b}:${r.rel}`),
      };
      await mkdir(dataDir, { recursive: true });
      await appendFile(rejectedLog, JSON.stringify(entry) + '\n', 'utf8');
      await unlink(pendingFile(id));
      return send(res, 200, { ok: true });
    }

    throw new HttpError(404, 'Non trovato');
  }

  /** Middleware compatibile con Connect/Vite: gestisce solo `/api/*`. */
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/')) return next();
    try {
      await route(req, res);
    } catch (e) {
      if (e instanceof HttpError) send(res, e.status, { error: e.message, ...(e.extra as object) });
      else send(res, 500, { error: e instanceof Error ? e.message : 'Errore interno' });
    }
  };
}
