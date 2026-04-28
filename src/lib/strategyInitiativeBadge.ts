export const strategyInitiativeBadgePalette = [
  'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400',
  'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
  'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
  'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400',
  'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400',
  'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-400',
] as const;

export function getStrategyInitiativeBadgeClass(seed: string | null | undefined) {
  const safeSeed = seed?.trim() || 'default';
  const hash = [...safeSeed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return strategyInitiativeBadgePalette[hash % strategyInitiativeBadgePalette.length];
}
