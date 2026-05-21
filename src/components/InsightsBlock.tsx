import { ArrowDown, ArrowUp, Lightbulb, TrendingDown, TrendingUp, Target } from 'lucide-react';
import type { ComprasRow } from '../types';
import { aggregateByOrigem, computeOverall } from '../utils/analytics';
import { formatNumber, formatUSD, formatUSDPerKg } from '../utils/formatters';

interface Props {
  rows: ComprasRow[];
}

type Tone = 'accent' | 'muted';

interface Insight {
  icon: typeof Lightbulb;
  tone: Tone;
  text: React.ReactNode;
}

export default function InsightsBlock({ rows }: Props) {
  const overall = computeOverall(rows);
  const byOrigem = aggregateByOrigem(rows);

  const cheapest = overall.cheapestOrigem;
  const priciest = overall.priciestOrigem;
  const arbitrage =
    cheapest && priciest && cheapest !== priciest
      ? {
          delta: priciest.precoMedioUSDKg - cheapest.precoMedioUSDKg,
          pct:
            cheapest.precoMedioUSDKg > 0
              ? (priciest.precoMedioUSDKg - cheapest.precoMedioUSDKg) / cheapest.precoMedioUSDKg
              : 0,
        }
      : null;

  const biggestVolume = [...byOrigem].sort((a, b) => b.qtdCompra - a.qtdCompra)[0];

  const insights: Insight[] = [];

  if (cheapest && priciest && arbitrage) {
    insights.push({
      icon: TrendingDown,
      tone: 'accent',
      text: (
        <>
          <strong style={{ color: 'var(--text)' }}>{cheapest.label}</strong> esta{' '}
          {formatUSDPerKg(cheapest.precoMedioUSDKg)} contra{' '}
          {formatUSDPerKg(priciest.precoMedioUSDKg)} em{' '}
          <strong style={{ color: 'var(--text)' }}>{priciest.label}</strong> - spread de{' '}
          <strong style={{ color: 'var(--accent)' }}>{formatUSDPerKg(arbitrage.delta)}</strong>{' '}
          ({(arbitrage.pct * 100).toFixed(1)}%) entre origens.
        </>
      ),
    });
  }

  if (biggestVolume) {
    insights.push({
      icon: TrendingUp,
      tone: 'muted',
      text: (
        <>
          <strong style={{ color: 'var(--text)' }}>{biggestVolume.label}</strong> concentra{' '}
          <strong style={{ color: 'var(--text)' }}>{formatNumber(biggestVolume.qtdCompra)}</strong>{' '}
          cabecas ({((biggestVolume.qtdCompra / Math.max(overall.qtdCompra, 1)) * 100).toFixed(0)}% do volume total).
        </>
      ),
    });
  }

  const boiVacaGaps = byOrigem
    .filter((agg) => agg.boi && agg.vaca)
    .map((agg) => ({
      origem: agg.label,
      gap: agg.boi!.precoMedioUSDKg - agg.vaca!.precoMedioUSDKg,
    }))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  if (boiVacaGaps[0] && Math.abs(boiVacaGaps[0].gap) > 0.1) {
    const top = boiVacaGaps[0];
    insights.push({
      icon: top.gap > 0 ? ArrowUp : ArrowDown,
      tone: 'muted',
      text: (
        <>
          Em <strong style={{ color: 'var(--text)' }}>{top.origem}</strong>, Boi esta{' '}
          {top.gap > 0 ? 'mais caro' : 'mais barato'} que Vaca em{' '}
          <strong style={{ color: 'var(--text)' }}>{formatUSDPerKg(Math.abs(top.gap))}</strong>.
        </>
      ),
    });
  }

  // Spread vs base: encontra a origem mais acima e a mais abaixo da base
  const spreads = byOrigem
    .filter((agg) => typeof agg.valorKgBaseUSD === 'number' && agg.valorKgBaseUSD > 0)
    .map((agg) => ({
      origem: agg.label,
      precoMedio: agg.precoMedioUSDKg,
      base: agg.valorKgBaseUSD as number,
      diff: agg.precoMedioUSDKg - (agg.valorKgBaseUSD as number),
    }));

  if (spreads.length > 0) {
    const worst = spreads.slice().sort((a, b) => b.diff - a.diff)[0];
    const best = spreads.slice().sort((a, b) => a.diff - b.diff)[0];

    if (best && best.diff < -0.05) {
      insights.push({
        icon: Target,
        tone: 'muted',
        text: (
          <>
            <strong style={{ color: 'var(--text)' }}>{best.origem}</strong> esta{' '}
            <strong style={{ color: '#10b981' }}>{formatUSD(Math.abs(best.diff), 2)} abaixo</strong>{' '}
            da base ({formatUSDPerKg(best.precoMedio)} vs base {formatUSDPerKg(best.base)}). Boa
            oportunidade.
          </>
        ),
      });
    }

    if (worst && worst !== best && worst.diff > 0.05) {
      insights.push({
        icon: Target,
        tone: 'accent',
        text: (
          <>
            <strong style={{ color: 'var(--text)' }}>{worst.origem}</strong> esta{' '}
            <strong style={{ color: 'var(--accent)' }}>{formatUSD(worst.diff, 2)} acima</strong> da
            base ({formatUSDPerKg(worst.precoMedio)} vs base {formatUSDPerKg(worst.base)}). Atencao
            ao premium pago.
          </>
        ),
      });
    }
  }

  return (
    <div className="card-padded flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4" strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ letterSpacing: '-0.01em' }}
        >
          Insights rapidos
        </h2>
      </div>
      <ul className="space-y-3">
        {insights.map((insight, idx) => {
          const styles =
            insight.tone === 'accent'
              ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' };
          return (
            <li
              key={idx}
              className="flex items-start gap-3 text-sm leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              <span
                className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-md"
                style={styles}
              >
                <insight.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <span>{insight.text}</span>
            </li>
          );
        })}
        {insights.length === 0 && (
          <li className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Aguardando dados suficientes para gerar insights.
          </li>
        )}
      </ul>
    </div>
  );
}
