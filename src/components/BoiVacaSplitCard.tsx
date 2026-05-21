import type { ComprasRow } from '../types';
import { computeBoiVacaSplit } from '../utils/analytics';
import { formatNumber, formatPercent, formatUSDPerKg } from '../utils/formatters';
import { useTheme } from '../contexts/useTheme';
import { resolveSexoColor } from './charts/chartTheme';

interface Props {
  rows: ComprasRow[];
}

export default function BoiVacaSplitCard({ rows }: Props) {
  const { theme } = useTheme();
  const split = computeBoiVacaSplit(rows);
  const boiColor = resolveSexoColor('MACHO', theme);
  const vacaColor = resolveSexoColor('FEMEA', theme);

  return (
    <div className="card-padded flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
          Mix Boi x Vaca
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Distribuicao de cabecas e preco medio ponderado.
        </p>
      </div>

      <div className="space-y-3">
        <SplitRow
          label="Boi (Macho)"
          color={boiColor}
          qtd={split.boi.qtd}
          pct={split.boi.pct}
          preco={split.boi.precoMedio}
          total={split.totalQtd}
        />
        <SplitRow
          label="Vaca (Femea)"
          color={vacaColor}
          qtd={split.vaca.qtd}
          pct={split.vaca.pct}
          preco={split.vaca.precoMedio}
          total={split.totalQtd}
        />
      </div>

      <div
        className="flex items-center justify-between text-xs pt-2 border-t"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        <span>Total geral</span>
        <span className="font-bold tabular" style={{ color: 'var(--text)' }}>
          {formatNumber(split.totalQtd)} cabecas
        </span>
      </div>
    </div>
  );
}

function SplitRow({
  label,
  color,
  qtd,
  pct,
  preco,
  total,
}: {
  label: string;
  color: string;
  qtd: number;
  pct: number;
  preco: number;
  total: number;
}) {
  const width = total === 0 ? 0 : (qtd / total) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
          {label}
        </span>
        <span className="font-bold tabular" style={{ color: 'var(--text)' }}>
          {formatNumber(qtd)} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>({formatPercent(pct, 0)})</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <div className="text-xs flex justify-between" style={{ color: 'var(--text-muted)' }}>
        <span>Preco medio</span>
        <span className="font-semibold tabular" style={{ color: 'var(--text)' }}>
          {formatUSDPerKg(preco)}
        </span>
      </div>
    </div>
  );
}
