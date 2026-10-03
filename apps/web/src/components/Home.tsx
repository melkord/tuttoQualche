import type { LevelEntry, LevelIndex } from '../lib/puzzles';
import type { Store } from '../lib/storage';
import { capitalize, themeIcon } from '../lib/text';

const DIFF_LABEL = { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' } as const;

export const isDone = (store: Store, id: string) => store.progress[id]?.phase === 'done';
export const isSolved = (store: Store, id: string) =>
  !!store.progress[id]?.solved && isDone(store, id);

interface Props {
  index: LevelIndex;
  store: Store;
  daily: LevelEntry | null;
  onPlay: (id: string) => void;
  onTheme: (theme: string) => void;
}

export function Home({ index, store, daily, onPlay, onTheme }: Props) {
  return (
    <div className="home">
      {daily && (
        <section className="hero">
          <p className="hero__eyebrow">Sfida del giorno</p>
          <h2>
            {themeIcon(daily.theme)} {capitalize(daily.theme)} · livello {daily.level}
          </h2>
          <p className="hero__meta">
            <span className={`chip chip--${daily.difficulty}`}>{DIFF_LABEL[daily.difficulty]}</span>
            {isDone(store, daily.id) && <span className="chip chip--ok">Completata ✓</span>}
          </p>
          <button className="btn btn--primary btn--lg" onClick={() => onPlay(daily.id)}>
            {isDone(store, daily.id) ? 'Rivedi' : store.progress[daily.id] ? 'Continua' : 'Gioca'}
          </button>
        </section>
      )}

      <h3 className="section-title">Temi</h3>
      <ul className="themes">
        {index.themes.map((t) => {
          const done = t.levels.filter((l) => isDone(store, l.id)).length;
          return (
            <li key={t.theme}>
              <button className="theme" onClick={() => onTheme(t.theme)}>
                <span className="theme__icon">{themeIcon(t.theme)}</span>
                <span className="theme__body">
                  <strong>{capitalize(t.theme)}</strong>
                  <small>
                    {done} / {t.levels.length} livelli
                  </small>
                  <span className="bar">
                    <span style={{ width: `${(done / t.levels.length) * 100}%` }} />
                  </span>
                </span>
                <span className="theme__go">›</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ThemeLevels({
  theme,
  index,
  store,
  onPlay,
}: {
  theme: string;
  index: LevelIndex;
  store: Store;
  onPlay: (id: string) => void;
}) {
  const t = index.themes.find((x) => x.theme === theme);
  if (!t) return <p className="empty">Tema non trovato.</p>;
  return (
    <div className="levels">
      <h2>
        {themeIcon(t.theme)} {capitalize(t.theme)}
      </h2>
      <ul className="level-grid">
        {t.levels.map((l) => {
          const state = isSolved(store, l.id)
            ? 'solved'
            : isDone(store, l.id)
              ? 'done'
              : store.progress[l.id]
                ? 'started'
                : '';
          return (
            <li key={l.id}>
              <button
                className={`level level--${l.difficulty} ${state}`}
                onClick={() => onPlay(l.id)}
              >
                <b>{l.level}</b>
                <small>
                  {state === 'solved' ? '✓' : state === 'done' ? '•' : DIFF_LABEL[l.difficulty]}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
