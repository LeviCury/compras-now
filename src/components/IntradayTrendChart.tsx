import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity } from 'lucide-react';
import { useTheme } from '../contexts/useTheme';
import type { IntradayResponse, Origem, Sexo } from '../types';
import { ORIGEM_LABELS, SEXO_LABELS } from '../types';
import { buildIntradaySeries } from '../utils/analytics';
import { formatTime, formatUSD, formatUSDPerKg } from '../utils/formatters';
import { CHART_COLORS, resolveOrigemColor, tooltipStyle } from './charts/chartTheme';

interface Props {
  intraday?: IntradayResponse;
  isLoading: boolean;
  origens: Origem[];
  sexos: Sexo[];
}

export default function IntradayTrendChart({ intraday, isLoading, origens, sexos }: Props) {
  const { theme } = useTheme();
  const axisColor = theme === 'dark' ? CHART_COLORS.axisDark : CHART_COLORS.axis;
  const gridColor = theme === 'dark' ? CHART_COLORS.gridDark : CHART_COLORS.grid;

  const sexoFilter: Sexo | 'TODOS' =
    sexos.length === 2 ? 'TODOS' : sexos.length === 1 ? sexos[0] : 'TODOS';

  const data = useMemo(() => {
    if (!intraday) return [];
    return buildIntradaySeries(intraday.points, origens, sexoFilter);
  }, [intraday, origens, sexoFilter]);

  return (
    <div className="card-padded flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          <Activity className="h-4 w-4" strokeWidth={2} />
        </span>
        <div>
          <h2
            className="text-base font-semibold tracking-tight"
            style={{ letterSpacing: '-0.01em' }}
          >
            Evolucao intra-dia (Hoje)
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Preco medio USD/kg conforme as execucoes do RPA ao longo do dia.
            {sexoFilter !== 'TODOS' && ` Somente ${SEXO_LABELS[sexoFilter]}.`}
          </p>
        </div>
      </div>

      <div className="h-72">
        {isLoading ? (
          <div className="skeleton h-full w-full" />
        ) : data.length < 2 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="time"
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatUSD(v, 2)}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={tooltipStyle(theme)}
                cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '3 3' }}
                labelFormatter={(_label, payload) => {
                  const p = payload && payload[0];
                  const at = p && p.payload && (p.payload as { capturedAt?: string }).capturedAt;
                  return at ? formatTime(at) : _label;
                }}
                formatter={(value: number, name: string) => [formatUSDPerKg(value), name]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="line"
                iconSize={14}
                formatter={(value, entry) => (
                  <span
                    style={{
                      color: entry?.color ?? 'var(--text)',
                      marginLeft: 4,
                      fontWeight: 600,
                    }}
                  >
                    {value}
                  </span>
                )}
              />
              {origens.map((o) => (
                <Line
                  key={o}
                  type="monotone"
                  dataKey={o}
                  name={ORIGEM_LABELS[o]}
                  stroke={resolveOrigemColor(o, theme)}
                  strokeWidth={o === 'PY' ? 2.5 : 2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center text-sm gap-2"
      style={{ color: 'var(--text-muted)' }}
    >
      <Activity className="h-8 w-8 opacity-30" strokeWidth={1.5} />
      <span>Sem pontos suficientes ainda. Aguardando proximas execucoes intraday.</span>
    </div>
  );
}
