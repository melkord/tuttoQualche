import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildSteps, localizedConcepts } from '@eulero/core';
import {
  collectErrors,
  themesOf,
  expectNoItalianUI,
  levelsOf,
  optionButton,
  playLevel,
  puzzleOf,
  skipHowTo,
} from './helpers';

const langButton = (page: Page) => page.getByRole('button', { name: /^(Lingua|Language): / });

test.describe('browser in inglese', () => {
  test.use({ locale: 'en-US' });

  test('interfaccia, nomi dei temi e parole in inglese; si gioca fino al risultato', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const [l1] = await levelsOf(page, 'animali');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('Eulero · the set puzzle');
    await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
    await expectNoItalianUI(page); // anche il tutorial
    await skipHowTo(page);
    await expectNoItalianUI(page);

    await expect(page.getByText('Start here')).toBeVisible();
    await expect(page.locator('.theme').first()).toContainText('Animals');
    const first = (await themesOf(page))[0]!;
    await expect(page.getByText(`0 / ${first.levels.length} levels`).first()).toBeVisible();
    await expect(page.locator('.hero h2')).toContainText('Animals · level 1');

    await page.locator('.theme', { hasText: 'Animals' }).click();
    await expect(page.getByRole('button', { name: 'Level 2 (locked)' })).toBeDisabled();
    await expectNoItalianUI(page);
    await page.getByRole('button', { name: 'Level 1', exact: true }).click();

    // le parole sono quelle inglesi, nell'ordine di rivelazione
    const puzzle = await puzzleOf(page, l1!.id);
    const steps = buildSteps(puzzle);
    const en = localizedConcepts(puzzle, 'en');
    await expect(page.locator('.wchip')).toHaveText(steps[0]!.words.map((w) => en[w]!.label));

    // errore: spiegazione in inglese
    const wrong = [0, 1, 2, 3].find((i) => i !== steps[0]!.correct)!;
    await optionButton(page, wrong).click();
    await expect(page.getByRole('alert')).toContainText('Nope!');
    await expect(page.getByRole('alert')).toContainText('circle');
    await expect(page.getByRole('alert')).not.toContainText('cerchio');
    await expectNoItalianUI(page);
    await page.getByRole('button', { name: 'Try again' }).click();

    await optionButton(page, steps[0]!.correct).click();
    await expect(page.locator('.play')).toHaveAttribute('data-step', '2');
    await playLevelFromStep(page, l1!.id, 1);

    await expect(page.locator('.result')).toBeVisible();
    await expect(page.getByText('1 mistake in total.')).toBeVisible();
    await expect(page.locator('.grid')).toContainText('Eulero · Animals · level 1');
    await expect(page.locator('.grid')).toContainText('1 mistake');
    await expect(page.getByRole('button', { name: 'Share result' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Next level/ })).toBeVisible();
    await expectNoItalianUI(page);
    await page.getByRole('button', { name: 'Stats' }).click();
    await expectNoItalianUI(page);
    expect(errors).toEqual([]);
  });

  test('lingue non supportate ripiegano sull’inglese, quelle supportate no', async ({
    browser,
  }) => {
    const fr = await browser.newContext({ locale: 'fr-FR' });
    const p1 = await fr.newPage();
    await p1.goto('/');
    await expect(p1.locator('html')).toHaveAttribute('lang', 'en');
    await fr.close();
  });
});

async function playLevelFromStep(page: Page, id: string, from: number) {
  const steps = buildSteps(await puzzleOf(page, id));
  for (const [k, step] of steps.entries()) {
    if (k < from) continue;
    await expect(page.locator('.play')).toHaveAttribute('data-step', String(k + 1));
    await optionButton(page, step.correct).click();
  }
}

test('browser in italiano: tasto lingua → inglese, e la scelta resta dopo il reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await skipHowTo(page);
  await expect(page.getByText('Inizia da qui')).toBeVisible();
  await expect(page.locator('.theme').first()).toContainText('Animali');

  await langButton(page).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Eulero · the set puzzle');
  await expect(page.getByText('Start here')).toBeVisible();
  await expect(page.locator('.theme').first()).toContainText('Animals');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Start here')).toBeVisible();

  await langButton(page).click(); // torna all'italiano
  await expect(page.getByText('Inizia da qui')).toBeVisible();
});

test('cambiare lingua a metà puzzle cambia le parole senza perdere i progressi', async ({
  page,
}) => {
  const [l1] = await levelsOf(page, 'sport');
  await page.goto('/');
  await skipHowTo(page);
  await page.goto(`/#/p/${l1!.id}`);
  const puzzle = await puzzleOf(page, l1!.id);
  const steps = buildSteps(puzzle);
  const it = localizedConcepts(puzzle, 'it');
  const en = localizedConcepts(puzzle, 'en');

  await optionButton(page, steps[0]!.correct).click();
  await expect(page.locator('.play')).toHaveAttribute('data-step', '2');
  await expect(page.locator('.wchip')).toHaveText(steps[1]!.words.map((w) => it[w]!.label));

  await langButton(page).click();
  await expect(page.locator('.play')).toHaveAttribute('data-step', '2');
  await expect(page.locator('.wchip')).toHaveText(steps[1]!.words.map((w) => en[w]!.label));
  await expect(page.getByRole('button', { name: 'Option A' })).toBeVisible();
});

test('in italiano il livello si completa come prima (nessuna regressione)', async ({ page }) => {
  const [l1] = await levelsOf(page, 'natura e piante');
  await page.goto('/');
  await skipHowTo(page);
  await page.goto(`/#/p/${l1!.id}`);
  await playLevel(page, l1!.id);
  await expect(page.getByText('Tre su tre al primo colpo.')).toBeVisible();
});
