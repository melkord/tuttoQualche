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

const SAMPLE = [
  {
    sym: '⊂',
    name: 'Tutti',
    text: 'Un cerchio sta tutto dentro l’altro (tutti i cani sono mammiferi).',
  },
  {
    sym: '∩',
    name: 'Alcuni',
    text: 'Si sovrappongono solo in parte (alcuni mammiferi sono animali domestici).',
  },
  { sym: '∅', name: 'Nessuno', text: 'Separati, senza toccarsi (nessun cane è un pesce).' },
  { sym: '=', name: 'Uguali', text: 'Un cerchio sopra l’altro, della stessa misura.' },
];

export function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Come si gioca" onClose={onClose}>
      <p className="lead">
        Ogni puzzle ha <b>4 concetti</b>. Costruisci il diagramma: <b>trascina</b> i cerchi e{' '}
        <b>ridimensionali</b> con la maniglia numerata, così che rappresentino come sono legati i
        concetti tra loro.
      </p>
      <ul className="howto">
        {SAMPLE.map((s) => (
          <li key={s.name}>
            <span className="howto__sym">{s.sym}</span>
            <span>
              <b>{s.name}.</b> {s.text}
            </span>
          </li>
        ))}
      </ul>
      <p className="lead">
        Premi <b>Controlla</b>: ti diciamo quali coppie sono sbagliate. Quando il diagramma è
        giusto, rispondi a <b>3 domande vero/falso</b>. Un nuovo puzzle ogni giorno!
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
  const labels = ['1', '2', '3', '4+'];
  return (
    <Modal title="Statistiche" onClose={onClose}>
      <div className="stats-grid">
        <div>
          <b>{s.played}</b>
          <span>giocati</span>
        </div>
        <div>
          <b>{s.winRate}%</b>
          <span>risolti</span>
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
      <h3 className="section-title">Tentativi per il diagramma</h3>
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
