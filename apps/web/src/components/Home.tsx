import { isDone, isUnlocked, starsFor } from '../lib/levels';
import type { LevelEntry, LevelIndex } from '../lib/puzzles';
import type { Store } from '../lib/storage';
import { useI18n } from '../i18n';
import { capitalize, themeIcon } from '../lib/text';

interface Props {
  index: LevelIndex;
  store: Store;
  next: LevelEntry | null;
  onPlay: (id: string) => void;
  onTheme: (theme: string) => void;
}

/** Nome del tema nella lingua corrente (ripiego sul nome italiano, che è anche la chiave). */
export function useThemeName() {
  const { lang } = useI18n();
  return (index: LevelIndex, theme: string) =>
    capitalize(index.themes.find((t) => t.theme === theme)?.names?.[lang] ?? theme);
}

export function Home({ index, store, next, onPlay, onTheme }: Props) {
  const { t } = useI18n();
  const themeName = useThemeName();
  const started = Object.keys(store.progress).length > 0;
  return (
    <div className="home">
      {next ? (
        <section className="hero">
          <p className="hero__eyebrow">{started ? t.home.continue : t.home.start}</p>
          <h2>
            {themeIcon(next.theme)} {t.levelTitle(themeName(index, next.theme), next.level)}
          </h2>
          <p className="hero__meta">
            <span className={`chip chip--${next.difficulty}`}>{t.difficulty[next.difficulty]}</span>
          </p>
          <button className="btn btn--primary btn--lg" onClick={() => onPlay(next.id)}>
            {store.progress[next.id] ? t.home.resume : t.home.play}
          </button>
        </section>
      ) : (
        <section className="hero">
          <p className="hero__eyebrow">{t.home.congrats}</p>
          <h2>{t.home.allDone}</h2>
          <p className="lead">{t.home.soon}</p>
        </section>
      )}

      <h3 className="section-title">{t.home.themes}</h3>
      <ul className="themes">
        {index.themes.map((th) => {
          const done = th.levels.filter((l) => isDone(store, l.id)).length;
          return (
            <li key={th.theme}>
              <button className="theme" onClick={() => onTheme(th.theme)}>
                <span className="theme__icon">{themeIcon(th.theme)}</span>
                <span className="theme__body">
                  <strong>{themeName(index, th.theme)}</strong>
                  <small>{t.home.levelsCount(done, th.levels.length)}</small>
                  <span className="bar">
                    <span style={{ width: `${(done / th.levels.length) * 100}%` }} />
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
  const { t } = useI18n();
  const themeName = useThemeName();
  const th = index.themes.find((x) => x.theme === theme);
  if (!th) return <p className="empty">{t.home.themeNotFound}</p>;
  return (
    <div className="levels">
      <h2>
        {themeIcon(th.theme)} {themeName(index, th.theme)}
      </h2>
      <ul className="level-grid">
        {th.levels.map((l) => {
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
                aria-label={locked ? t.levelLocked(l.level) : t.levelLabel(l.level)}
              >
                <b>{l.level}</b>
                <small>
                  {locked ? '🔒' : stars > 0 ? '★'.repeat(stars) : t.difficulty[l.difficulty]}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
