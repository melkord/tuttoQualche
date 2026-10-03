import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildSteps } from '@eulero/core';
import type { Puzzle } from '@eulero/core';

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
  await page.getByRole('button', { name: /^(Ho capito|Got it)$/ }).click();
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
/** Il pulsante di un'opzione, in italiano ("Opzione A") o in inglese ("Option A"). */
export const optionButton = (page: Page, i: number) =>
  page.getByRole('button', { name: new RegExp(`^(Opzione|Option) ${LETTERS[i]}$`) });

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
      await optionButton(page, w).click();
      await expect(optionButton(page, w)).toHaveAttribute('data-state', 'wrong');
      await expect(page.getByRole('alert')).toContainText('No!');
    }
    await optionButton(page, step.correct).click();
    await expect(optionButton(page, step.correct)).toHaveAttribute('data-state', 'correct');
  }
  await expect(page.locator('.result')).toBeVisible();
}

const ITALIAN_UI =
  /\b(Livello|livelli|Gioca|Riprendi|Continua|Inizia da qui|Temi|Torna|Condividi|errore|errori|Statistiche|Come si gioca|Riprova|giocati|perfetti|Avanzamento|Opzione|Chiudi|Carico)\b/;

/** Fallisce se nell'interfaccia visibile resta del testo italiano (utile nei test in inglese). */
export async function expectNoItalianUI(page: Page) {
  const text = await page.locator('body').innerText();
  expect(
    text.match(ITALIAN_UI)?.[0] ?? null,
    `testo italiano rimasto: ${text.slice(0, 200)}`,
  ).toBeNull();
}
