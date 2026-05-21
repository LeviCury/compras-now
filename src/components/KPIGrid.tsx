import { ArrowDown, ArrowUp, Beef, DollarSign, Scale, Target, Truck } from 'lucide-react';
import type { ComprasRow } from '../types';
import { computeOverall } from '../utils/analytics';
import { formatKg, formatNumber, formatUSD, formatUSDPerKg } from '../utils/formatters';
import KPICard from './KPICard';

interface Props {
  rows: ComprasRow[];
}

export default function KPIGrid({ rows }: Props) {
  const overall = computeOverall(rows);

  // Spread vs base global: usa base ponderada das origens que tem base configurada.
  const rowsWithBase = rows.filter(
    (r) => typeof r.valorKgBaseUSD === 'number' && r.valorKgBaseUSD > 0,
  );
  const baseDen = rowsWithBase.reduce((acc, r) => acc + r.qtdCompra * r.pesoMedioKg, 0);
  const baseNum = rowsWithBase.reduce(
    (acc, r) => acc + (r.valorKgBaseUSD ?? 0) * r.qtdCompra * r.pesoMedioKg,
    0,
  );
  const globalBase = baseDen > 0 ? baseNum / baseDen : null;
  // Para o spread global, usa o preco medio das mesmas origens que tem base
  // (caso contrario compararia ma\u00e7as com bananas).
  const precoDen = rowsWithBase.reduce((acc, r) => acc + r.qtdCompra * r.pesoMedioKg, 0);
  const precoNum = rowsWithBase.reduce(
    (acc, r) => acc + r.precoMedioUSDKg * r.qtdCompra * r.pesoMedioKg,
    0,
  );
  const precoFiltrado = precoDen > 0 ? precoNum / precoDen : null;
  const spread =
    globalBase != null && precoFiltrado != null ? precoFiltrado - globalBase : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        icon={Truck}
        label="Cabecas compradas"
        value={formatNumber(overall.qtdCompra)}
        hint={`${overall.origensAtivas} origens ativas`}
      />
      <KPICard
        icon={DollarSign}
        label="Preco medio USD/kg"
        value={formatUSDPerKg(overall.precoMedioUSDKg)}
        hint="Ponderado por qtd x peso"
        emphasis="primary"
        footer={
          globalBase != null && spread != null ? (
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-3 w-3" style={{ color: 'var(--text-faint)' }} />
                <span>Base {formatUSDPerKg(globalBase)}</span>
              </span>
              <SpreadBadge value={spread} />
            </div>
          ) : null
        }
      />
      <KPICard
        icon={Scale}
        label="Peso medio"
        value={formatKg(overall.pesoMedioKg)}
        hint="Ponderado por cabeca"
      />
      <KPICard
        icon={Beef}
        label="Origem mais barata"
        value={overall.cheapestOrigem ? overall.cheapestOrigem.label : '-'}
        hint={
          overall.cheapestOrigem
            ? `${formatUSDPerKg(overall.cheapestOrigem.precoMedioUSDKg)} | ${formatNumber(overall.cheapestOrigem.qtdCompra)} cab.`
            : 'sem dados'
        }
        footer={
          overall.priciestOrigem && overall.priciestOrigem !== overall.cheapestOrigem ? (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5">
                <ArrowDown className="h-3 w-3" style={{ color: 'var(--accent)' }} />
                <span>
                  <strong style={{ color: 'var(--text)' }}>{overall.cheapestOrigem?.label}</strong>{' '}
                  {formatUSDPerKg(overall.cheapestOrigem!.precoMedioUSDKg)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ArrowUp className="h-3 w-3" style={{ color: 'var(--text-faint)' }} />
                <span>
                  <strong style={{ color: 'var(--text)' }}>{overall.priciestOrigem.label}</strong>{' '}
                  {formatUSDPerKg(overall.priciestOrigem.precoMedioUSDKg)}
                </span>
              </span>
            </div>
          ) : null
        }
      />
    </div>
  );
}

function SpreadBadge({ value }: { value: number }) {
  const abs = Math.abs(value);
  const isAbove = value > 0;
  const tone = isAbove
    ? { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.10)' }
    : { color: '#10b981', bg: 'rgba(16, 185, 129, 0.10)' };
  const Icon = isAbove ? ArrowUp : ArrowDown;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold tabular"
      style={{ color: tone.color, background: tone.bg, fontSize: '0.7rem' }}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.4} />
      {formatUSD(abs, 2)}
    </span>
  );
}
