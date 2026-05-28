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
import type { ComprasRow, OriginTotals } from '../types';
import { SEXO_LABELS } from '../types';
import { volumeSeries } from '../utils/analytics';
import { useTheme } from '../contexts/useTheme';
import { CHART_COLORS, resolveSexoColor, tooltipStyle } from './charts/chartTheme';
import { formatNumber } from '../utils/formatters';

interface Props {
  rows: ComprasRow[];
  originTotals?: OriginTotals;
}

export default function VolumeByOriginChart({ rows, originTotals }: Props) {
  const { theme } = useTheme();
  const data = volumeSeries(rows, originTotals);
  const axisColor = theme === 'dark' ? CHART_COLORS.axisDark : CHART_COLORS.axis;
  const gridColor = theme === 'dark' ? CHART_COLORS.gridDark : CHART_COLORS.grid;
  const boiColor = resolveSexoColor('MACHO', theme);
  const vacaColor = resolveSexoColor('FEMEA', theme);

  return (
    <div className="card-padded flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
          Volume de cabecas por origem
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Quantidade comprada empilhada {SEXO_LABELS.MACHO}/{SEXO_LABELS.FEMEA}.
        </p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Tooltip
              contentStyle={tooltipStyle(theme)}
              cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
              formatter={(value: number, name: string) => {
                const label = name === 'Macho' ? SEXO_LABELS.MACHO : name === 'Femea' ? SEXO_LABELS.FEMEA : name;
                return [`${formatNumber(value)} cab.`, label];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="square"
              iconSize={11}
              formatter={(v, entry) => (
                <span
                  style={{
                    color: entry?.color ?? 'var(--text)',
                    marginLeft: 4,
                    fontWeight: 600,
                  }}
                >
                  {v === 'Macho' ? SEXO_LABELS.MACHO : v === 'Femea' ? SEXO_LABELS.FEMEA : v}
                </span>
              )}
            />
            <Bar dataKey="Macho" stackId="vol" fill={boiColor} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Femea" stackId="vol" fill={vacaColor} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
