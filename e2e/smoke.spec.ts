import { expect, test } from '@playwright/test';
import { collectErrors, skipHowTo } from './helpers';

test('home: tutorial alla prima visita, sfida del giorno e 5 temi', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Come si gioca' })).toBeVisible();
  await skipHowTo(page);

  await expect(page.getByText('Sfida del giorno')).toBeVisible();
  await expect(page.locator('.theme')).toHaveCount(5);
  await expect(page.getByText('0 / 10 livelli').first()).toBeVisible();

  // il tutorial non riappare dopo il reload
  await page.reload();
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(errors).toEqual([]);
});

test('navigazione senza errori: home → tema → livello → indietro → statistiche', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await skipHowTo(page);

  await page.locator('.theme', { hasText: 'Animali' }).click();
  await expect(page.locator('.level')).toHaveCount(10);

  await page.locator('.level').first().click();
  await expect(page.locator('svg.board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Controlla' })).toBeVisible();

  await page.getByRole('button', { name: 'Indietro' }).click();
  await expect(page.locator('.level')).toHaveCount(10);
  await page.getByRole('button', { name: 'Indietro' }).click();
  await expect(page.locator('.hero')).toBeVisible();

  await page.getByRole('button', { name: 'Statistiche' }).click();
  await expect(page.getByRole('dialog', { name: 'Statistiche' })).toBeVisible();
  await page.getByRole('button', { name: 'Chiudi' }).click();
  expect(errors).toEqual([]);
});

test('regressione: nessun effetto restituisce un valore non-funzione (TypeError "0 is not a function")', async ({
  page,
}) => {
  const errors = collectErrors(page);
  // Simula estensioni/browser che fanno restituire un valore a scrollTo e a setItem:
  // un `useEffect(() => scrollTo(...))` senza graffe lo prenderebbe per una funzione di cleanup.
  await page.addInitScript(() => {
    window.scrollTo = (() => 0) as typeof window.scrollTo;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args: [string, string]) {
      setItem.apply(this, args);
      return 0 as unknown as void;
    };
  });
  await page.goto('/');
  await skipHowTo(page);
  // ogni cambio di rotta smonta/rimonta componenti ed esegue i cleanup degli effetti
  for (const hash of ['#/t/sport', '#/', '#/t/animali', '#/', '#/t/inesistente', '#/']) {
    await page.evaluate((h) => (window.location.hash = h), hash);
    await page.waitForTimeout(150);
  }
  expect(errors).toEqual([]);
});

test('un livello inesistente mostra un messaggio, non una pagina rotta', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/#/p/p-nonesiste');
  await skipHowTo(page);
  await expect(page.getByText(/non disponibile|Non trovato|non valido/i)).toBeVisible();
  // il 404 di rete viene registrato dal browser come console.error: è atteso
  expect(
    errors.filter((e) => !e.includes('404') && !e.includes('Failed to load resource')),
  ).toEqual([]);
});
