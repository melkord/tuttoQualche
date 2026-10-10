export const capitalize = (s: string) => (s ? s[0]?.toUpperCase() + s.slice(1) : s);

const ICONS: Record<string, string> = {
  animali: '🐾',
  'cibo e bevande': '🍝',
  'geografia italiana': '🗺️',
  sport: '⚽',
  'natura e piante': '🌿',
  veicoli: '🚗',
};
export const themeIcon = (theme: string) => ICONS[theme] ?? '✨';
