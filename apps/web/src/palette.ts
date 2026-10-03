export const CONCEPT_COLORS = ['#ff5c93', '#4cc9f0', '#9b7bff', '#7be495'] as const;
export const colorOf = (i: number) => CONCEPT_COLORS[i % CONCEPT_COLORS.length] as string;
