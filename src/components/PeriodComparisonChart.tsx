import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GitCompareArrows, TrendingUp } from 'lucide-react';
import type { AllSnapshots, ComprasRow, DashboardFilters, PeriodKey } from '../types';
import { ORIGEM_LABELS, PERIOD_KEYS, PERIOD_SHORT_LABELS } from '../types';
import { formatNumber, formatUSD, formatUSDPerKg } from '../utils/formatters';
import { useTheme } from '../contexts/useTheme';
import { CHART_COLORS, tooltipStyle } from './charts/chartTheme';

interface Props {
  all?: AllSnapshots;
  isLoading: boolean;
  filters: DashboardFilters;
}

type Metric = 'preco' | 'qtd';

const PERIOD_BAR_COLORS_LIGHT: Record<PeriodKey, string> = {
  today: '#E30613',
  yesterday: '#3f3f46',
  last7: '#71717a',
  last30: '#a1a1aa',
};

const PERIOD_BAR_COLORS_DARK: Record<PeriodKey, string> = {
  today: '#FF3B49',
  yesterday: '#e4e4e7',
  last7: '#a1a1aa',
  last30: '#71717a',
};

export default function PeriodComparisonChart({ all, isLoading, filters }: Props) {
  const { theme } = useTheme();
  const [metric, setMetric] = useState<Metric>('preco');
  const axisColor = theme === 'dark' ? CHART_COLORS.axisDark : CHART_COLORS.axis;
  const gridColor = theme === 'dark' ? CHART_COLORS.gridDark : CHART_COLORS.grid;
  const periodColors = theme === 'dark' ? PERIOD_BAR_COLORS_DARK : PERIOD_BAR_COLORS_LIGHT;

  const data = useMemo(() => {
    if (!all) return [];
    const origens = filters.origens;
    return origens.map((origem) => {
      const row: Record<string, number | string> = {
        origem,
        label: ORIGEM_LABELS[origem],
      };
      for (const period of PERIOD_KEYS) {
        const snapshot = all[period];
        if (!snapshot) {
          row[period] = 0;
          continue;
        }
        const rows: ComprasRow[] = snapshot.rows.filter(
          (r) => r.origem === origem && filters.sexos.includes(r.sexo),
        );
        if (rows.length === 0) {
          row[period] = 0;
          continue;
        }
        if (metric === 'preco') {
          const totalWeight = rows.reduce((acc, r) => acc + r.qtdCompra * r.pesoMedioKg, 0);
          const num = rows.reduce(
            (acc, r) => acc + r.precoMedioUSDKg * r.qtdCompra * r.pesoMedioKg,
            0,
          );
          row[period] = totalWeight > 0 ? round2(num / totalWeight) : 0;
        } else {
          row[period] = rows.reduce((acc, r) => acc + r.qtdCompra, 0);
        }
      }
      return row;
    });
  }, [all, filters, metric]);

  return (
    <div className="card-padded flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
          >
            <GitCompareArrows className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
              Comparativo entre periodos
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {metric === 'preco'
                ? 'Preco medio USD/kg por origem em cada periodo.'
                : 'Volume de cabecas por origem em cada periodo.'}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-0.5 p-0.5 rounded-md border"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setMetric('preco')}
            className="px-2.5 py-1 rounded text-xs font-medium transition-all"
            style={{
              background: metric === 'preco' ? 'var(--bg-elevated)' : 'transparent',
              color: metric === 'preco' ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: metric === 'preco' ? 'var(--shadow-card)' : 'none',
            }}
          >
            Preco
          </button>
          <button
            onClick={() => setMetric('qtd')}
            className="px-2.5 py-1 rounded text-xs font-medium transition-all"
            style={{
              background: metric === 'qtd' ? 'var(--bg-elevated)' : 'transparent',
              color: metric === 'qtd' ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: metric === 'qtd' ? 'var(--shadow-card)' : 'none',
            }}
          >
            Volume
          </button>
        </div>
      </div>

      <div className="h-72 sm:h-80">
        {isLoading ? (
          <div className="skeleton h-full w-full" />
        ) : data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 12, left: -10, bottom: 0 }} barCategoryGap={24}>
              <CartesianGrid strokeDasharray="2 4" stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  metric === 'preco' ? formatUSD(v, 2) : formatNumber(v)
                }
              />
              <Tooltip
                contentStyle={tooltipStyle(theme)}
                cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                formatter={(value: number, name: string) => [
                  metric === 'preco' ? formatUSDPerKg(value) : `${formatNumber(value)} cab.`,
                  PERIOD_SHORT_LABELS[name as PeriodKey] ?? name,
                ]}
                labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#52525b' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="square"
                iconSize={11}
                formatter={(value, entry) => (
                  <span
                    style={{
                      color: entry?.color ?? 'var(--text)',
                      marginLeft: 4,
                      fontWeight: 600,
                    }}
                  >
                    {PERIOD_SHORT_LABELS[value as PeriodKey] ?? value}
                  </span>
                )}
              />
              {PERIOD_KEYS.map((p) => (
                <Bar key={p} dataKey={p} fill={periodColors[p]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center text-sm"
      style={{ color: 'var(--text-muted)' }}
    >
      <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
      Aguardando dados dos 4 periodos para gerar o comparativo.
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
