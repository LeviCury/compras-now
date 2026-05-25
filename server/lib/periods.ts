export const PERIOD_KEYS = ['today', 'yesterday', 'last7', 'last30'] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export function isValidPeriod(value: unknown): value is PeriodKey {
  return typeof value === 'string' && (PERIOD_KEYS as readonly string[]).includes(value);
}

export function parsePeriodQuery(raw: unknown, fallback: PeriodKey = 'today'): PeriodKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isValidPeriod(value) ? value : fallback;
}
