import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildSteps } from '@eulero/core';
import type { Puzzle } from '@eulero/core';
import { collectFiles, renderSw } from '../apps/web/pwa/build-sw';
import { collectErrors, optionButton, skipHowTo, themesOf } from './helpers';
import { serveDir } from './static-server';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '../apps/web/dist');

/** Aspetta che il service worker controlli la pagina e abbia scaricato tutto (senza dipendere dal toast). */
const waitReady = (page: Page) =>
  expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (!navigator.serviceWorker.controller) return false;
          const cache = await caches.open('eulero-precache');
          const keys = (await cache.keys()).map((r) => new URL(r.url).pathname);
          return keys.includes('/index.html') && keys.some((k) => /^\/puzzles\/p-/.test(k));
        }),
      { timeout: 15_000 },
    )
    .toBe(true);

test('dopo la prima visita funziona senza rete: indice, livelli mai aperti, partita completa', async ({
  page,
  context,
}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  // appena installato, l'app avvisa che è pronta per l'uso offline (il toast dura pochi secondi)
  await expect(page.getByText('Pronto per giocare offline ✓')).toBeVisible({ timeout: 10_000 });
  await skipHowTo(page);
  await waitReady(page);

  // tutti i livelli sono già in cache, anche quelli che non abbiamo mai aperto
  const cached = await page.evaluate(async () => {
    const cache = await caches.open('eulero-precache');
    const keys = (await cache.keys()).map((r) => new URL(r.url).pathname);
    return keys.filter((k) => /^\/puzzles\/p-/.test(k)).length;
  });
  const themes = await themesOf(page);
  const total = themes.reduce((n, t) => n + t.levels.length, 0);
  expect(cached).toBe(total);

  // scelgo un livello di un tema mai visitato e leggo il puzzle PRIMA di spegnere la rete
  const level = themes[3]!.levels[0]!;
  const puzzle = (await (await page.request.get(`/puzzles/${level.id}.json`)).json()) as Puzzle;
  const steps = buildSteps(puzzle);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  await expect(page.locator('.theme')).toHaveCount(themes.length);

  await page.goto(`/#/p/${level.id}`);
  for (const [k, step] of steps.entries()) {
    await expect(page.locator('.play')).toHaveAttribute('data-step', String(k + 1));
    await optionButton(page, step.correct).click();
  }
  await expect(page.locator('.result')).toBeVisible();

  // e anche una navigazione "profonda" (percorso sconosciuto) apre l'app
  await page.goto('/qualunque/percorso');
  await expect(page.locator('.hero, .levels, .play, .result').first()).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('Offline', { exact: true })).toBeHidden();
  expect(
    errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e)),
  ).toEqual([]);
});

test('un nuovo deploy con livelli nuovi viene scaricato in background e resta disponibile offline', async ({
  browser,
}) => {
  // "deploy 1": copia della build
  const dir = mkdtempSync(path.join(os.tmpdir(), 'eulero-deploy-'));
  cpSync(DIST, dir, { recursive: true });
  const server = await serveDir(dir);
  const context = await browser.newContext({ locale: 'it-IT' });
  const page = await context.newPage();
  try {
    await page.goto(server.url);
    await skipHowTo(page);
    await waitReady(page);
    const before = await page.evaluate(async () => {
      const cache = await caches.open('eulero-precache');
      return (await cache.keys()).length;
    });

    // "deploy 2": un livello nuovo (copia di uno esistente con un altro id), indice e sw.js aggiornati
    const index = JSON.parse(readFileSync(path.join(dir, 'puzzles/index.json'), 'utf8')) as {
      themes: {
        theme: string;
        levels: { id: string; theme: string; level: number; difficulty: string; score: number }[];
      }[];
    };
    const animali = index.themes.find((t) => t.theme === 'animali')!;
    const source = animali.levels[0]!;
    const fresh = JSON.parse(
      readFileSync(path.join(dir, `puzzles/${source.id}.json`), 'utf8'),
    ) as Puzzle;
    const newId = 'p-nuovolivello';
    writeFileSync(path.join(dir, `puzzles/${newId}.json`), JSON.stringify({ ...fresh, id: newId }));
    animali.levels.push({ ...source, id: newId, level: animali.levels.length + 1 });
    writeFileSync(path.join(dir, 'puzzles/index.json'), JSON.stringify(index));
    const template = readFileSync(path.resolve(HERE, '../apps/web/pwa/sw-template.js'), 'utf8');
    writeFileSync(path.join(dir, 'sw.js'), renderSw(template, collectFiles(dir)));

    // l'app controlla gli aggiornamenti (qui a mano: di solito succede al ritorno in primo piano)
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
    });
    await expect(page.getByText('1 nuovo livello scaricato')).toBeVisible({ timeout: 15_000 });

    // scaricato solo ciò che serve: un livello nuovo + indice/sw cambiati, non tutto da capo
    const after = await page.evaluate(async () => {
      const cache = await caches.open('eulero-precache');
      return (await cache.keys()).map((r) => new URL(r.url).pathname);
    });
    expect(after).toContain(`/puzzles/${newId}.json`);
    expect(after.length).toBe(before + 1);

    // offline: il livello nuovo c'è nella lista del tema ed è giocabile
    await context.setOffline(true);
    await page.reload();
    await page.locator('.theme', { hasText: 'Animali' }).click();
    await expect(page.locator('.level')).toHaveCount(animali.levels.length);
  } finally {
    await context.close();
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('un file del deploy rotto non rovina l’installazione: resta la versione precedente', async ({
  browser,
}) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'eulero-deploy-'));
  cpSync(DIST, dir, { recursive: true });
  const server = await serveDir(dir);
  const context = await browser.newContext({ locale: 'it-IT' });
  const page = await context.newPage();
  try {
    await page.goto(server.url);
    await skipHowTo(page);
    await waitReady(page);

    // sw.js nuovo che elenca un livello che non esiste sul server → l'installazione deve fallire
    const template = readFileSync(path.resolve(HERE, '../apps/web/pwa/sw-template.js'), 'utf8');
    const files = collectFiles(dir);
    files.push({ path: '/puzzles/p-fantasma.json', revision: 'x' });
    writeFileSync(path.join(dir, 'sw.js'), renderSw(template, files));
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update().catch(() => undefined);
    });
    await page.waitForTimeout(1500);

    // l'app continua a funzionare offline con la cache della versione buona
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.hero')).toBeVisible();
  } finally {
    await context.close();
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pulsante "Installa l’app" quando il browser lo permette (beforeinstallprompt)', async ({
  page,
}) => {
  await page.goto('/');
  await skipHowTo(page);
  await expect(page.getByRole('button', { name: /Installa l’app/ })).toBeHidden();

  // simula l'evento che Chrome/Android invia quando l'app è installabile
  await page.evaluate(() => {
    (window as unknown as { __prompted: boolean }).__prompted = false;
    const e = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(e, {
      prompt: async () => {
        (window as unknown as { __prompted: boolean }).__prompted = true;
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(e);
  });
  const button = page.getByRole('button', { name: /Installa l’app/ });
  await expect(button).toBeVisible();
  await button.click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __prompted: boolean }).__prompted))
    .toBe(true);
  await expect(button).toBeHidden(); // una volta chiesto, il pulsante sparisce
});
