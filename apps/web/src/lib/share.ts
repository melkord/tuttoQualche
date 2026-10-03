import type { Progress } from './storage';
import { starsOf, totalErrors } from './storage';

/** Testo condivisibile: stelle, poi una riga per passo con 🟥 per ogni errore e 🟩 alla risposta giusta. */
export function buildShareText(opts: { title: string; progress: Progress; url: string }): string {
  const { progress } = opts;
  const stars = starsOf(progress);
  const lines = [`Eulero · ${opts.title}`, '⭐'.repeat(stars) + '☆'.repeat(3 - stars), ''];
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
