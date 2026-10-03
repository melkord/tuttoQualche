import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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
