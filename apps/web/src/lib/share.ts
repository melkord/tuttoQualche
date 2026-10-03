import type { Progress } from './storage';
import { totalErrors } from './storage';

/** Testo condivisibile stile Wordle: una riga per passo, 🟥 per ogni errore e 🟩 alla risposta giusta. */
export function buildShareText(opts: { title: string; progress: Progress; url: string }): string {
  const { progress } = opts;
  const lines = [`TuttiAlcuni · ${opts.title}`, ''];
  progress.errors.forEach((errors, i) => {
    lines.push(`${i + 1}  ${'🟥'.repeat(errors)}🟩`);
  });
  const n = totalErrors(progress);
  lines.push('', n === 0 ? '✨ Perfetto, zero errori' : `${n} ${n === 1 ? 'errore' : 'errori'}`);
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
