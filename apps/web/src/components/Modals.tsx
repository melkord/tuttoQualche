import type { ReactNode } from 'react';
import { summarize } from '../lib/storage';
import type { Store } from '../lib/storage';
import { computeStreak } from '../lib/storage';
import { todayLocal } from '../lib/date';
import { Rich, useI18n } from '../i18n';

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function HowTo({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal title={t.howto.title} onClose={onClose}>
      <p className="lead">
        <Rich text={t.howto.intro} />
      </p>
      <ul className="howto">
        <li>
          <span className="howto__sym">⊂</span>
          <span>
            <Rich text={t.howto.inside} />
          </span>
        </li>
        <li>
          <span className="howto__sym">∩</span>
          <span>
            <Rich text={t.howto.overlap} />
          </span>
        </li>
        <li>
          <span className="howto__sym">∅</span>
          <span>
            <Rich text={t.howto.apart} />
          </span>
        </li>
      </ul>
      <p className="lead">
        <Rich text={t.howto.outro} />
      </p>
      <button className="btn btn--primary btn--block" onClick={onClose}>
        {t.howto.ok}
      </button>
    </Modal>
  );
}

export function Stats({ store, onClose }: { store: Store; onClose: () => void }) {
  const { t } = useI18n();
  const s = summarize(store);
  const streak = computeStreak(store.finishedDays, todayLocal());
  const max = Math.max(1, ...s.distribution);
  const labels = ['0', '1', '2', '3+'];
  return (
    <Modal title={t.statsModal.title} onClose={onClose}>
      <div className="stats-grid">
        <div>
          <b>{s.played}</b>
          <span>{t.statsModal.played}</span>
        </div>
        <div>
          <b>{s.perfectRate}%</b>
          <span>{t.statsModal.perfect}</span>
        </div>
        <div>
          <b>{streak.current}</b>
          <span>{t.statsModal.streak}</span>
        </div>
        <div>
          <b>{streak.best}</b>
          <span>{t.statsModal.best}</span>
        </div>
      </div>
      <h3 className="section-title">{t.statsModal.dist}</h3>
      <ul className="dist">
        {s.distribution.map((n, i) => (
          <li key={i}>
            <span>{labels[i]}</span>
            <div className="dist__bar" style={{ width: `${Math.max(8, (n / max) * 100)}%` }}>
              {n}
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
