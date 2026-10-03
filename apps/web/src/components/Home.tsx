import { isDone, isUnlocked, starsFor } from '../lib/levels';
import type { LevelEntry, LevelIndex } from '../lib/puzzles';
import type { Store } from '../lib/storage';
import { capitalize, themeIcon } from '../lib/text';

const DIFF_LABEL = { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' } as const;

interface Props {
  index: LevelIndex;
  store: Store;
  next: LevelEntry | null;
  onPlay: (id: string) => void;
  onTheme: (theme: string) => void;
}

export function Home({ index, store, next, onPlay, onTheme }: Props) {
  const started = Object.keys(store.progress).length > 0;
  return (
    <div className="home">
      {next ? (
        <section className="hero">
          <p className="hero__eyebrow">{started ? 'Continua' : 'Inizia da qui'}</p>
          <h2>
            {themeIcon(next.theme)} {capitalize(next.theme)} · livello {next.level}
          </h2>
          <p className="hero__meta">
            <span className={`chip chip--${next.difficulty}`}>{DIFF_LABEL[next.difficulty]}</span>
          </p>
          <button className="btn btn--primary btn--lg" onClick={() => onPlay(next.id)}>
            {store.progress[next.id] ? 'Riprendi' : 'Gioca'}
          </button>
        </section>
      ) : (
        <section className="hero">
          <p className="hero__eyebrow">Complimenti</p>
          <h2>🎉 Hai completato tutti i livelli</h2>
          <p className="lead">Nuovi puzzle in arrivo.</p>
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
          const locked = !isUnlocked(index, store, l.id);
          const stars = starsFor(store, l.id);
          const state = locked
            ? 'locked'
            : stars === 3
              ? 'perfect'
              : stars > 0
                ? 'done'
                : store.progress[l.id]
                  ? 'started'
                  : '';
          return (
            <li key={l.id}>
              <button
                className={`level level--${l.difficulty} ${state}`}
                disabled={locked}
                onClick={() => onPlay(l.id)}
                aria-label={`Livello ${l.level}${locked ? ' (bloccato)' : ''}`}
              >
                <b>{l.level}</b>
                <small>
                  {locked ? '🔒' : stars > 0 ? '★'.repeat(stars) : DIFF_LABEL[l.difficulty]}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
