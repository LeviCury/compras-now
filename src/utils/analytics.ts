import type {
  ComprasRow,
  ComprasSnapshot,
  DashboardFilters,
  IntradayPoint,
  Origem,
  Sexo,
} from '../types';
import { ORIGEM_LABELS } from '../types';

export function applyFilters(snapshot: ComprasSnapshot, filters: DashboardFilters): ComprasRow[] {
  return snapshot.rows.filter(
    (row) => filters.origens.includes(row.origem) && filters.sexos.includes(row.sexo),
  );
}

export interface OrigemAggregate {
  origem: Origem;
  label: string;
  qtdCompra: number;
  pesoMedioKg: number;
  precoMedioUSDKg: number;
  valorKgBaseUSD: number | null;
  boi: {
    qtdCompra: number;
    pesoMedioKg: number;
    precoMedioUSDKg: number;
    valorKgBaseUSD: number | null;
  } | null;
  vaca: {
    qtdCompra: number;
    pesoMedioKg: number;
    precoMedioUSDKg: number;
    valorKgBaseUSD: number | null;
  } | null;
}

function weightedAverage(items: Array<{ value: number; weight: number }>): number {
  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight === 0) return 0;
  return items.reduce((acc, item) => acc + item.value * item.weight, 0) / totalWeight;
}

export function aggregateByOrigem(rows: ComprasRow[]): OrigemAggregate[] {
  const map = new Map<Origem, ComprasRow[]>();
  for (const row of rows) {
    const existing = map.get(row.origem) ?? [];
    existing.push(row);
    map.set(row.origem, existing);
  }

  return Array.from(map.entries())
    .map(([origem, rowsForOrigem]) => {
      const qtdCompra = rowsForOrigem.reduce((acc, r) => acc + r.qtdCompra, 0);
      const pesoMedioKg = weightedAverage(
        rowsForOrigem.map((r) => ({ value: r.pesoMedioKg, weight: r.qtdCompra })),
      );
      const precoMedioUSDKg = weightedAverage(
        rowsForOrigem.map((r) => ({ value: r.precoMedioUSDKg, weight: r.qtdCompra * r.pesoMedioKg })),
      );
      const baseRows = rowsForOrigem.filter((r) => typeof r.valorKgBaseUSD === 'number' && r.valorKgBaseUSD > 0);
      const valorKgBaseUSD =
        baseRows.length === 0
          ? null
          : weightedAverage(
              baseRows.map((r) => ({
                value: r.valorKgBaseUSD ?? 0,
                weight: r.qtdCompra * r.pesoMedioKg,
              })),
            );
      const macho = rowsForOrigem.find((r) => r.sexo === 'MACHO');
      const femea = rowsForOrigem.find((r) => r.sexo === 'FEMEA');
      return {
        origem,
        label: ORIGEM_LABELS[origem],
        qtdCompra,
        pesoMedioKg,
        precoMedioUSDKg,
        valorKgBaseUSD,
        boi: macho
          ? {
              qtdCompra: macho.qtdCompra,
              pesoMedioKg: macho.pesoMedioKg,
              precoMedioUSDKg: macho.precoMedioUSDKg,
              valorKgBaseUSD: macho.valorKgBaseUSD ?? null,
            }
          : null,
        vaca: femea
          ? {
              qtdCompra: femea.qtdCompra,
              pesoMedioKg: femea.pesoMedioKg,
              precoMedioUSDKg: femea.precoMedioUSDKg,
              valorKgBaseUSD: femea.valorKgBaseUSD ?? null,
            }
          : null,
      } satisfies OrigemAggregate;
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export interface OverallTotals {
  qtdCompra: number;
  pesoMedioKg: number;
  precoMedioUSDKg: number;
  origensAtivas: number;
  cheapestOrigem: OrigemAggregate | null;
  priciestOrigem: OrigemAggregate | null;
}

export function computeOverall(rows: ComprasRow[]): OverallTotals {
  const qtdCompra = rows.reduce((acc, r) => acc + r.qtdCompra, 0);
  const pesoMedioKg = weightedAverage(
    rows.map((r) => ({ value: r.pesoMedioKg, weight: r.qtdCompra })),
  );
  const precoMedioUSDKg = weightedAverage(
    rows.map((r) => ({ value: r.precoMedioUSDKg, weight: r.qtdCompra * r.pesoMedioKg })),
  );
  const byOrigem = aggregateByOrigem(rows);
  const sorted = [...byOrigem].sort((a, b) => a.precoMedioUSDKg - b.precoMedioUSDKg);
  return {
    qtdCompra,
    pesoMedioKg,
    precoMedioUSDKg,
    origensAtivas: byOrigem.length,
    cheapestOrigem: sorted[0] ?? null,
    priciestOrigem: sorted[sorted.length - 1] ?? null,
  };
}

export interface PriceBySexoBar {
  origem: Origem;
  label: string;
  Boi: number;
  Vaca: number;
  qtdBoi: number;
  qtdVaca: number;
}

export function priceBySexoSeries(rows: ComprasRow[]): PriceBySexoBar[] {
  const byOrigem = aggregateByOrigem(rows);
  return byOrigem.map((agg) => ({
    origem: agg.origem,
    label: agg.label,
    Boi: agg.boi?.precoMedioUSDKg ?? 0,
    Vaca: agg.vaca?.precoMedioUSDKg ?? 0,
    qtdBoi: agg.boi?.qtdCompra ?? 0,
    qtdVaca: agg.vaca?.qtdCompra ?? 0,
  }));
}

export interface VolumeBar {
  origem: Origem;
  label: string;
  Boi: number;
  Vaca: number;
  total: number;
}

export function volumeSeries(rows: ComprasRow[]): VolumeBar[] {
  const byOrigem = aggregateByOrigem(rows);
  return byOrigem.map((agg) => ({
    origem: agg.origem,
    label: agg.label,
    Boi: agg.boi?.qtdCompra ?? 0,
    Vaca: agg.vaca?.qtdCompra ?? 0,
    total: agg.qtdCompra,
  }));
}

export interface IntradaySeriesPoint {
  capturedAt: string;
  time: string;
  AR?: number;
  BR?: number;
  CO?: number;
  PY?: number;
  UY?: number;
  geral?: number;
}

export function buildIntradaySeries(
  history: IntradayPoint[],
  origens: Origem[],
  sexo: Sexo | 'TODOS' = 'TODOS',
): IntradaySeriesPoint[] {
  return history
    .slice()
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .map((point) => {
      const filtered =
        sexo === 'TODOS' ? point.byOrigem : point.byOrigem.filter((p) => p.sexo === sexo);
      const map = new Map<Origem, { value: number; weight: number }[]>();
      for (const item of filtered) {
        if (!origens.includes(item.origem)) continue;
        const existing = map.get(item.origem) ?? [];
        existing.push({ value: item.precoMedioUSDKg, weight: item.qtdCompra });
        map.set(item.origem, existing);
      }
      const out: IntradaySeriesPoint = {
        capturedAt: point.capturedAt,
        time: point.capturedAt.slice(11, 16),
      };
      for (const [origem, vals] of map.entries()) {
        out[origem] = weightedAverage(vals);
      }
      out.geral = point.totals.precoMedioUSDKg;
      return out;
    });
}

export interface BoiVacaSplit {
  totalQtd: number;
  boi: { qtd: number; pct: number; precoMedio: number };
  vaca: { qtd: number; pct: number; precoMedio: number };
}

export function computeBoiVacaSplit(rows: ComprasRow[]): BoiVacaSplit {
  const boiRows = rows.filter((r) => r.sexo === 'MACHO');
  const vacaRows = rows.filter((r) => r.sexo === 'FEMEA');
  const totalQtd = rows.reduce((acc, r) => acc + r.qtdCompra, 0);
  const boiQtd = boiRows.reduce((acc, r) => acc + r.qtdCompra, 0);
  const vacaQtd = vacaRows.reduce((acc, r) => acc + r.qtdCompra, 0);
  return {
    totalQtd,
    boi: {
      qtd: boiQtd,
      pct: totalQtd === 0 ? 0 : boiQtd / totalQtd,
      precoMedio: weightedAverage(
        boiRows.map((r) => ({ value: r.precoMedioUSDKg, weight: r.qtdCompra * r.pesoMedioKg })),
      ),
    },
    vaca: {
      qtd: vacaQtd,
      pct: totalQtd === 0 ? 0 : vacaQtd / totalQtd,
      precoMedio: weightedAverage(
        vacaRows.map((r) => ({ value: r.precoMedioUSDKg, weight: r.qtdCompra * r.pesoMedioKg })),
      ),
    },
  };
}
