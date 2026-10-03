import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildSteps } from '@tuttialcuni/core';
import type { Puzzle } from '@tuttialcuni/core';

/** Raccoglie errori JS e `console.error` della pagina: i test falliscono se ce ne sono. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

/** Salta il tutorial della prima visita. */
export async function skipHowTo(page: Page) {
  await page.getByRole('button', { name: 'Ho capito' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

export interface Level {
  id: string;
  theme: string;
  level: number;
}

export async function levelsOf(page: Page, theme: string): Promise<Level[]> {
  const res = await page.request.get('/puzzles/index.json');
  const index = (await res.json()) as { themes: { theme: string; levels: Level[] }[] };
  return index.themes.find((t) => t.theme === theme)?.levels ?? [];
}

export async function puzzleOf(page: Page, id: string): Promise<Puzzle> {
  return (await (await page.request.get(`/puzzles/${id}.json`)).json()) as Puzzle;
}

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Gioca un livello già aperto. `wrongFirst[k]` = quante risposte sbagliate dare nel passo k
 * prima di quella giusta. Calcola la risposta giusta con la stessa logica del gioco.
 */
export async function playLevel(
  page: Page,
  id: string,
  wrongFirst: [number, number, number] = [0, 0, 0],
) {
  const steps = buildSteps(await puzzleOf(page, id));
  for (const [k, step] of steps.entries()) {
    await expect(page.locator('.play')).toHaveAttribute('data-step', String(k + 1));
    // a ogni passo si aggiunge una parola e i diagrammi hanno un cerchio in più
    await expect(page.locator('.wchip')).toHaveCount(k + 2);
    await expect(page.locator('.option-card').first().locator('circle')).toHaveCount(k + 2);
    const wrongs = [0, 1, 2, 3].filter((i) => i !== step.correct).slice(0, wrongFirst[k]);
    for (const w of wrongs) {
      await page.getByRole('button', { name: `Opzione ${LETTERS[w]}` }).click();
      await expect(page.getByRole('button', { name: `Opzione ${LETTERS[w]}` })).toHaveAttribute(
        'data-state',
        'wrong',
      );
      await expect(page.getByRole('alert')).toContainText('No!');
    }
    await page.getByRole('button', { name: `Opzione ${LETTERS[step.correct]}` }).click();
    await expect(
      page.getByRole('button', { name: `Opzione ${LETTERS[step.correct]}` }),
    ).toHaveAttribute('data-state', 'correct');
  }
  await expect(page.locator('.result')).toBeVisible();
}
