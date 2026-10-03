import type { Progress } from './storage';

/** Testo condivisibile stile Wordle: una riga di quadrati per tentativo + riga domande. */
export function buildShareText(opts: {
  /** Es. "Animali · livello 3". */
  title: string;
  progress: Progress;
  url: string;
}): string {
  const { progress } = opts;
  const lines = [`TuttiAlcuni · ${opts.title}`, ''];
  for (const attempt of progress.attempts) {
    lines.push(attempt.map((ok) => (ok ? '🟩' : '🟥')).join(''));
  }
  if (progress.gaveUp) lines.push('🏳️ Soluzione svelata');
  if (progress.answers.length > 0) {
    lines.push(`❓ ${progress.answers.map((ok) => (ok ? '✅' : '❌')).join('')}`);
  }
  lines.push('', opts.url);
  return lines.join('\n');
}

export async function shareResult(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'failed';
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
