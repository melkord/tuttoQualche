import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { AnthropicLlm, DEFAULT_MODEL } from './llm';
import { generateOne, loadSeenSignatures, writePending } from './pipeline';
import { THEMES } from './prompts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const { values } = parseArgs({
  options: {
    count: { type: 'string', short: 'n', default: '10' },
    theme: { type: 'string', short: 't' },
    model: { type: 'string', default: DEFAULT_MODEL },
    out: { type: 'string', default: path.join(root, 'data/pending') },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log('Uso: pnpm generate [--count 50] [--theme animali] [--model <id>] [--out <dir>]');
  process.exit(0);
}

const count = Number.parseInt(values.count ?? '10', 10);
if (!Number.isInteger(count) || count < 1) {
  console.error('--count deve essere un intero positivo');
  process.exit(1);
}

const llm = new AnthropicLlm(values.model);
const outDir = path.resolve(values.out ?? path.join(root, 'data/pending'));
const seen = await loadSeenSignatures([outDir, path.join(root, 'data/approved')]);

let produced = 0;
const skipped: Record<string, number> = {};
const maxAttempts = count * 3;

for (let attempt = 0; produced < count && attempt < maxAttempts; attempt++) {
  const theme = values.theme ?? (THEMES[attempt % THEMES.length] as string);
  try {
    const res = await generateOne(llm, { theme, seen });
    if (res.ok) {
      const file = await writePending(outDir, res.pending);
      produced++;
      const { puzzle, risks } = res.pending;
      const high = Object.values(risks).filter((r) => r.level === 'alto').length;
      console.log(
        `[${produced}/${count}] ${puzzle.concepts.map((c) => c.label).join(', ')} — ${puzzle.difficulty.level}, rischi alti: ${high} → ${path.relative(root, file)}`,
      );
    } else {
      skipped[res.reason] = (skipped[res.reason] ?? 0) + 1;
      console.warn(`scartato (${res.reason})${res.detail ? `: ${res.detail}` : ''}`);
    }
  } catch (e) {
    console.error('errore API:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

console.log(`\nGenerati ${produced}/${count}. Scartati: ${JSON.stringify(skipped)}`);
if (produced < count) process.exitCode = 2;
