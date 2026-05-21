import { useQuery } from '@tanstack/react-query';
import { fetchAllSnapshots, fetchIntraday, fetchSnapshot } from '../services/dataLoader';
import type { PeriodKey } from '../types';

const FAST_POLL_MS = 120_000;
const SLOW_POLL_MS = 30 * 60_000;

export function useSnapshot(period: PeriodKey) {
  return useQuery({
    queryKey: ['snapshot', period],
    queryFn: () => fetchSnapshot(period),
    refetchInterval: period === 'today' ? FAST_POLL_MS : SLOW_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: period === 'today' ? 60_000 : 10 * 60_000,
  });
}

export function useAllSnapshots() {
  return useQuery({
    queryKey: ['snapshots-all'],
    queryFn: fetchAllSnapshots,
    refetchInterval: FAST_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}

export function useIntraday(enabled = true) {
  return useQuery({
    queryKey: ['intraday'],
    queryFn: fetchIntraday,
    enabled,
    refetchInterval: enabled ? FAST_POLL_MS : false,
    staleTime: 60_000,
  });
}
