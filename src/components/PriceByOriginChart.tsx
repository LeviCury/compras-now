import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown } from 'lucide-react';
import type { ComprasRow, OriginTotals, Totals } from '../types';
import { SEXO_LABELS } from '../types';
import { priceBySexoSeries, computeOverall } from '../utils/analytics';
import { useTheme } from '../contexts/useTheme';
import { CHART_COLORS, resolveSexoColor, tooltipStyle } from './charts/chartTheme';
import { formatNumber, formatUSD, formatUSDPerKg } from '../utils/formatters';

interface Props {
  rows: ComprasRow[];
  snapshotTotals?: Totals;
  originTotals?: OriginTotals;
}

export default function PriceByOriginChart({ rows, snapshotTotals, originTotals }: Props) {
  const { theme } = useTheme();
  const data = priceBySexoSeries(rows, originTotals);
  const overall = computeOverall(rows, snapshotTotals, originTotals);
  const axisColor = theme === 'dark' ? CHART_COLORS.axisDark : CHART_COLORS.axis;
  const gridColor = theme === 'dark' ? CHART_COLORS.gridDark : CHART_COLORS.grid;
  const boiColor = resolveSexoColor('MACHO', theme);
  const vacaColor = resolveSexoColor('FEMEA', theme);

  return (
    <div className="card-padded flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
            Preco medio por origem
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {SEXO_LABELS.MACHO} vs {SEXO_LABELS.FEMEA} em USD/kg. Linha tracejada = media geral ({formatUSDPerKg(overall.precoMedioUSDKg)}).
          </p>
        </div>
        {overall.cheapestOrigem && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
            {overall.cheapestOrigem.label} = mais barata
          </div>
        )}
      </div>

      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 12, left: -10, bottom: 0 }} barCategoryGap={20}>
            <CartesianGrid strokeDasharray="2 4" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatUSD(v, 2)}
            />
            <Tooltip
              contentStyle={tooltipStyle(theme)}
              cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
              formatter={(value: number, name: string, item) => {
                const payload = item.payload as ReturnType<typeof priceBySexoSeries>[number];
                const qtd = name === 'Macho' ? payload.qtdMacho : payload.qtdFemea;
                const label = name === 'Macho' ? SEXO_LABELS.MACHO : SEXO_LABELS.FEMEA;
                return [`${formatUSDPerKg(value)} | ${formatNumber(qtd)} cab.`, label];
              }}
              itemStyle={{ fontWeight: 600 }}
              labelStyle={{
                color: theme === 'dark' ? '#a1a1aa' : '#52525b',
                fontWeight: 700,
                marginBottom: 4,
              }}
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
                  {value === 'Macho' ? SEXO_LABELS.MACHO : value === 'Femea' ? SEXO_LABELS.FEMEA : value}
                </span>
              )}
            />
            <ReferenceLine
              y={overall.precoMedioUSDKg}
              stroke={axisColor}
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: 'Media geral',
                position: 'insideTopRight',
                fill: axisColor,
                fontSize: 10,
              }}
            />
            <Bar dataKey="Macho" fill={boiColor} radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={`macho-${d.origem}`} fill={boiColor} opacity={d.Macho > 0 ? 1 : 0.2} />
              ))}
            </Bar>
            <Bar dataKey="Femea" fill={vacaColor} radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={`femea-${d.origem}`} fill={vacaColor} opacity={d.Femea > 0 ? 1 : 0.2} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
