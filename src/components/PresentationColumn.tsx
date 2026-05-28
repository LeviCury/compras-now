import { Clock4 } from 'lucide-react';
import type { ComprasSnapshot, Origem, PeriodKey, Sexo } from '../types';
import { ORIGEM_LABELS, PERIOD_LABELS, SEXO_LABELS } from '../types';
import { aggregateByOrigem, applyFilters, computeBoiVacaSplit, computeOverall } from '../utils/analytics';
import { formatNumber, formatUSDPerKg, timeAgo } from '../utils/formatters';

interface Props {
  periodKey: PeriodKey;
  snapshot: ComprasSnapshot | null;
  origens: Origem[];
  sexos: Sexo[];
}

// Tokens via CSS variables (definidas em index.css). Trocam automaticamente
// quando o usuario toggla tema claro/escuro no dashboard.
const SECTION_BORDER = 'var(--pres-card-border)';
const SUBCARD_BG = 'var(--pres-subcard)';
const SUBCARD_BORDER = 'var(--pres-elevated)';
const ZEBRA_BG = 'var(--pres-zebra)';
const CHEAPEST_BG = 'var(--pres-cheapest-bg)';

export default function PresentationColumn({ periodKey, snapshot, origens, sexos }: Props) {
  if (!snapshot) {
    return <EmptyColumn periodKey={periodKey} />;
  }

  if (periodKey === 'today' && isStale(snapshot)) {
    return <AwaitingTodayColumn snapshot={snapshot} />;
  }

  const rows = applyFilters(snapshot, { origens, sexos, period: periodKey });
  // Regra DUX-soberano: snapshot.totals (preco e base) sao sempre soberanos,
  // independente da selecao. originTotals (por origem) so e confiavel quando
  // ambos sexos estao selecionados, porque o "X Total" do DUX agrega FEMEA+MACHO.
  const sexosFull = sexos.length === 2;
  const duxOriginTotals = sexosFull ? snapshot.originTotals : undefined;
  const overall = computeOverall(rows, snapshot.totals, duxOriginTotals);
  const split = computeBoiVacaSplit(rows);
  const byOrigem = aggregateByOrigem(rows, duxOriginTotals);
  const validMedias = byOrigem.map((b) => b.precoMedioUSDKg).filter((n) => n > 0);
  const minMediaPrice = validMedias.length > 0 ? Math.min(...validMedias) : 0;

  return (
    <div className="flex flex-col h-full">
      <ColumnHeader periodKey={periodKey} snapshot={snapshot} />

      <div
        className="flex flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-5 sm:py-5 border-b"
        style={{ borderColor: SECTION_BORDER }}
      >
        <KPIBlock
          label="Cabecas compradas"
          value={formatNumber(overall.qtdCompra)}
          sizeClass="pcol-bignumber-cab"
        />
        <KPIBlock
          label="Preco medio"
          value={formatUSDPerKg(overall.precoMedioUSDKg)}
          accent
          sizeClass="pcol-bignumber-preco"
        />

        <BoiVacaSubCard split={split} />
      </div>

      <PriceByOriginTable byOrigem={byOrigem} minMediaPrice={minMediaPrice} />
    </div>
  );
}

function KPIBlock({
  label,
  value,
  accent = false,
  sizeClass,
}: {
  label: string;
  value: string;
  accent?: boolean;
  sizeClass: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="text-[10px] uppercase tracking-[0.2em] font-semibold"
        style={{ color: 'var(--pres-faint)' }}
      >
        {label}
      </div>
      <div
        className={`presentation-bignumber tabular font-bold ${sizeClass}`}
        style={{ color: accent ? 'var(--pres-accent)' : 'var(--pres-text)' }}
      >
        {value}
      </div>
    </div>
  );
}

function BoiVacaSubCard({
  split,
}: {
  split: ReturnType<typeof computeBoiVacaSplit>;
}) {
  return (
    <div
      className="rounded-xl border grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4"
      style={{ background: SUBCARD_BG, borderColor: SUBCARD_BORDER }}
    >
      <BoiVacaCell label={SEXO_LABELS.MACHO} value={split.boi.precoMedio} qtd={split.boi.qtd} tone="boi" />
      <div
        className="border-l pl-2 -ml-1 sm:pl-3"
        style={{ borderColor: 'var(--pres-card-border)' }}
      >
        <BoiVacaCell label={SEXO_LABELS.FEMEA} value={split.vaca.precoMedio} qtd={split.vaca.qtd} tone="vaca" />
      </div>
    </div>
  );
}

function BoiVacaCell({
  label,
  value,
  qtd,
  tone,
}: {
  label: string;
  value: number;
  qtd: number;
  tone: 'boi' | 'vaca';
}) {
  const accent = tone === 'vaca' ? 'var(--pres-accent)' : 'var(--pres-text-2)';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm" style={{ background: accent }} />
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-semibold"
          style={{ color: 'var(--pres-muted)' }}
        >
          {label}
        </span>
      </div>
      <div
        className="presentation-bignumber tabular font-bold pcol-boivaca-value"
        style={{ color: 'var(--pres-text)' }}
      >
        {formatUSDPerKg(value)}
      </div>
      <div className="text-[11px] tabular" style={{ color: 'var(--pres-faint)' }}>
        {formatNumber(qtd)} cab.
      </div>
    </div>
  );
}

interface PriceByOriginTableProps {
  byOrigem: ReturnType<typeof aggregateByOrigem>;
  minMediaPrice: number;
}

function PriceByOriginTable({ byOrigem, minMediaPrice }: PriceByOriginTableProps) {
  return (
    <div className="flex-1 flex flex-col px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-3 min-h-0">
      <div
        className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3"
        style={{ color: 'var(--pres-faint)' }}
      >
        Preco por origem
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="pcol-table-row px-2 py-2 mb-2 rounded-md border-b"
          style={{
            background: 'var(--pres-elevated)',
            borderColor: 'var(--pres-divider)',
          }}
        >
          <span
            className="text-[11px] uppercase tracking-[0.16em] font-bold"
            style={{ color: 'var(--pres-text-3)' }}
          >
            Origem
          </span>
          <span
            className="text-[11px] uppercase tracking-[0.16em] font-bold text-right"
            style={{ color: 'var(--pres-text-3)' }}
          >
            {SEXO_LABELS.MACHO}
          </span>
          <span
            className="text-[11px] uppercase tracking-[0.16em] font-bold text-right"
            style={{ color: 'var(--pres-text-3)' }}
          >
            {SEXO_LABELS.FEMEA}
          </span>
          <span
            className="text-[11px] uppercase tracking-[0.16em] font-bold text-right"
            style={{ color: 'var(--pres-text-3)' }}
          >
            Media
          </span>
          <span
            className="pcol-cell-base text-[11px] uppercase tracking-[0.16em] font-bold text-right"
            style={{ color: 'var(--pres-text-3)' }}
          >
            Base
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-around">
          {byOrigem.map((agg, idx) => {
            const boiPrice = agg.boi?.precoMedioUSDKg ?? 0;
            const vacaPrice = agg.vaca?.precoMedioUSDKg ?? 0;
            const mediaPrice = agg.precoMedioUSDKg;
            const basePrice = agg.valorKgBaseUSD;
            const isCheapestMedia = mediaPrice > 0 && mediaPrice === minMediaPrice;

            return (
              <div
                key={agg.origem}
                className="pcol-table-row px-2 py-2.5 rounded-md transition-colors"
                style={{
                  background: isCheapestMedia
                    ? CHEAPEST_BG
                    : idx % 2 === 1
                      ? ZEBRA_BG
                      : 'transparent',
                  borderLeft: isCheapestMedia
                    ? '2px solid var(--pres-accent)'
                    : '2px solid transparent',
                }}
              >
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span
                    className="font-mono pcol-origem-code flex-none"
                    style={{ color: isCheapestMedia ? 'var(--pres-accent)' : 'var(--pres-faint)' }}
                  >
                    {agg.origem}
                  </span>
                  <span
                    className="pcol-origem-name font-medium truncate"
                    style={{ color: isCheapestMedia ? 'var(--pres-accent)' : 'var(--pres-text-2)' }}
                  >
                    {ORIGEM_LABELS[agg.origem]}
                  </span>
                </div>
                <PriceCell value={boiPrice} highlight={false} />
                <PriceCell value={vacaPrice} highlight={false} />
                <PriceCell value={mediaPrice} highlight={isCheapestMedia} />
                <PriceCell value={basePrice ?? 0} highlight={false} subdued isBase />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PriceCell({
  value,
  highlight,
  subdued = false,
  isBase = false,
}: {
  value: number;
  highlight: boolean;
  subdued?: boolean;
  isBase?: boolean;
}) {
  const cellClass = isBase ? 'pcol-cell-base text-right' : 'text-right';
  if (value <= 0) {
    return (
      <span className={`${cellClass} tabular text-[0.9rem]`} style={{ color: 'var(--pres-dim)' }}>
        —
      </span>
    );
  }
  const color = highlight
    ? 'var(--pres-accent)'
    : subdued
      ? 'var(--pres-muted)'
      : 'var(--pres-text)';
  const sizeClass = subdued ? 'pcol-price-value-base' : 'pcol-price-value';
  return (
    <span
      className={`${cellClass} tabular whitespace-nowrap ${sizeClass}`}
      style={{
        color,
        fontWeight: highlight ? 700 : subdued ? 500 : 600,
        letterSpacing: '-0.01em',
      }}
    >
      <span style={{ opacity: subdued ? 0.55 : 0.7, marginRight: 1 }}>$</span>
      {formatNumber(value, 2)}
      <span
        className="pcol-suffix-kg text-[0.7em]"
        style={{ opacity: subdued ? 0.45 : 0.6, marginLeft: 1 }}
      >
        /kg
      </span>
    </span>
  );
}

function ColumnHeader({ periodKey, snapshot }: { periodKey: PeriodKey; snapshot: ComprasSnapshot }) {
  return (
    <div
      className="px-4 py-3 sm:px-5 sm:py-4 border-b"
      style={{
        background: 'var(--pres-subtle)',
        borderColor: SECTION_BORDER,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1"
        style={{ color: 'var(--pres-faint-2)' }}
      >
        Periodo
      </div>
      <h2
        className="text-xl sm:text-2xl xl:text-3xl font-bold tracking-tight leading-tight"
        style={{ color: 'var(--pres-text)', letterSpacing: '-0.02em' }}
      >
        {PERIOD_LABELS[periodKey]}
      </h2>
      <div className="text-xs sm:text-sm mt-1" style={{ color: 'var(--pres-faint)' }}>
        {snapshot.periodLabel}
      </div>
    </div>
  );
}

function EmptyColumn({ periodKey }: { periodKey: PeriodKey }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-3">
      <Clock4
        className="h-10 w-10 opacity-30"
        strokeWidth={1.5}
        style={{ color: 'var(--pres-muted)' }}
      />
      <div className="text-sm" style={{ color: 'var(--pres-muted)' }}>
        Sem dados para
        <br />
        <strong style={{ color: 'var(--pres-text)' }}>{PERIOD_LABELS[periodKey]}</strong>
      </div>
    </div>
  );
}

function AwaitingTodayColumn({ snapshot }: { snapshot: ComprasSnapshot }) {
  return (
    <div className="flex flex-col h-full">
      <ColumnHeader periodKey="today" snapshot={snapshot} />
      <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 px-5 py-8">
        <span
          className="inline-flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgba(227, 6, 19, 0.10)', color: 'var(--pres-accent)' }}
        >
          <Clock4 className="h-8 w-8" strokeWidth={1.5} />
        </span>
        <div>
          <div className="text-xl font-bold mb-2" style={{ color: 'var(--pres-text)' }}>
            Aguardando primeira captura
          </div>
          <p className="text-sm" style={{ color: 'var(--pres-muted)', maxWidth: 280 }}>
            O RPA inicia as 09:00. Ainda nao ha volume de compras relevante hoje.
          </p>
        </div>
        <div className="text-[11px]" style={{ color: 'var(--pres-faint)' }}>
          Ultima captura: {timeAgo(snapshot.capturedAt)}
        </div>
      </div>
    </div>
  );
}

function isStale(snapshot: ComprasSnapshot): boolean {
  const captured = new Date(snapshot.capturedAt);
  const now = new Date();
  return (
    captured.getFullYear() !== now.getFullYear() ||
    captured.getMonth() !== now.getMonth() ||
    captured.getDate() !== now.getDate()
  );
}
