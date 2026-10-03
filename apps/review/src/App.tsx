import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildMatrix, buildPuzzle, layoutCircles, RELATIONS, validateDraft } from '@eulero/core';
import type { Circle, PendingPuzzle, PuzzleDraft, Relation } from '@eulero/core';
import { api } from './api';
import type { RejectReason, ReviewState } from './api';
import { Card } from './components/Card';
import { REASONS, RejectPanel } from './components/Panels';

type Mode = 'browse' | 'reject' | 'edit';
interface Toast {
  text: string;
  kind: 'ok' | 'bad' | 'info';
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden>
      <circle cx="12" cy="13" r="9" fill="#ff5c93" fillOpacity=".85" />
      <circle cx="20" cy="13" r="9" fill="#4cc9f0" fillOpacity=".85" />
      <circle cx="16" cy="21" r="9" fill="#9b7bff" fillOpacity=".85" />
    </svg>
  );
}

function draftOf(item: PendingPuzzle, rels: Relation[]): PuzzleDraft {
  return {
    theme: item.puzzle.theme,
    concepts: item.puzzle.concepts,
    relations: item.puzzle.relations.map((r, k) => ({ a: r.a, b: r.b, rel: rels[k] as Relation })),
  };
}

export function App() {
  const [state, setState] = useState<ReviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('browse');
  const [edit, setEdit] = useState<{ rels: Relation[]; sel: number } | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const lastLayout = useRef<Circle[] | null>(null);

  useEffect(() => {
    api.state().then(setState, (e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const pending = state?.pending ?? [];
  const current: PendingPuzzle | undefined = pending[Math.min(idx, pending.length - 1)];

  // Diagramma del puzzle corrente (o dell'anteprima di modifica, se valida).
  const editReport = useMemo(
    () => (current && edit ? validateDraft(draftOf(current, edit.rels)) : null),
    [current, edit],
  );
  const circles = useMemo(() => {
    if (!current) return null;
    if (editReport) return editReport.ok ? (editReport.layout ?? null) : lastLayout.current;
    const m = buildMatrix(current.puzzle.relations).matrix;
    return m ? layoutCircles(m) : null;
  }, [current, editReport]);
  useEffect(() => {
    if (circles) lastLayout.current = circles;
  }, [circles]);

  const remove = useCallback((id: string, patch: Partial<ReviewState>) => {
    setState((s) =>
      s ? { ...s, ...patch, pending: s.pending.filter((p) => p.puzzle.id !== id) } : s,
    );
  }, []);

  const guard = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Errore', kind: 'bad' });
    } finally {
      setBusy(false);
    }
  }, []);

  const approve = useCallback(() => {
    if (!current || !state) return;
    void guard(async () => {
      await api.approve(current.puzzle.id);
      remove(current.puzzle.id, { approved: state.approved + 1 });
      setToast({ text: 'Approvato ✓', kind: 'ok' });
    });
  }, [current, state, guard, remove]);

  const reject = useCallback(
    (reason: RejectReason) => {
      if (!current || !state) return;
      setMode('browse');
      void guard(async () => {
        await api.reject(current.puzzle.id, reason);
        remove(current.puzzle.id, { rejected: state.rejected + 1 });
        setToast({ text: `Scartato · ${reason}`, kind: 'bad' });
      });
    },
    [current, state, guard, remove],
  );

  const startEdit = useCallback(() => {
    if (!current) return;
    setEdit({ rels: current.puzzle.relations.map((r) => r.rel), sel: 0 });
    setMode('edit');
  }, [current]);

  const cancelEdit = useCallback(() => {
    setEdit(null);
    setMode('browse');
  }, []);

  const saveEdit = useCallback(() => {
    if (!current || !edit || !editReport?.ok) return;
    void guard(async () => {
      const puzzle = buildPuzzle(draftOf(current, edit.rels));
      const risks = { ...current.risks };
      puzzle.relations.forEach((r, k) => {
        if (r.rel !== current.puzzle.relations[k]?.rel) {
          risks[`${r.a}${r.b}`] = { level: 'basso', reason: 'Modificata a mano in revisione.' };
        }
      });
      const saved = await api.save(current.puzzle.id, { ...current, puzzle, risks });
      setState((s) =>
        s
          ? { ...s, pending: s.pending.map((p) => (p.puzzle.id === current.puzzle.id ? saved : p)) }
          : s,
      );
      setEdit(null);
      setMode('browse');
      setToast({ text: 'Modifica salvata e rivalidata ✓', kind: 'info' });
    });
  }, [current, edit, editReport, guard]);

  const go = useCallback(
    (d: number) => setIdx((i) => Math.max(0, Math.min(pending.length - 1, i + d))),
    [pending.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || busy) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (mode === 'reject') {
        const hit = REASONS.find((r) => r.key === k);
        if (hit) reject(hit.reason);
        else if (k === 'Escape') setMode('browse');
        else return;
        e.preventDefault();
        return;
      }
      if (mode === 'edit' && edit) {
        const relIdx = (r: Relation) => RELATIONS.indexOf(r);
        if (k === 'Escape') cancelEdit();
        else if (k === 'Enter') saveEdit();
        else if (k === 'ArrowUp') setEdit({ ...edit, sel: (edit.sel + 5) % 6 });
        else if (k === 'ArrowDown') setEdit({ ...edit, sel: (edit.sel + 1) % 6 });
        else if (k === 'ArrowLeft' || k === 'ArrowRight') {
          const cur = relIdx(edit.rels[edit.sel] as Relation);
          const next = RELATIONS[
            (cur + (k === 'ArrowRight' ? 1 : RELATIONS.length - 1)) % RELATIONS.length
          ] as Relation;
          setEdit({ ...edit, rels: edit.rels.map((r, i) => (i === edit.sel ? next : r)) });
        } else return;
        e.preventDefault();
        return;
      }
      if (k === 'a') approve();
      else if (k === 's') setMode('reject');
      else if (k === 'e') startEdit();
      else if (k === 'ArrowLeft') go(-1);
      else if (k === 'ArrowRight') go(1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, edit, busy, approve, reject, startEdit, cancelEdit, saveEdit, go]);

  if (error) {
    return (
      <div className="screen">
        <p className="empty">Impossibile leggere i dati: {error}</p>
      </div>
    );
  }
  if (!state) return <div className="screen" />;

  const total = pending.length + state.approved + state.rejected;
  const done = state.approved + state.rejected;
  const position = Math.min(idx, pending.length - 1) + 1;

  return (
    <div className="screen">
      <header className="top">
        <div className="brand">
          <Logo />
          <div>
            <h1>
              Eu<span>lero</span>
            </h1>
            <p>Revisione puzzle</p>
          </div>
        </div>
        <div className="stats">
          <div className="stat stat--ok">
            <b>{state.approved}</b> approvati
          </div>
          <div className="stat stat--bad">
            <b>{state.rejected}</b> scartati
          </div>
          <div className="stat">
            <b>{pending.length}</b> da vedere
          </div>
        </div>
      </header>
      <div className="progress" aria-label="Avanzamento">
        <div
          className="progress__bar"
          style={{ width: `${total ? (done / total) * 100 : 100}%` }}
        />
      </div>

      {current ? (
        <main className="main">
          <div className="nav">
            <button
              className="nav__btn"
              onClick={() => go(-1)}
              disabled={position <= 1}
              aria-label="Precedente"
            >
              ‹
            </button>
            <span className="nav__pos">
              {position} <i>/</i> {pending.length}
            </span>
            <button
              className="nav__btn"
              onClick={() => go(1)}
              disabled={position >= pending.length}
              aria-label="Successivo"
            >
              ›
            </button>
          </div>
          <Card
            key={current.puzzle.id}
            item={current}
            circles={circles}
            hover={hover}
            onHover={setHover}
            edit={edit}
            editIssues={editReport?.issues ?? []}
            editValid={!!editReport?.ok}
            onEditSelect={(k) => edit && setEdit({ ...edit, sel: k })}
            onEditChange={(k, rel) =>
              edit &&
              setEdit({ ...edit, sel: k, rels: edit.rels.map((r, i) => (i === k ? rel : r)) })
            }
          />
        </main>
      ) : (
        <main className="main main--done">
          <div className="done">
            <Logo />
            <h2>Revisione completata</h2>
            <p>
              {state.approved} approvati · {state.rejected} scartati. Genera altri puzzle o passa
              allo scheduling.
            </p>
          </div>
        </main>
      )}

      <footer className="keys">
        {mode === 'edit' ? (
          <>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> coppia
            </span>
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd> relazione
            </span>
            <span>
              <kbd>Invio</kbd> salva
            </span>
            <span>
              <kbd>Esc</kbd> annulla
            </span>
          </>
        ) : (
          <>
            <button className="key key--ok" onClick={approve} disabled={!current}>
              <kbd>A</kbd> Approva
            </button>
            <button
              className="key key--bad"
              onClick={() => current && setMode('reject')}
              disabled={!current}
            >
              <kbd>S</kbd> Scarta
            </button>
            <button className="key key--edit" onClick={startEdit} disabled={!current}>
              <kbd>E</kbd> Modifica
            </button>
            <span className="keys__nav">
              <kbd>←</kbd>
              <kbd>→</kbd> naviga
            </span>
          </>
        )}
      </footer>

      {mode === 'reject' && <RejectPanel onPick={reject} onCancel={() => setMode('browse')} />}
      {toast && <div className={`toast toast--${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}
