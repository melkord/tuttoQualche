import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildMatrix, layoutCircles } from '@tuttialcuni/core';
import type { Circle, Puzzle } from '@tuttialcuni/core';
import { Home, ThemeLevels } from './components/Home';
import { HowTo, Stats } from './components/Modals';
import { Play } from './components/Play';
import { Result } from './components/Result';
import { todayLocal } from './lib/date';
import { dailyEntry, fetchIndex, fetchPuzzle } from './lib/puzzles';
import type { LevelEntry, LevelIndex } from './lib/puzzles';
import { computeStreak, emptyProgress, finishPuzzle, loadStore, saveStore } from './lib/storage';
import type { Progress, Store } from './lib/storage';
import { capitalize } from './lib/text';

type Route = { name: 'home' } | { name: 'theme'; theme: string } | { name: 'play'; id: string };

function parseHash(hash: string): Route {
  const [, kind, ...rest] = hash.replace(/^#/, '').split('/');
  const arg = decodeURIComponent(rest.join('/'));
  if (kind === 't' && arg) return { name: 'theme', theme: arg };
  if (kind === 'p' && arg) return { name: 'play', id: arg };
  return { name: 'home' };
}

const go = (hash: string) => {
  window.location.hash = hash;
};

function Logo({ small }: { small?: boolean }) {
  return (
    <svg className={small ? 'logo logo--sm' : 'logo'} viewBox="0 0 32 32" aria-hidden>
      <circle cx="12" cy="13" r="9" fill="#ff5c93" fillOpacity=".85" />
      <circle cx="20" cy="13" r="9" fill="#4cc9f0" fillOpacity=".85" />
      <circle cx="16" cy="21" r="9" fill="#9b7bff" fillOpacity=".85" />
    </svg>
  );
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [index, setIndex] = useState<LevelIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store>(() => loadStore());
  const [modal, setModal] = useState<'howto' | 'stats' | null>(() =>
    loadStore().seenHowTo ? null : 'howto',
  );
  const today = todayLocal();

  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    fetchIndex().then(setIndex, (e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    saveStore(store);
  }, [store]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const closeHowTo = () => {
    setStore((s) => ({ ...s, seenHowTo: true }));
    setModal(null);
  };

  const streak = computeStreak(store.finishedDays, today).current;
  const daily = useMemo(() => (index ? dailyEntry(index, today) : null), [index, today]);

  const allEntries = useMemo(() => index?.themes.flatMap((t) => t.levels) ?? [], [index]);
  const entryOf = (id: string): LevelEntry | undefined => allEntries.find((l) => l.id === id);

  const back =
    route.name === 'play'
      ? () => {
          const e = entryOf(route.id);
          go(e ? `#/t/${encodeURIComponent(e.theme)}` : '#/');
        }
      : route.name === 'theme'
        ? () => go('#/')
        : null;

  const title =
    route.name === 'play'
      ? (() => {
          const e = entryOf(route.id);
          return e ? `${capitalize(e.theme)} · livello ${e.level}` : 'TuttiAlcuni';
        })()
      : null;

  return (
    <div className="app">
      <header className="top">
        {back ? (
          <button className="icon-btn" onClick={back} aria-label="Indietro">
            ‹
          </button>
        ) : (
          <div className="brand">
            <Logo small />
            <h1>
              Tutti<span>Alcuni</span>
            </h1>
          </div>
        )}
        {title && <span className="top__title">{title}</span>}
        <div className="top__right">
          {streak > 0 && (
            <span className="streak" title="Giorni consecutivi">
              🔥 {streak}
            </span>
          )}
          <button className="icon-btn" onClick={() => setModal('stats')} aria-label="Statistiche">
            📊
          </button>
          <button className="icon-btn" onClick={() => setModal('howto')} aria-label="Come si gioca">
            ?
          </button>
        </div>
      </header>

      <main className="content">
        {error ? (
          <p className="empty">Impossibile caricare i livelli: {error}</p>
        ) : !index ? (
          <p className="empty">Carico…</p>
        ) : index.themes.length === 0 ? (
          <p className="empty">Nessun livello disponibile, torna presto!</p>
        ) : route.name === 'home' ? (
          <Home
            index={index}
            store={store}
            daily={daily}
            onPlay={(id) => go(`#/p/${id}`)}
            onTheme={(t) => go(`#/t/${encodeURIComponent(t)}`)}
          />
        ) : route.name === 'theme' ? (
          <ThemeLevels
            theme={route.theme}
            index={index}
            store={store}
            onPlay={(id) => go(`#/p/${id}`)}
          />
        ) : (
          <PlayScreen
            key={route.id}
            id={route.id}
            entry={entryOf(route.id)}
            next={nextEntry(allEntries, route.id)}
            store={store}
            setStore={setStore}
            streak={streak}
            today={today}
          />
        )}
      </main>

      {modal === 'howto' && <HowTo onClose={closeHowTo} />}
      {modal === 'stats' && <Stats store={store} onClose={() => setModal(null)} />}
    </div>
  );
}

/** Livello successivo nello stesso tema, se esiste. */
function nextEntry(all: LevelEntry[], id: string): LevelEntry | null {
  const cur = all.find((l) => l.id === id);
  if (!cur) return null;
  return all.find((l) => l.theme === cur.theme && l.level === cur.level + 1) ?? null;
}

interface PlayScreenProps {
  id: string;
  entry: LevelEntry | undefined;
  next: LevelEntry | null;
  store: Store;
  setStore: (f: (s: Store) => Store) => void;
  streak: number;
  today: string;
}

function PlayScreen({ id, entry, next, store, setStore, streak, today }: PlayScreenProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalCircles, setFinalCircles] = useState<Circle[] | null>(null);

  useEffect(() => {
    fetchPuzzle(id).then(setPuzzle, (e: Error) => setError(e.message));
  }, [id]);

  const progress: Progress = store.progress[id] ?? emptyProgress();

  const onProgress = useCallback(
    (p: Progress) => setStore((s) => ({ ...s, progress: { ...s.progress, [id]: p } })),
    [id, setStore],
  );
  const onFinish = useCallback(
    (p: Progress, circles: Circle[]) => {
      setFinalCircles(circles);
      setStore((s) => finishPuzzle(s, id, p, today));
    },
    [id, setStore, today],
  );

  const solution = useMemo(() => {
    if (!puzzle) return null;
    const m = buildMatrix(puzzle.relations).matrix;
    return m ? layoutCircles(m) : null;
  }, [puzzle]);

  if (error) return <p className="empty">{error}</p>;
  if (!puzzle || !entry) return <p className="empty">Carico…</p>;

  if (progress.phase === 'done') {
    return (
      <Result
        puzzle={puzzle}
        entry={entry}
        progress={progress}
        circles={finalCircles ?? solution}
        streak={streak}
        onHome={() => go('#/')}
        onNext={next ? () => go(`#/p/${next.id}`) : null}
      />
    );
  }
  return <Play puzzle={puzzle} progress={progress} onProgress={onProgress} onFinish={onFinish} />;
}
