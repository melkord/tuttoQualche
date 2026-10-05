import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export interface SwFile {
  /** Percorso pubblico, es. "/puzzles/p-abc.json". */
  path: string;
  /** Impronta del contenuto: cambia se e solo se il file cambia. */
  revision: string;
}

const IGNORED = new Set(['sw.js', '.DS_Store', '_redirects', '_headers']);

const hash = (data: string | Buffer) => createHash('sha1').update(data).digest('hex').slice(0, 10);

/** Tutti i file della build (esclusi sw.js e le source map), ordinati, con la loro revisione. */
export function collectFiles(distDir: string): SwFile[] {
  const out: SwFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (!IGNORED.has(name) && !name.endsWith('.map')) {
        const rel = path.relative(distDir, full).split(path.sep).join('/');
        out.push({ path: `/${rel}`, revision: hash(readFileSync(full)) });
      }
    }
  };
  walk(distDir);
  return out;
}

/** Versione complessiva: cambia quando cambia anche un solo file. */
export const versionOf = (files: readonly SwFile[]) =>
  hash(files.map((f) => `${f.path}:${f.revision}`).join('|'));

/** Inserisce la tabella dei file nel template del service worker. */
export function renderSw(template: string, files: readonly SwFile[]): string {
  const table = Object.fromEntries(files.map((f) => [f.path, f.revision]));
  if (!template.includes('/*__TABLE__*/ {}') || !template.includes("'/*__VERSION__*/'")) {
    throw new Error('Template del service worker senza segnaposto');
  }
  return template
    .replace('/*__TABLE__*/ {}', JSON.stringify(table, null, 2))
    .replace("'/*__VERSION__*/'", JSON.stringify(versionOf(files)));
}
