import type {
  AllSnapshots,
  ComprasSnapshot,
  IntradayPoint,
  IntradayResponse,
  Origem,
  OriginTotals,
  PeriodKey,
  Sexo,
  Totals,
} from '../types';

interface MockBaseRow {
  origem: Origem;
  sexo: Sexo;
  qtd: number;
  peso: number;
  preco: number;
  base?: number;
}

const BASE_ROWS: MockBaseRow[] = [
  { origem: 'AR', sexo: 'FEMEA', qtd: 1021, peso: 498.54, preco: 3.97 },
  { origem: 'AR', sexo: 'MACHO', qtd: 8175, peso: 501.13, preco: 5.51 },
  { origem: 'BR', sexo: 'FEMEA', qtd: 3127, peso: 213.46, preco: 4.48, base: 4.5 },
  { origem: 'BR', sexo: 'MACHO', qtd: 3633, peso: 286.35, preco: 4.67, base: 4.88 },
  { origem: 'CO', sexo: 'FEMEA', qtd: 408, peso: 283.04, preco: 4.36 },
  { origem: 'CO', sexo: 'MACHO', qtd: 283, peso: 256.22, preco: 5.21 },
  { origem: 'PY', sexo: 'FEMEA', qtd: 1966, peso: 194.6, preco: 4.91, base: 4.78 },
  { origem: 'PY', sexo: 'MACHO', qtd: 1578, peso: 209.64, preco: 5.04, base: 4.9 },
  { origem: 'UY', sexo: 'FEMEA', qtd: 302, peso: 249.86, preco: 5.22 },
  { origem: 'UY', sexo: 'MACHO', qtd: 534, peso: 285.34, preco: 5.76 },
];

interface SnapshotProfile {
  qtdFactor: number;
  precoFactor: number;
  daysAgo: number;
}

const PROFILES: Record<PeriodKey, SnapshotProfile> = {
  today: { qtdFactor: 0.4, precoFactor: 1.03, daysAgo: 0 },
  yesterday: { qtdFactor: 1.0, precoFactor: 1.0, daysAgo: 1 },
  last7: { qtdFactor: 6.5, precoFactor: 0.99, daysAgo: 4 },
  last30: { qtdFactor: 27.0, precoFactor: 0.97, daysAgo: 15 },
};

const PERIOD_LABEL_FORMAT: Record<PeriodKey, (now: Date) => { label: string; from: Date; to: Date }> = {
  today: (now) => ({
    label: `Hoje (${formatDay(now)})`,
    from: startOfDay(now),
    to: now,
  }),
  yesterday: (now) => {
    const y = addDays(now, -1);
    return {
      label: `Ontem (${formatDay(y)})`,
      from: startOfDay(y),
      to: endOfDay(y),
    };
  },
  last7: (now) => {
    const to = endOfDay(addDays(now, -1));
    const from = startOfDay(addDays(now, -7));
    return { label: `Ultimos 7 dias (${formatDay(from)} - ${formatDay(to)})`, from, to };
  },
  last30: (now) => {
    const to = endOfDay(addDays(now, -1));
    const from = startOfDay(addDays(now, -30));
    return { label: `Ultimos 30 dias (${formatDay(from)} - ${formatDay(to)})`, from, to };
  },
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function formatDay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Em produc\u00e3o, `originTotals` vem direto do DUX (linhas "X Total"). No mock
 * reproduzimos isso agregando as linhas FEMEA/MACHO pra manter consist\u00eancia.
 */
function buildOriginTotalsFromRows(rows: ComprasSnapshot['rows']): OriginTotals {
  const map = new Map<Origem, ComprasSnapshot['rows']>();
  for (const row of rows) {
    const existing = map.get(row.origem) ?? [];
    existing.push(row);
    map.set(row.origem, existing);
  }
  const out: Partial<Record<Origem, Totals>> = {};
  for (const [origem, list] of map.entries()) {
    const qtd = list.reduce((acc, r) => acc + r.qtdCompra, 0);
    const den = Math.max(list.reduce((acc, r) => acc + r.qtdCompra * r.pesoMedioKg, 0), 1);
    const totals: Totals = {
      qtdCompra: qtd,
      pesoMedioKg: round2(
        list.reduce((acc, r) => acc + r.pesoMedioKg * r.qtdCompra, 0) / Math.max(qtd, 1),
      ),
      precoMedioUSDKg: round2(
        list.reduce((acc, r) => acc + r.precoMedioUSDKg * r.qtdCompra * r.pesoMedioKg, 0) / den,
      ),
    };
    const withBase = list.filter((r) => typeof r.valorKgBaseUSD === 'number' && r.valorKgBaseUSD > 0);
    if (withBase.length > 0) {
      const bDen = withBase.reduce((acc, r) => acc + r.qtdCompra * r.pesoMedioKg, 0);
      totals.valorKgBaseUSD = round2(
        withBase.reduce(
          (acc, r) => acc + (r.valorKgBaseUSD ?? 0) * r.qtdCompra * r.pesoMedioKg,
          0,
        ) / Math.max(bDen, 1),
      );
    }
    out[origem] = totals;
  }
  return out;
}

function isMockTodayPopulated(): boolean {
  if (typeof window === 'undefined') return true;
  const flag = (window.localStorage.getItem('compras-now:mock-today') ?? 'on').toLowerCase();
  if (flag === 'off') return false;
  if (flag === 'on') return true;
  return true;
}

export function mockSnapshot(period: PeriodKey, now: Date = new Date()): ComprasSnapshot | null {
  if (period === 'today' && !isMockTodayPopulated()) {
    return null;
  }
  const profile = PROFILES[period];
  const meta = PERIOD_LABEL_FORMAT[period](now);
  const capturedAt =
    period === 'today'
      ? now
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 5, 12);
  const baseFactor = period === 'today' ? 1.0 : period === 'yesterday' ? 1.01 : period === 'last7' ? 1.02 : 1.03;
  const rows = BASE_ROWS.map((b) => {
    const row: ComprasSnapshot['rows'][number] = {
      origem: b.origem,
      sexo: b.sexo,
      qtdCompra: Math.max(1, Math.round(b.qtd * profile.qtdFactor)),
      pesoMedioKg: round2(b.peso),
      precoMedioUSDKg: round2(b.preco * profile.precoFactor),
    };
    if (b.base !== undefined) {
      row.valorKgBaseUSD = round2(b.base * baseFactor);
    }
    return row;
  });
  const totalQtd = rows.reduce((acc, r) => acc + r.qtdCompra, 0);
  const totalPesoWeight = rows.reduce((acc, r) => acc + r.pesoMedioKg * r.qtdCompra, 0);
  const totalPrecoWeight = rows.reduce((acc, r) => acc + r.precoMedioUSDKg * r.qtdCompra * r.pesoMedioKg, 0);
  const totalPrecoDen = rows.reduce((acc, r) => acc + r.qtdCompra * r.pesoMedioKg, 0);
  const rowsWithBase = rows.filter((r) => r.valorKgBaseUSD !== undefined);
  const baseNum = rowsWithBase.reduce(
    (acc, r) => acc + (r.valorKgBaseUSD ?? 0) * r.qtdCompra * r.pesoMedioKg,
    0,
  );
  const baseDen = rowsWithBase.reduce((acc, r) => acc + r.qtdCompra * r.pesoMedioKg, 0);
  const overallBase = baseDen > 0 ? round2(baseNum / baseDen) : undefined;

  return {
    period,
    periodLabel: meta.label,
    periodFrom: meta.from.toISOString(),
    periodTo: meta.to.toISOString(),
    capturedAt: capturedAt.toISOString(),
    screenshotPath: `data/screenshots/${period}.png`,
    screenshotUrl: '/mock/dux-screenshot.svg',
    cotacaoUSD: { AR: 1398.0, BR: 5.04, CO: 3796.87, PY: 6169.09, UY: 40.3 },
    rows,
    totals: {
      qtdCompra: totalQtd,
      pesoMedioKg: round2(totalPesoWeight / Math.max(totalQtd, 1)),
      precoMedioUSDKg: round2(totalPrecoWeight / Math.max(totalPrecoDen, 1)),
      ...(overallBase !== undefined ? { valorKgBaseUSD: overallBase } : {}),
    },
    originTotals: buildOriginTotalsFromRows(rows),
    source: {
      module: 'Compras Now',
      breadcrumb: 'DUX > Minerva Reports > Relatorios de Controle > Compras Now',
    },
  };
}

export function mockStaleToday(now: Date = new Date()): ComprasSnapshot {
  const yesterday = addDays(now, -1);
  const meta = PERIOD_LABEL_FORMAT.today(yesterday);
  const profile = PROFILES.today;
  const rows = BASE_ROWS.map((b) => {
    const row: ComprasSnapshot['rows'][number] = {
      origem: b.origem,
      sexo: b.sexo,
      qtdCompra: Math.max(1, Math.round(b.qtd * profile.qtdFactor * 1.4)),
      pesoMedioKg: round2(b.peso),
      precoMedioUSDKg: round2(b.preco * profile.precoFactor),
    };
    if (b.base !== undefined) {
      row.valorKgBaseUSD = round2(b.base);
    }
    return row;
  });
  const totalQtd = rows.reduce((acc, r) => acc + r.qtdCompra, 0);
  return {
    period: 'today',
    periodLabel: meta.label,
    periodFrom: meta.from.toISOString(),
    periodTo: meta.to.toISOString(),
    capturedAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 20, 30, 0).toISOString(),
    screenshotPath: 'data/screenshots/today.png',
    screenshotUrl: '/mock/dux-screenshot.svg',
    cotacaoUSD: { AR: 1398.0, BR: 5.04, CO: 3796.87, PY: 6169.09, UY: 40.3 },
    rows,
    totals: {
      qtdCompra: totalQtd,
      pesoMedioKg: 353.96,
      precoMedioUSDKg: 5.09,
      valorKgBaseUSD: 4.8,
    },
    originTotals: buildOriginTotalsFromRows(rows),
    source: { module: 'Compras Now', breadcrumb: 'DUX > Minerva Reports > Relatorios de Controle > Compras Now' },
  };
}

export function mockAllSnapshots(now: Date = new Date()): AllSnapshots {
  return {
    today: mockSnapshot('today', now) ?? mockStaleToday(now),
    yesterday: mockSnapshot('yesterday', now),
    last7: mockSnapshot('last7', now),
    last30: mockSnapshot('last30', now),
  };
}

export function mockIntraday(now: Date = new Date()): IntradayResponse {
  const points: IntradayPoint[] = [];
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  let cursor = new Date(start);
  const endTime = now > start ? now : new Date(start.getTime() + 30 * 60_000);
  let step = 0;
  while (cursor <= endTime) {
    const variation = 1 + Math.sin(step / 3) * 0.04 + (Math.random() - 0.5) * 0.015;
    const cumulativeFactor = 0.08 + step * 0.05;
    const rows = BASE_ROWS.map((r) => ({
      origem: r.origem,
      sexo: r.sexo,
      precoMedioUSDKg: round2(r.preco * variation),
      qtdCompra: Math.max(1, Math.round(r.qtd * cumulativeFactor)),
    }));
    const totalQtd = rows.reduce((acc, r) => acc + r.qtdCompra, 0);
    const totalPreco =
      rows.reduce((acc, r) => acc + r.precoMedioUSDKg * r.qtdCompra, 0) / Math.max(totalQtd, 1);
    points.push({
      capturedAt: cursor.toISOString(),
      filename: `history/today/${cursor.toISOString().slice(0, 13)}.json`,
      totals: { qtdCompra: totalQtd, pesoMedioKg: 353.96, precoMedioUSDKg: round2(totalPreco) },
      byOrigem: rows,
    });
    cursor = new Date(cursor.getTime() + 30 * 60_000);
    step++;
    if (step > 30) break;
  }
  return { count: points.length, points };
}
