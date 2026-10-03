const pad = (n: number) => String(n).padStart(2, '0');

/** Data locale odierna come YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const at = (date: string) => new Date(`${date}T12:00:00`);

export const longDay = (date: string) =>
  at(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

export const shortDay = (date: string) =>
  at(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

export function prevDay(date: string): string {
  const d = at(date);
  d.setDate(d.getDate() - 1);
  return todayLocal(d);
}
