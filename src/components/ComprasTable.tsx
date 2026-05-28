import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ComprasRow, OriginTotals, Totals } from '../types';
import { SEXO_LABELS } from '../types';
import { aggregateByOrigem, computeOverall } from '../utils/analytics';
import { formatKg, formatNumber, formatUSD, formatUSDPerKg } from '../utils/formatters';

interface Props {
  rows: ComprasRow[];
  snapshotTotals?: Totals;
  originTotals?: OriginTotals;
}

interface RowMetrics {
  qtdCompra: number;
  pesoMedioKg: number;
  precoMedioUSDKg: number;
  valorKgBaseUSD: number | null;
}

export default function ComprasTable({ rows, snapshotTotals, originTotals }: Props) {
  const byOrigem = aggregateByOrigem(rows, originTotals);
  const overall = computeOverall(rows, snapshotTotals, originTotals);

  // Grand Total: usa direto o `overall` ja calculado com regra DUX-soberano.
  // Preco medio e base vem de snapshot.totals (DUX) sempre, mesmo com filtro
  // parcial. Qtd e peso refletem a selecao via soma trivial das rows.
  const grandTotal: RowMetrics = {
    qtdCompra: overall.qtdCompra,
    pesoMedioKg: overall.pesoMedioKg,
    precoMedioUSDKg: overall.precoMedioUSDKg,
    valorKgBaseUSD: overall.valorKgBaseUSD,
  };

  return (
    <div className="card-padded flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
          Detalhe por origem
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Mesma estrutura do Compras Now no DUX, com base e spread.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wider"
              style={{ color: 'var(--text-faint)' }}
            >
              <th className="px-3 py-2 font-semibold">Origem</th>
              <th className="px-3 py-2 font-semibold">Tipo</th>
              <th className="px-3 py-2 font-semibold text-right">Qtd. compra</th>
              <th className="px-3 py-2 font-semibold text-right">Peso medio</th>
              <th className="px-3 py-2 font-semibold text-right">Preco medio</th>
              <th className="px-3 py-2 font-semibold text-right">Base</th>
              <th className="px-3 py-2 font-semibold text-right">Spread</th>
            </tr>
          </thead>
          <tbody>
            {byOrigem.map((agg) => (
              <Group key={agg.origem} agg={agg} />
            ))}
            <tr
              className="border-t-2 font-bold"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
            >
              <td className="px-3 py-2.5">Grand total</td>
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-right tabular">
                {formatNumber(grandTotal.qtdCompra)}
              </td>
              <td className="px-3 py-2.5 text-right tabular">{formatKg(grandTotal.pesoMedioKg)}</td>
              <td className="px-3 py-2.5 text-right tabular">
                {formatUSDPerKg(grandTotal.precoMedioUSDKg)}
              </td>
              <BaseCell value={grandTotal.valorKgBaseUSD} bold />
              <SpreadCell
                preco={grandTotal.precoMedioUSDKg}
                base={grandTotal.valorKgBaseUSD}
                bold
              />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Group({ agg }: { agg: ReturnType<typeof aggregateByOrigem>[number] }) {
  return (
    <>
      <tr
        className="border-t font-semibold"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
      >
        <td className="px-3 py-2">
          <span className="font-mono text-xs mr-2 opacity-70">{agg.origem}</span>
          {agg.label}
        </td>
        <td className="px-3 py-2 text-xs uppercase" style={{ color: 'var(--text-faint)' }}>
          Total
        </td>
        <td className="px-3 py-2 text-right tabular">{formatNumber(agg.qtdCompra)}</td>
        <td className="px-3 py-2 text-right tabular">{formatKg(agg.pesoMedioKg)}</td>
        <td className="px-3 py-2 text-right tabular">{formatUSDPerKg(agg.precoMedioUSDKg)}</td>
        <BaseCell value={agg.valorKgBaseUSD} />
        <SpreadCell preco={agg.precoMedioUSDKg} base={agg.valorKgBaseUSD} />
      </tr>
      {agg.boi && (
        <tr className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <td className="px-3 py-1.5" />
          <td className="px-3 py-1.5">{SEXO_LABELS.MACHO}</td>
          <td className="px-3 py-1.5 text-right tabular">{formatNumber(agg.boi.qtdCompra)}</td>
          <td className="px-3 py-1.5 text-right tabular">{formatKg(agg.boi.pesoMedioKg)}</td>
          <td className="px-3 py-1.5 text-right tabular">
            {formatUSDPerKg(agg.boi.precoMedioUSDKg)}
          </td>
          <BaseCell value={agg.boi.valorKgBaseUSD} subtle />
          <SpreadCell preco={agg.boi.precoMedioUSDKg} base={agg.boi.valorKgBaseUSD} subtle />
        </tr>
      )}
      {agg.vaca && (
        <tr className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <td className="px-3 py-1.5" />
          <td className="px-3 py-1.5">{SEXO_LABELS.FEMEA}</td>
          <td className="px-3 py-1.5 text-right tabular">{formatNumber(agg.vaca.qtdCompra)}</td>
          <td className="px-3 py-1.5 text-right tabular">{formatKg(agg.vaca.pesoMedioKg)}</td>
          <td className="px-3 py-1.5 text-right tabular">
            {formatUSDPerKg(agg.vaca.precoMedioUSDKg)}
          </td>
          <BaseCell value={agg.vaca.valorKgBaseUSD} subtle />
          <SpreadCell preco={agg.vaca.precoMedioUSDKg} base={agg.vaca.valorKgBaseUSD} subtle />
        </tr>
      )}
    </>
  );
}

function BaseCell({
  value,
  bold = false,
  subtle = false,
}: {
  value: number | null | undefined;
  bold?: boolean;
  subtle?: boolean;
}) {
  if (value == null || value <= 0) {
    return (
      <td
        className={`text-right tabular ${bold ? 'px-3 py-2.5' : 'px-3 py-1.5'}`}
        style={{ color: 'var(--text-faint)' }}
      >
        —
      </td>
    );
  }
  return (
    <td
      className={`text-right tabular ${bold ? 'px-3 py-2.5' : subtle ? 'px-3 py-1.5' : 'px-3 py-2'}`}
      style={{ color: subtle ? 'var(--text-muted)' : 'var(--text)' }}
    >
      {formatUSDPerKg(value)}
    </td>
  );
}

function SpreadCell({
  preco,
  base,
  bold = false,
  subtle = false,
}: {
  preco: number;
  base: number | null | undefined;
  bold?: boolean;
  subtle?: boolean;
}) {
  if (base == null || base <= 0 || preco <= 0) {
    return (
      <td
        className={`text-right tabular ${bold ? 'px-3 py-2.5' : 'px-3 py-1.5'}`}
        style={{ color: 'var(--text-faint)' }}
      >
        —
      </td>
    );
  }
  const diff = preco - base;
  const absValue = Math.abs(diff);
  const isAbove = diff > 0;
  const tone = isAbove
    ? { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)' }
    : { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' };
  const Icon = isAbove ? ArrowUp : ArrowDown;
  return (
    <td className={`text-right tabular ${bold ? 'px-3 py-2.5' : subtle ? 'px-3 py-1.5' : 'px-3 py-2'}`}>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold"
        style={{ color: tone.color, background: tone.bg }}
      >
        <Icon className="h-3 w-3" strokeWidth={2.4} />
        {formatUSD(absValue, 2)}
      </span>
    </td>
  );
}
