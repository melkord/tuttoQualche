import type { PendingPuzzle } from '@tuttialcuni/core';

export type RejectReason = 'ambiguo' | 'troppo facile' | 'concetti deboli';

export interface ReviewState {
  pending: PendingPuzzle[];
  approved: number;
  rejected: number;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Errore ${res.status}`);
  return body;
}

export const api = {
  state: () => call<ReviewState>('/api/state'),
  approve: (id: string) => call<{ ok: true }>(`/api/approve/${id}`, { method: 'POST' }),
  reject: (id: string, reason: RejectReason) =>
    call<{ ok: true }>(`/api/reject/${id}`, { method: 'POST', body: JSON.stringify({ reason }) }),
  save: (oldId: string, pending: PendingPuzzle) =>
    call<PendingPuzzle>(`/api/pending/${oldId}`, { method: 'PUT', body: JSON.stringify(pending) }),
};
