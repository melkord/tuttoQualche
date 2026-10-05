import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Puzzle } from '@eulero/core';
import { Home, ThemeLevels, useThemeName } from './components/Home';
import { HowTo, Stats } from './components/Modals';
import { Play } from './components/Play';
import { Result } from './components/Result';
import { todayLocal } from './lib/date';
import { continueEntry, isUnlocked, nextInTheme } from './lib/levels';
import { useI18n } from './i18n';
import { startPwa, usePwa } from './lib/pwa';
import { fetchIndex, fetchPuzzle, LoadError } from './lib/puzzles';
import type { LevelEntry, LevelIndex } from './lib/puzzles';
import { computeStreak, emptyProgress, finishPuzzle, loadStore, saveStore } from './lib/storage';
import type { Progress, Store } from './lib/storage';

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
  const { lang, setLang, t } = useI18n();
  const themeName = useThemeName();
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store>(() => loadStore());
  const [modal, setModal] = useState<'howto' | 'stats' | null>(() =>
    loadStore().seenHowTo ? null : 'howto',
  );
  const today = todayLocal();
  const pwa = usePwa();
  const [toast, setToast] = useState<string | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  // PWA: tiene il service worker aggiornato; a ogni versione nuova ricarica l'indice dei livelli
  // (dalla cache appena aggiornata) e avvisa se ci sono livelli nuovi.
  useEffect(() => {
    return startPwa((info) => {
      fetchIndex().then(setIndex, () => undefined);
      const { pwa: msg } = tRef.current; // lingua del momento in cui il worker è pronto
      setToast(info.first ? msg.ready : info.added > 0 ? msg.newLevels(info.added) : msg.updated);
    });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

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
  const next = useMemo(() => (index ? continueEntry(index, store) : null), [index, store]);

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
          return e && index ? t.levelTitle(themeName(index, e.theme), e.level) : 'Eulero';
        })()
      : null;

  return (
    <div className="app">
      <header className="top">
        {back ? (
          <button className="icon-btn" onClick={back} aria-label={t.back}>
            ‹
          </button>
        ) : (
          <div className="brand">
            <Logo small />
            <h1>
              Eu<span>lero</span>
            </h1>
          </div>
        )}
        {title && <span className="top__title">{title}</span>}
        <div className="top__right">
          {!pwa.online && <span className="offline-chip">{t.pwa.offline}</span>}
          {streak > 0 && (
            <span className="streak" title={t.streakTitle}>
              🔥 {streak}
            </span>
          )}
          <button className="icon-btn" onClick={() => setModal('stats')} aria-label={t.stats}>
            📊
          </button>
          <button
            className="icon-btn icon-btn--lang"
            onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
            aria-label={`${t.language}: ${lang === 'it' ? 'English' : 'Italiano'}`}
            title={lang === 'it' ? 'English' : 'Italiano'}
          >
            {lang === 'it' ? 'EN' : 'IT'}
          </button>
          <button className="icon-btn" onClick={() => setModal('howto')} aria-label={t.howtoButton}>
            ?
          </button>
        </div>
      </header>

      <main className={route.name === 'play' ? 'content content--wide' : 'content'}>
        {error ? (
          <p className="empty">{t.loadError(error)}</p>
        ) : !index ? (
          <p className="empty">{t.loading}</p>
        ) : index.themes.length === 0 ? (
          <p className="empty">{t.noLevels}</p>
        ) : route.name === 'home' ? (
          <Home
            index={index}
            store={store}
            next={next}
            install={
              pwa.installed
                ? null
                : pwa.canPrompt
                  ? { kind: 'prompt', run: pwa.install }
                  : pwa.iosHint
                    ? { kind: 'ios' }
                    : null
            }
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
            index={index}
            store={store}
            setStore={setStore}
            streak={streak}
            today={today}
          />
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal === 'howto' && <HowTo onClose={closeHowTo} />}
      {modal === 'stats' && <Stats store={store} onClose={() => setModal(null)} />}
    </div>
  );
}

interface PlayScreenProps {
  id: string;
  entry: LevelEntry | undefined;
  index: LevelIndex;
  store: Store;
  setStore: (f: (s: Store) => Store) => void;
  streak: number;
  today: string;
}

function PlayScreen({ id, entry, index, store, setStore, streak, today }: PlayScreenProps) {
  const { t } = useI18n();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<LoadError | Error | null>(null);
  const unlocked = isUnlocked(index, store, id);

  useEffect(() => {
    if (!unlocked) {
      // livello bloccato (link diretto): si torna alla lista del tema
      go(entry ? `#/t/${encodeURIComponent(entry.theme)}` : '#/');
      return;
    }
    fetchPuzzle(id).then(setPuzzle, (e: Error) => setError(e));
  }, [id, unlocked, entry]);

  useEffect(() => {
    if (unlocked) setStore((s) => (s.lastPlayed === id ? s : { ...s, lastPlayed: id }));
  }, [id, unlocked, setStore]);

  const progress: Progress = store.progress[id] ?? emptyProgress();

  const onProgress = useCallback(
    (p: Progress) => setStore((s) => ({ ...s, progress: { ...s.progress, [id]: p } })),
    [id, setStore],
  );
  const onFinish = useCallback(
    (p: Progress) => setStore((s) => finishPuzzle(s, id, p, today)),
    [id, setStore, today],
  );

  if (error)
    return (
      <p className="empty">{error instanceof LoadError ? t.errors[error.code] : error.message}</p>
    );
  if (!puzzle || !entry) return <p className="empty">{t.loading}</p>;

  if (progress.phase === 'done') {
    const next = nextInTheme(index, id);
    return (
      <Result
        puzzle={puzzle}
        entry={entry}
        progress={progress}
        streak={streak}
        onHome={() => go('#/')}
        onNext={next ? () => go(`#/p/${next.id}`) : null}
      />
    );
  }
  return <Play puzzle={puzzle} progress={progress} onProgress={onProgress} onFinish={onFinish} />;
}
