import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { collectFiles, renderSw } from './build-sw';

/** A fine build genera dist/sw.js con l'elenco di tutti i file da precaricare (livelli inclusi). */
export function swPlugin(): Plugin {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'eulero-sw',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      root = config.root;
    },
    closeBundle() {
      const template = readFileSync(path.join(root, 'pwa/sw-template.js'), 'utf8');
      const files = collectFiles(outDir);
      writeFileSync(path.join(outDir, 'sw.js'), renderSw(template, files));
      const levels = files.filter((f) => /^\/puzzles\/p-/.test(f.path)).length;
      console.log(`sw.js: ${files.length} file precaricati (${levels} livelli)`);
    },
  };
}
