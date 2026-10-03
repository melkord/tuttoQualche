import type { ReactNode } from 'react';
import { summarize } from '../lib/storage';
import type { Store } from '../lib/storage';
import { computeStreak } from '../lib/storage';
import { todayLocal } from '../lib/date';

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Come si gioca" onClose={onClose}>
      <p className="lead">
        Ogni livello ha <b>4 parole</b> e <b>3 domande</b>. Alla prima vedi due parole e scegli tra
        4 diagrammi quello che le rappresenta. Poi <b>si aggiunge una parola alla volta</b> e il
        diagramma cresce, fino a tutte e quattro.
      </p>
      <ul className="howto">
        <li>
          <span className="howto__sym">⊂</span>
          <span>
            <b>Dentro.</b> Se tutti gli elementi di un insieme sono anche nell’altro, il suo cerchio
            sta tutto dentro l’altro.
          </span>
        </li>
        <li>
          <span className="howto__sym">∩</span>
          <span>
            <b>Si sovrappongono.</b> Se hanno solo alcuni elementi in comune, i cerchi si
            intersecano in parte.
          </span>
        </li>
        <li>
          <span className="howto__sym">∅</span>
          <span>
            <b>Separati.</b> Se non hanno nulla in comune, i cerchi non si toccano.
          </span>
        </li>
      </ul>
      <p className="lead">
        Se sbagli ti spieghiamo perché e puoi riprovare, ma gli errori contano: <b>3 stelle</b>{' '}
        senza errori, <b>2</b> con al massimo due, <b>1</b> altrimenti. Completa un livello per
        sbloccare il successivo.
      </p>
      <button className="btn btn--primary btn--block" onClick={onClose}>
        Ho capito
      </button>
    </Modal>
  );
}

export function Stats({ store, onClose }: { store: Store; onClose: () => void }) {
  const s = summarize(store);
  const streak = computeStreak(store.finishedDays, todayLocal());
  const max = Math.max(1, ...s.distribution);
  const labels = ['0', '1', '2', '3+'];
  return (
    <Modal title="Statistiche" onClose={onClose}>
      <div className="stats-grid">
        <div>
          <b>{s.played}</b>
          <span>giocati</span>
        </div>
        <div>
          <b>{s.perfectRate}%</b>
          <span>perfetti</span>
        </div>
        <div>
          <b>{streak.current}</b>
          <span>serie</span>
        </div>
        <div>
          <b>{streak.best}</b>
          <span>record</span>
        </div>
      </div>
      <h3 className="section-title">Errori per livello</h3>
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
