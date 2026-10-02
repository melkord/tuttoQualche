import { mkdtemp, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildPuzzle } from '@tuttialcuni/core';
import type { PendingPuzzle, PuzzleDraft } from '@tuttialcuni/core';
import { createApi } from '../server/api';

const DRAFT: PuzzleDraft = {
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

const pending = (): PendingPuzzle => ({
  puzzle: buildPuzzle(DRAFT),
  risks: { '02': { level: 'medio', reason: 'randagi' } },
  meta: { generatedAt: '2026-10-02T00:00:00.000Z', model: 'test' },
});

let dir: string;
let server: Server;
let base: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'review-'));
  await mkdir(path.join(dir, 'pending'));
  const api = createApi({ dataDir: dir });
  server = createServer(
    (req, res) => void api(req, res, () => ((res.statusCode = 404), res.end())),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

const seed = async (p = pending()) => {
  await writeFile(path.join(dir, 'pending', `${p.puzzle.id}.json`), JSON.stringify(p));
  return p;
};
const post = (url: string, body?: unknown) =>
  fetch(base + url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

describe('API di revisione', () => {
  it('GET /api/state elenca i pending e i conteggi', async () => {
    const p = await seed();
    const s = (await (await fetch(`${base}/api/state`)).json()) as {
      pending: PendingPuzzle[];
      approved: number;
      rejected: number;
    };
    expect(s.pending.map((x) => x.puzzle.id)).toEqual([p.puzzle.id]);
    expect([s.approved, s.rejected]).toEqual([0, 0]);
  });

  it('approva: scrive in approved/ e rimuove da pending/', async () => {
    const p = await seed();
    expect((await post(`/api/approve/${p.puzzle.id}`)).status).toBe(200);
    expect(await readdir(path.join(dir, 'pending'))).toEqual([]);
    const saved = JSON.parse(
      await readFile(path.join(dir, 'approved', `${p.puzzle.id}.json`), 'utf8'),
    );
    expect(saved).toEqual(p.puzzle);
  });

  it('scarta: accoda il motivo a rejected.log.jsonl e rimuove da pending/', async () => {
    const p = await seed();
    expect((await post(`/api/reject/${p.puzzle.id}`, { reason: 'ambiguo' })).status).toBe(200);
    const lines = (await readFile(path.join(dir, 'rejected.log.jsonl'), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({
      id: p.puzzle.id,
      reason: 'ambiguo',
      theme: 'animali',
    });
    expect(await readdir(path.join(dir, 'pending'))).toEqual([]);
    const s = (await (await fetch(`${base}/api/state`)).json()) as { rejected: number };
    expect(s.rejected).toBe(1);
  });

  it('rifiuta motivi sconosciuti e id malformati', async () => {
    const p = await seed();
    expect((await post(`/api/reject/${p.puzzle.id}`, { reason: 'boh' })).status).toBe(400);
    expect((await post('/api/approve/..%2F..%2Fetc')).status).toBe(400);
    expect((await post('/api/approve/p-inesistente')).status).toBe(404);
  });

  it('PUT salva un puzzle modificato; con id nuovo sostituisce il vecchio file', async () => {
    const p = await seed();
    const edited = buildPuzzle({
      ...DRAFT,
      relations: DRAFT.relations.map((r) =>
        r.a === 2 && r.b === 3 ? { ...r, rel: 'NESSUNO' as const } : r,
      ),
    });
    expect(edited.id).not.toBe(p.puzzle.id);
    const res = await fetch(`${base}/api/pending/${p.puzzle.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...p, puzzle: edited }),
    });
    expect(res.status).toBe(200);
    expect(await readdir(path.join(dir, 'pending'))).toEqual([`${edited.id}.json`]);
  });

  it('PUT rifiuta un puzzle logicamente non valido', async () => {
    const p = await seed();
    const broken = structuredClone(p);
    broken.puzzle.relations[0]!.rel = 'NESSUNO'; // incoerente con le altre relazioni
    const res = await fetch(`${base}/api/pending/${p.puzzle.id}`, {
      method: 'PUT',
      body: JSON.stringify(broken),
    });
    expect(res.status).toBe(422);
    expect(await readdir(path.join(dir, 'pending'))).toEqual([`${p.puzzle.id}.json`]);
  });
});
