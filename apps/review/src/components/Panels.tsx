import type { RejectReason } from '../api';

export const REASONS: { key: string; reason: RejectReason; hint: string; icon: string }[] = [
  { key: '1', reason: 'ambiguo', hint: 'Una relazione è discutibile', icon: '🌫️' },
  { key: '2', reason: 'troppo facile', hint: 'Nessuna sfida', icon: '🥱' },
  { key: '3', reason: 'concetti deboli', hint: 'Categorie poco interessanti', icon: '🫥' },
];

export function RejectPanel({
  onPick,
  onCancel,
}: {
  onPick: (r: RejectReason) => void;
  onCancel: () => void;
}) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Perché lo scarti?</h3>
        <div className="sheet__options">
          {REASONS.map((r) => (
            <button key={r.key} className="option" onClick={() => onPick(r.reason)}>
              <kbd>{r.key}</kbd>
              <span className="option__icon">{r.icon}</span>
              <span>
                <strong>{r.reason}</strong>
                <small>{r.hint}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="sheet__hint">
          <kbd>Esc</kbd> annulla
        </p>
      </div>
    </div>
  );
}
