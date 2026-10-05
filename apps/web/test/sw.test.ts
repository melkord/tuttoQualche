import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectFiles, renderSw, versionOf } from '../pwa/build-sw';

const TEMPLATE = "const TABLE = /*__TABLE__*/ {};\nconst VERSION = '/*__VERSION__*/';\n";
let dir: string;

const write = (rel: string, content: string) => {
  const full = path.join(dir, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
};

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'sw-'));
  write('index.html', '<html>');
  write('assets/index-abc.js', 'console.log(1)');
  write('puzzles/index.json', '{"themes":[]}');
  write('puzzles/p-aaa.json', '{"a":1}');
  write('sw.js', 'vecchio');
  write('assets/index.js.map', '{}');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('collectFiles', () => {
  it('elenca app e livelli, esclude sw.js e le source map, in ordine stabile', () => {
    const files = collectFiles(dir);
    expect(files.map((f) => f.path)).toEqual([
      '/assets/index-abc.js',
      '/index.html',
      '/puzzles/index.json',
      '/puzzles/p-aaa.json',
    ]);
    expect(collectFiles(dir)).toEqual(files);
  });

  it('la revisione cambia solo per il file modificato', () => {
    const before = collectFiles(dir);
    write('puzzles/p-aaa.json', '{"a":2}');
    const after = collectFiles(dir);
    const changed = after.filter((f, i) => f.revision !== before[i]!.revision).map((f) => f.path);
    expect(changed).toEqual(['/puzzles/p-aaa.json']);
  });

  it('un livello nuovo compare nell’elenco e cambia la versione', () => {
    const v1 = versionOf(collectFiles(dir));
    write('puzzles/p-bbb.json', '{"b":1}');
    const files = collectFiles(dir);
    expect(files.map((f) => f.path)).toContain('/puzzles/p-bbb.json');
    expect(versionOf(files)).not.toBe(v1);
  });
});

describe('renderSw', () => {
  it('inserisce tabella e versione e produce JavaScript valido', () => {
    const files = collectFiles(dir);
    const out = renderSw(TEMPLATE, files);
    expect(out).toContain('"/puzzles/p-aaa.json"');
    expect(out).toContain(versionOf(files));
    expect(out).not.toContain('__TABLE__');
    expect(() => new Function(out)).not.toThrow();
  });

  it('rifiuta un template senza segnaposto', () => {
    expect(() => renderSw('niente', [])).toThrow();
  });

  it('il template vero ha i segnaposto e dopo il rendering è JS valido', async () => {
    const { readFileSync } = await import('node:fs');
    const real = readFileSync(path.join(__dirname, '../pwa/sw-template.js'), 'utf8');
    const out = renderSw(real, collectFiles(dir));
    expect(() => new Function('self', 'caches', 'fetch', out)).not.toThrow();
  });
});
