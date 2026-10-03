import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildSteps } from '@eulero/core';
import { collectErrors, levelsOf, playLevel, puzzleOf, skipHowTo } from './helpers';

async function open(page: Page) {
  await page.goto('/');
  await skipHowTo(page);
}

test('gioco completo: errori, riprova, risultato da condividere e sblocco del livello 2', async ({
  page,
}) => {
  const errors = collectErrors(page);
  const [l1, l2] = await levelsOf(page, 'animali');
  await open(page);

  await page.locator('.theme', { hasText: 'Animali' }).click();
  // il livello 2 è bloccato finché non si completa il 1
  await expect(page.getByRole('button', { name: 'Livello 2 (bloccato)' })).toBeDisabled();

  await page.getByRole('button', { name: 'Livello 1', exact: true }).click();
  await playLevel(page, l1!.id, [2, 0, 1]); // 2 errori al passo 1, 0 al passo 2, 1 al passo 3

  await expect(page.getByText('3 errori in totale')).toBeVisible();
  await expect(page.getByRole('img', { name: '1 stelle su 3' })).toBeVisible();
  await expect(page.locator('.final circle')).toHaveCount(4);
  await expect(page.locator('.wchip')).toHaveCount(4);
  await expect(page.locator('.grid')).toContainText('⭐☆☆');
  await expect(page.locator('.grid')).toContainText('1  🟥🟥🟩');
  await expect(page.locator('.grid')).toContainText('2  🟩');
  await expect(page.locator('.grid')).toContainText('3  🟥🟩');
  await expect(page.locator('.grid')).toContainText('Animali · livello 1');

  // ora il livello 2 è sbloccato e "Livello successivo" ci porta lì
  await page.getByRole('button', { name: /Livello successivo/ }).click();
  await expect(page.locator('.play')).toHaveAttribute('data-step', '1');
  await page.getByRole('button', { name: 'Indietro' }).click();
  await expect(page.getByRole('button', { name: 'Livello 2', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Livello 1', exact: true })).toContainText('★');
  expect(l2).toBeDefined();
  expect(errors).toEqual([]);
});

test('zero errori: 3 stelle e stelle sul livello', async ({ page }) => {
  const [l1] = await levelsOf(page, 'sport');
  await open(page);
  await page.goto(`/#/p/${l1!.id}`);
  await playLevel(page, l1!.id);
  await expect(page.getByRole('img', { name: '3 stelle su 3' })).toBeVisible();
  await expect(page.getByText('✨ Perfetto, zero errori')).toBeVisible();

  await page.getByRole('button', { name: 'Torna alla home' }).click();
  await page.locator('.theme', { hasText: 'Sport' }).click();
  await expect(page.getByRole('button', { name: 'Livello 1', exact: true })).toContainText('★★★');
});

test('i progressi restano dopo un reload a metà puzzle e nelle statistiche', async ({ page }) => {
  const [l1] = await levelsOf(page, 'natura e piante');
  await open(page);
  await page.goto(`/#/p/${l1!.id}`);
  await expect(page.locator('.play')).toHaveAttribute('data-step', '1');

  // passo 1 giusto, poi reload: si riparte dal passo 2
  const step = buildSteps(await puzzleOf(page, l1!.id))[0]!;
  await page.getByRole('button', { name: `Opzione ${'ABCD'[step.correct]}` }).click();
  await expect(page.locator('.play')).toHaveAttribute('data-step', '2');
  await page.reload();
  await expect(page.locator('.play')).toHaveAttribute('data-step', '2');
});

test('un livello bloccato aperto da link diretto riporta alla lista del tema', async ({ page }) => {
  const [, l2] = await levelsOf(page, 'animali');
  await open(page);
  await page.goto(`/#/p/${l2!.id}`);
  await expect(page.locator('.level')).toHaveCount(10);
  await expect(page.locator('.options')).toHaveCount(0);
});

test('statistiche dopo un livello completato', async ({ page }) => {
  const [l1] = await levelsOf(page, 'animali');
  await open(page);
  await page.goto(`/#/p/${l1!.id}`);
  await playLevel(page, l1!.id, [1, 0, 0]);
  await page.getByRole('button', { name: 'Statistiche' }).click();
  const dialog = page.getByRole('dialog', { name: 'Statistiche' });
  await expect(dialog.locator('.stats-grid > div').first().locator('b')).toHaveText('1');
  await expect(dialog.locator('.stats-grid > div').nth(1).locator('b')).toHaveText('0%');
});
