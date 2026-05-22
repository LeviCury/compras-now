import type { AllSnapshots, ComprasSnapshot, PeriodKey } from '../types';
import { ORIGEM_LABELS, PERIOD_KEYS, PERIOD_SHORT_LABELS } from '../types';
import { aggregateByOrigem, computeOverall } from '../utils/analytics';
import { formatDateTime, formatNumber, formatUSDPerKg } from '../utils/formatters';

export function buildWhatsappMessage(
  snapshot: ComprasSnapshot,
  allSnapshots?: AllSnapshots,
): string {
  const overall = computeOverall(snapshot.rows, snapshot.totals, snapshot.originTotals);
  const byOrigem = aggregateByOrigem(snapshot.rows, snapshot.originTotals);
  const cheapest = overall.cheapestOrigem;
  const priciest = overall.priciestOrigem;

  const lines: string[] = [];
  lines.push('*Compras Now Executivo*');
  lines.push(`_${snapshot.periodLabel}_`);
  lines.push(`Capturado: ${formatDateTime(snapshot.capturedAt)}`);
  lines.push('');
  lines.push(
    `Cabecas: *${formatNumber(overall.qtdCompra)}* | Preco medio: *${formatUSDPerKg(overall.precoMedioUSDKg)}*`,
  );
  if (cheapest && priciest && cheapest !== priciest) {
    lines.push(
      `Mais barata: *${cheapest.label}* (${formatUSDPerKg(cheapest.precoMedioUSDKg)}) | Mais cara: *${priciest.label}* (${formatUSDPerKg(priciest.precoMedioUSDKg)})`,
    );
  }
  lines.push('');
  for (const agg of byOrigem) {
    const parts: string[] = [];
    if (agg.boi) parts.push(`Boi ${formatUSDPerKg(agg.boi.precoMedioUSDKg)}`);
    if (agg.vaca) parts.push(`Vaca ${formatUSDPerKg(agg.vaca.precoMedioUSDKg)}`);
    lines.push(`- ${ORIGEM_LABELS[agg.origem]}: ${parts.join(' / ')} (${formatNumber(agg.qtdCompra)} cab.)`);
  }

  if (allSnapshots) {
    lines.push('');
    lines.push('*Comparativo de periodos (preco medio geral)*');
    for (const p of PERIOD_KEYS) {
      const snap = allSnapshots[p];
      if (!snap) {
        lines.push(`- ${PERIOD_SHORT_LABELS[p]}: sem dados`);
        continue;
      }
      const o = computeOverall(snap.rows, snap.totals, snap.originTotals);
      lines.push(`- ${PERIOD_SHORT_LABELS[p]}: ${formatUSDPerKg(o.precoMedioUSDKg)}`);
    }
  }

  lines.push('');
  lines.push('Fonte: DUX > Minerva Reports > Relatorios de Controle > Compras Now');

  return lines.join('\n');
}

export function buildPeriodSwitchHint(period: PeriodKey): string {
  const map: Record<PeriodKey, string> = {
    today: 'Visao do dia em andamento.',
    yesterday: 'Fechamento real do dia anterior.',
    last7: 'Media ponderada dos ultimos 7 dias.',
    last30: 'Media ponderada dos ultimos 30 dias.',
  };
  return map[period];
}

export function openWhatsapp(message: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
