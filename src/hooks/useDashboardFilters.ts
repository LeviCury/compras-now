import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_FILTERS,
  type DashboardFilters,
  type Origem,
  type PeriodKey,
  type Sexo,
} from '../types';

export function useDashboardFilters(initial: DashboardFilters = DEFAULT_FILTERS) {
  const [filters, setFilters] = useState<DashboardFilters>(initial);

  const toggleOrigem = useCallback((origem: Origem) => {
    setFilters((prev) => {
      const has = prev.origens.includes(origem);
      const next = has ? prev.origens.filter((o) => o !== origem) : [...prev.origens, origem];
      return { ...prev, origens: next.length === 0 ? DEFAULT_FILTERS.origens : next };
    });
  }, []);

  const toggleSexo = useCallback((sexo: Sexo) => {
    setFilters((prev) => {
      const has = prev.sexos.includes(sexo);
      const next = has ? prev.sexos.filter((s) => s !== sexo) : [...prev.sexos, sexo];
      return { ...prev, sexos: next.length === 0 ? DEFAULT_FILTERS.sexos : next };
    });
  }, []);

  const setPeriod = useCallback((period: PeriodKey) => {
    setFilters((prev) => ({ ...prev, period }));
  }, []);

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const isDefault = useMemo(
    () =>
      filters.origens.length === DEFAULT_FILTERS.origens.length &&
      filters.sexos.length === DEFAULT_FILTERS.sexos.length &&
      filters.period === DEFAULT_FILTERS.period,
    [filters],
  );

  return { filters, setFilters, toggleOrigem, toggleSexo, setPeriod, reset, isDefault };
}
