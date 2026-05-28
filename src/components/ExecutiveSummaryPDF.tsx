import { forwardRef } from 'react';
import type { AllSnapshots, ComprasSnapshot, Origem } from '../types';
import { ORIGEM_LABELS } from '../types';
import { aggregateByOrigem, computeOverall, type OrigemAggregate } from '../utils/analytics';
import { formatNumber } from '../utils/formatters';

interface Props {
  snapshot: ComprasSnapshot;
  allSnapshots?: AllSnapshots;
}

/* ============================================================================
   PALETA - identidade Minerva oficial (azure escuro + vermelho Minerva)
============================================================================ */
const C = {
  // Fundo geral: off-white com leve tom azulado. Faz os cards brancos
  // ganharem profundidade visual (sem ficar tudo "morto" em branco puro).
  pageBg: '#f8fafc',
  cardBg: '#ffffff',

  // Minerva azure escuro (azulado, nao slate puro)
  navyDeep: '#0d1820',
  navy: '#172a39',          // Azure escuro Minerva
  navyMid: '#2c3d4c',       // Azure acizendato Minerva
  navyText: '#f8fafc',
  navySoft: '#a8b5c2',      // texto secundario sobre navy

  // ink (texto sobre fundo branco)
  ink: '#172a39',           // Azure escuro Minerva
  inkSoft: '#3d5366',
  inkMuted: '#64748b',
  inkFaint: '#94a3b8',

  // bordas e backgrounds neutros
  border: '#e2e8f0',
  borderSoft: '#f1f5f9',
  zebra: '#fbfcfd',
  bgSubtle: '#f1f5f9',      // fundo de badge / ícone (usado nos KPI cards)

  // acento Minerva (vermelho oficial)
  brand: '#e34852',
  brandSoft: '#fdf2f2',     // background super sutil de destaque

  // total row - destaque sutil com tom Minerva sand
  totalRowBg: '#f6f4ec',    // sand pastel super sutil (compativel com #afae89)
  totalRowBorder: '#cbd5e1',

  // spread - mantem semaforo mas alinha vermelho com Minerva
  spreadUp: '#c53842',
  spreadUpBg: '#fdecee',
  spreadDown: '#0e8a5f',
  spreadDownBg: '#e8f5ee',
  spreadFlatBg: '#eef2f6',
} as const;

// Bullets coloridos respeitando a paleta Minerva oficial. Cada origem ganha
// identidade visual propria mas todas as cores sao da paleta corporativa:
// azure vibrante, verde sobrio (mesmo do spreadDown), sand apagado,
// vermelho Minerva e azure acinzentado.
const ORIGEM_BULLETS: Record<Origem, string> = {
  AR: '#145a86', // azure vibrante Minerva
  BR: '#0e8a5f', // verde sobrio (alinhado com spreadDown)
  CO: '#afae89', // sand apagado Minerva
  PY: '#e34852', // vermelho Minerva (brand)
  UY: '#2c3d4c', // azure acinzentado Minerva
};

const ORIGENS_FIXAS: Origem[] = ['AR', 'BR', 'CO', 'PY', 'UY'];

// Cor de accent (border-left) dos 4 KPI cards. Cada um ganha um tom Minerva
// diferente pra dar variacao sem fugir da paleta corporativa.
const KPI_ACCENTS = {
  ontem: '#e34852',   // vermelho Minerva
  semanal: '#2e5371', // azure medio
  mensal: '#145a86',  // azure vibrante
  preco: '#afae89',   // sand apagado
} as const;

/* ============================================================================
   PAGE STYLE
============================================================================ */
const PAGE_STYLE: React.CSSProperties = {
  width: '794px',
  height: '1123px',
  // Fundo geral off-white sutil. Cards brancos sobre essa base ficam com
  // mais "papel" e profundidade (igual o dashboard light do sistema).
  background: C.pageBg,
  color: C.ink,
  fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
};

const BODY_STYLE: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '18px 38px 18px',
  boxSizing: 'border-box',
};

const ExecutiveSummaryPDF = forwardRef<HTMLDivElement, Props>(function ExecutiveSummaryPDF(
  { snapshot, allSnapshots },
  ref,
) {
  const ontem = pickYesterdaySnapshot(allSnapshots, snapshot);
  const semanal = allSnapshots?.last7 ?? null;
  const mensal = allSnapshots?.last30 ?? null;

  const reportIso = ontem?.capturedAt ?? snapshot.capturedAt;

  const ontemOverall = ontem
    ? computeOverall(ontem.rows, ontem.totals, ontem.originTotals)
    : null;
  const semanalOverall = semanal
    ? computeOverall(semanal.rows, semanal.totals, semanal.originTotals)
    : null;
  const mensalOverall = mensal
    ? computeOverall(mensal.rows, mensal.totals, mensal.originTotals)
    : null;

  return (
    <div ref={ref}>
      <div data-pdf-page="1" style={PAGE_STYLE}>
        <ReportHeader reportIso={reportIso} />
        <RedRibbon />

        <div style={BODY_STYLE}>
          <KpiCardsRow
            ontemQtd={ontemOverall?.qtdCompra ?? null}
            semanalQtd={semanalOverall?.qtdCompra ?? null}
            mensalQtd={mensalOverall?.qtdCompra ?? null}
            precoOntem={ontemOverall?.precoMedioUSDKg ?? null}
          />

          <PeriodBlock label="ONTEM" subtitle={formatBlockDate(ontem)} snapshot={ontem} />
          <PeriodBlock
            label="SEMANAL"
            subtitle={formatBlockRange(semanal)}
            snapshot={semanal}
          />
          <PeriodBlock
            label="MENSAL"
            subtitle={formatBlockRange(mensal)}
            snapshot={mensal}
          />

          <div style={{ flex: 1, minHeight: 8 }} />

          <ReportFooter />
        </div>
      </div>
    </div>
  );
});

export default ExecutiveSummaryPDF;

/* ============================================================================
   HEADER - faixa navy borda-a-borda + identidade Minerva
============================================================================ */

function ReportHeader({ reportIso }: { reportIso: string }) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyDeep} 100%)`,
        color: C.navyText,
        padding: '20px 38px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <img
          src="/favicon.png"
          alt="Minerva Foods"
          width={44}
          height={44}
          style={{
            width: 44,
            height: 44,
            borderRadius: 9,
            objectFit: 'contain',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: 4,
            boxSizing: 'border-box',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
          }}
        />
        <div>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              color: C.brand,
              letterSpacing: '0.22em',
              marginBottom: 4,
            }}
          >
            MINERVA FOODS &middot; COMPRAS NOW EXECUTIVO
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: 0,
              lineHeight: 1.05,
              color: '#ffffff',
            }}
          >
            Compra de Gado
          </h1>
          <div
            style={{
              fontSize: 11,
              color: C.navySoft,
              marginTop: 5,
              letterSpacing: '0.01em',
            }}
          >
            Resumo executivo &middot; Precos em USD/kg &middot; Fonte: DUX
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right', paddingTop: 2 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: C.navySoft,
            letterSpacing: '0.18em',
            marginBottom: 4,
          }}
        >
          DATA DO REPORT
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.015em',
            color: '#ffffff',
            lineHeight: 1.1,
          }}
        >
          {formatReportDate(reportIso)}
        </div>
        <div
          style={{
            fontSize: 10,
            color: C.navySoft,
            marginTop: 4,
            letterSpacing: '0.04em',
            fontWeight: 600,
          }}
        >
          {formatReportTime(reportIso)}
        </div>
        {/* Credito da equipe responsavel - posicionado no header pra ficar
            visivel logo de cara e nao competir por espaco com o conteudo. */}
        <div
          style={{
            fontSize: 9,
            color: C.navySoft,
            marginTop: 10,
            letterSpacing: '0.04em',
            fontWeight: 500,
            textAlign: 'right',
          }}
        >
          Desenvolvido por{' '}
          <strong
            style={{
              color: C.brand,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            HyperAutomation Team
          </strong>{' '}
          &middot; TI Minerva
        </div>
      </div>
    </div>
  );
}

function RedRibbon() {
  return (
    <div
      style={{
        height: 3,
        background: C.brand,
        flexShrink: 0,
      }}
    />
  );
}

/* ============================================================================
   KPI CARDS - altura uniforme com flex column space-between
============================================================================ */

function KpiCardsRow({
  ontemQtd,
  semanalQtd,
  mensalQtd,
  precoOntem,
}: {
  ontemQtd: number | null;
  semanalQtd: number | null;
  mensalQtd: number | null;
  precoOntem: number | null;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 18,
      }}
    >
      <KpiCard label="COMPRA DE ONTEM" value={fmtCount(ontemQtd)} unit="cab" icon={<IconCalendarDay />} accentColor={KPI_ACCENTS.ontem} />
      <KpiCard label="COMPRA SEMANAL" value={fmtCount(semanalQtd)} unit="cab" icon={<IconCalendarWeek />} accentColor={KPI_ACCENTS.semanal} />
      <KpiCard label="COMPRA MENSAL" value={fmtCount(mensalQtd)} unit="cab" icon={<IconCalendarMonth />} accentColor={KPI_ACCENTS.mensal} />
      <KpiCard label="PRECO MEDIO ONTEM" value={fmtPrice(precoOntem)} unit="/kg" icon={<IconDollar />} accentColor={KPI_ACCENTS.preco} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  icon,
  accentColor,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div
      style={{
        background: C.cardBg,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 82,
        boxSizing: 'border-box',
        position: 'relative',
        // Sombra mais presente, igual cards do sistema light
        boxShadow: '0 2px 8px rgba(23, 42, 57, 0.06), 0 1px 2px rgba(23, 42, 57, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: 8.5,
            fontWeight: 800,
            color: C.inkMuted,
            letterSpacing: '0.18em',
            lineHeight: 1.1,
          }}
        >
          {label}
        </span>
        {/* Icone em badge colorido (fundo soft do accent + icone na cor cheia).
            Igual o estilo dos cards do dashboard. */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 6,
            background: `${accentColor}1f`, // ~12% alpha
            color: accentColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 5,
          marginTop: 6,
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.ink,
            letterSpacing: '-0.028em',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: C.inkMuted,
            letterSpacing: 0,
            lineHeight: 1,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

/* ---- KPI icons ---- */

function IconCalendarDay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="12" cy="16" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCalendarWeek() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2" />
    </svg>
  );
}

function IconCalendarMonth() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2M15 18h2" />
    </svg>
  );
}

function IconDollar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
    </svg>
  );
}

/* ============================================================================
   PERIOD BLOCK
============================================================================ */

function PeriodBlock({
  label,
  subtitle,
  snapshot,
}: {
  label: string;
  subtitle: string;
  snapshot: ComprasSnapshot | null;
}) {
  const overall = snapshot
    ? computeOverall(snapshot.rows, snapshot.totals, snapshot.originTotals)
    : null;
  const byOrigemArr = snapshot
    ? aggregateByOrigem(snapshot.rows, snapshot.originTotals)
    : [];
  const byOrigem: Partial<Record<Origem, OrigemAggregate>> = {};
  for (const agg of byOrigemArr) {
    byOrigem[agg.origem] = agg;
  }

  // Base total: prefere o valor do DUX, calcula como fallback.
  const totalBase =
    typeof snapshot?.totals.valorKgBaseUSD === 'number'
      ? snapshot.totals.valorKgBaseUSD
      : snapshot
        ? computeWeightedBase(snapshot)
        : null;

  return (
    <section
      style={{
        marginBottom: 14,
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${C.border}`,
        background: C.cardBg,
        // Mesma sombra dos cards KPI = consistencia + profundidade.
        boxShadow: '0 2px 8px rgba(23, 42, 57, 0.06), 0 1px 2px rgba(23, 42, 57, 0.04)',
      }}
    >
      {/* Header escuro do bloco - Minerva azure com borda lateral vermelha sutil */}
      <div
        style={{
          background: `linear-gradient(180deg, ${C.navyMid} 0%, ${C.navy} 100%)`,
          color: C.navyText,
          padding: '11px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: `3px solid ${C.brand}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 11 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#ffffff',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 10.5,
              color: C.navySoft,
              letterSpacing: '0.02em',
              fontWeight: 500,
            }}
          >
            {subtitle}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            {overall ? `${formatNumber(overall.qtdCompra)} cab` : '—'}
          </span>
          <span
            style={{
              fontSize: 9.5,
              color: C.navySoft,
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}
          >
            Total comprado
          </span>
        </div>
      </div>

      {/* Tabela */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: C.cardBg,
        }}
      >
        <thead>
          <tr style={{ background: C.bgSubtle }}>
            {['Origem', 'Cabecas', 'Preco/Kg', 'Base/Kg', 'Spread'].map((col, idx) => (
              <th
                key={col}
                style={{
                  ...thStyle,
                  textAlign: idx === 0 ? 'left' : 'right',
                  width: idx === 0 ? '30%' : idx === 1 ? '17%' : idx === 4 ? '19%' : '17%',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ORIGENS_FIXAS.map((origem, idx) => (
            <OriginRow
              key={origem}
              origem={origem}
              agg={byOrigem[origem]}
              striped={idx % 2 === 1}
            />
          ))}
          <TotalRow overall={overall} totalBase={totalBase} />
        </tbody>
      </table>
    </section>
  );
}

function OriginRow({
  origem,
  agg,
  striped,
}: {
  origem: Origem;
  agg: OrigemAggregate | undefined;
  striped: boolean;
}) {
  const hasData = agg && agg.qtdCompra > 0;
  const labelColor = hasData ? C.ink : C.inkFaint;
  const bulletColor = hasData ? ORIGEM_BULLETS[origem] : C.inkFaint;

  return (
    <tr
      style={{
        borderTop: `1px solid ${C.borderSoft}`,
        background: striped ? C.zebra : 'transparent',
      }}
    >
      <td style={{ ...tdStyle }}>
        {/* Alinhamento bulletproof: o bullet de 8px e o label de 10.5px ficam
            centralizados verticalmente pela mesma lineHeight (1.4) no container.
            html2canvas respeita inline-block + vertical-align middle bem
            consistente. */}
        <span style={{ display: 'inline-block', lineHeight: 1.4, verticalAlign: 'middle' }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: bulletColor,
              verticalAlign: 'middle',
              marginRight: 8,
              boxShadow: `0 0 0 2px ${striped ? C.zebra : '#ffffff'}, 0 0 0 2.5px ${bulletColor}20`,
            }}
          />
          <span
            style={{
              fontWeight: 700,
              color: labelColor,
              fontSize: 10.5,
              verticalAlign: 'middle',
            }}
          >
            {ORIGEM_LABELS[origem]}
          </span>
        </span>
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', color: labelColor, fontWeight: 500 }}>
        {hasData ? formatNumber(agg.qtdCompra) : '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', color: labelColor, fontWeight: 500 }}>
        {hasData ? fmtPrice(agg.precoMedioUSDKg) : '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', color: labelColor, fontWeight: 500 }}>
        {hasData && agg.valorKgBaseUSD != null ? fmtPrice(agg.valorKgBaseUSD) : '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        {hasData ? (
          <SpreadBadge preco={agg.precoMedioUSDKg} base={agg.valorKgBaseUSD} />
        ) : (
          <span style={{ color: C.inkFaint }}>—</span>
        )}
      </td>
    </tr>
  );
}

function TotalRow({
  overall,
  totalBase,
}: {
  overall: ReturnType<typeof computeOverall> | null;
  totalBase: number | null;
}) {
  if (!overall) {
    return (
      <tr style={{ background: C.totalRowBg, borderTop: `2px solid ${C.navyMid}` }}>
        <td style={{ ...tdStyle, fontWeight: 800, fontSize: 11, color: C.navy }}>Total</td>
        <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', color: C.inkFaint }}>
          sem dados
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ background: C.totalRowBg, borderTop: `2px solid ${C.navyMid}` }}>
      <td style={{ ...tdStyle, fontWeight: 800, fontSize: 11, color: C.navy }}>Total</td>
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: C.navy }}>
        {formatNumber(overall.qtdCompra)}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: C.navy }}>
        {fmtPrice(overall.precoMedioUSDKg)}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: C.navy }}>
        {totalBase != null ? fmtPrice(totalBase) : '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        {totalBase != null ? (
          <SpreadBadge preco={overall.precoMedioUSDKg} base={totalBase} bold />
        ) : (
          <span style={{ color: C.inkFaint }}>—</span>
        )}
      </td>
    </tr>
  );
}

/* ============================================================================
   SPREAD BADGE - alinhamento corrigido
============================================================================ */

function SpreadBadge({
  preco,
  base,
  bold = false,
}: {
  preco: number;
  base: number | null | undefined;
  bold?: boolean;
}) {
  if (base == null || base <= 0) {
    return <span style={{ color: C.inkFaint }}>—</span>;
  }
  const diff = preco - base;

  // Tecnica classica: line-height === height garante centralizacao vertical
  // matematica em inline-block, independente de ascenders/descenders do glyph
  // (triangulos UTF como ▲▼ tem visual offset). html2canvas respeita isso
  // bulletproof porque nao tem flex nem spans aninhados.
  const baseStyle: React.CSSProperties = {
    display: 'inline-block',
    height: 24,
    lineHeight: '24px',
    padding: '0 12px',
    borderRadius: 5,
    fontWeight: 700,
    fontSize: 10.5,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    letterSpacing: '0.01em',
    fontVariantNumeric: 'tabular-nums',
  };

  if (Math.abs(diff) < 0.005) {
    return (
      <span
        style={{
          ...baseStyle,
          background: C.spreadFlatBg,
          color: C.inkMuted,
          fontWeight: 600,
          fontSize: 9.5,
        }}
      >
        em linha
      </span>
    );
  }
  const isAbove = diff > 0;
  const abs = Math.abs(diff);
  const palette = isAbove
    ? { color: C.spreadUp, bg: C.spreadUpBg }
    : { color: C.spreadDown, bg: C.spreadDownBg };

  // Tudo numa string unica: triangulo + espaco + valor. Sem children, sem spans
  // aninhados, sem flex. html2canvas renderiza isso como texto puro de forma 100% confiavel.
  const text = `${isAbove ? '▲' : '▼'} $${formatNumber(abs, 2)}`;

  return (
    <span
      style={{
        ...baseStyle,
        background: palette.bg,
        color: palette.color,
        fontWeight: bold ? 800 : 700,
      }}
    >
      {text}
    </span>
  );
}

/* ============================================================================
   FOOTER
============================================================================ */

function ReportFooter() {
  return (
    <footer
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 9.5,
        color: C.inkMuted,
      }}
    >
      <span style={{ letterSpacing: '0.01em' }}>
        Gerado automaticamente &middot; Compras Now Executivo &middot; DUX
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, lineHeight: 1 }}>
          <span style={{ color: C.spreadDown, fontSize: 10 }}>▼</span>
          abaixo da base
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, lineHeight: 1 }}>
          <span style={{ color: C.spreadUp, fontSize: 10 }}>▲</span>
          acima da base
        </span>
      </span>
      <span
        style={{
          fontWeight: 800,
          color: C.navy,
          letterSpacing: '0.12em',
          fontSize: 11,
        }}
      >
        MINERVA FOODS
      </span>
    </footer>
  );
}

/* ============================================================================
   ESTILOS COMPARTILHADOS
============================================================================ */

const thStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: C.inkSoft,
  lineHeight: 1.2,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 10.5,
  verticalAlign: 'middle',
  lineHeight: 1.3,
};

/* ============================================================================
   HELPERS
============================================================================ */

function pickYesterdaySnapshot(
  allSnapshots: AllSnapshots | undefined,
  fallback: ComprasSnapshot,
): ComprasSnapshot | null {
  // Por design, o relatorio executivo do CEO traz o fechamento real do dia
  // anterior (capturado pelo RPA na manha seguinte as ~06h). Se por algum
  // motivo yesterday nao estiver disponivel, caimos no snapshot ativo do
  // dashboard como fallback.
  if (allSnapshots?.yesterday) return allSnapshots.yesterday;
  return fallback ?? null;
}

function computeWeightedBase(snapshot: ComprasSnapshot): number | null {
  const rowsWithBase = snapshot.rows.filter(
    (r) => typeof r.valorKgBaseUSD === 'number' && r.valorKgBaseUSD > 0,
  );
  if (rowsWithBase.length === 0) return null;
  const num = rowsWithBase.reduce(
    (acc, r) => acc + (r.valorKgBaseUSD ?? 0) * r.qtdCompra * r.pesoMedioKg,
    0,
  );
  const den = rowsWithBase.reduce((acc, r) => acc + r.qtdCompra * r.pesoMedioKg, 0);
  return den > 0 ? num / den : null;
}

function fmtCount(value: number | null): string {
  if (value == null) return '—';
  return formatNumber(value);
}

function fmtPrice(value: number | null | undefined, withDollar = true): string {
  if (value == null) return '—';
  if (!withDollar) return formatNumber(value, 2);
  return `$${formatNumber(value, 2)}`;
}

const MONTH_ABBR = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function formatReportDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatReportTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Snapshot ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatBlockDate(snapshot: ComprasSnapshot | null): string {
  if (!snapshot) return '—';
  const d = new Date(snapshot.periodTo);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function formatBlockRange(snapshot: ComprasSnapshot | null): string {
  if (!snapshot) return '—';
  const from = new Date(snapshot.periodFrom);
  const to = new Date(snapshot.periodTo);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(from.getDate())}/${pad(from.getMonth() + 1)} — ${pad(to.getDate())}/${pad(to.getMonth() + 1)}`;
}
