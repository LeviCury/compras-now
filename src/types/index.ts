import { z } from 'zod';

export const OrigemSchema = z.enum(['AR', 'BR', 'CO', 'PY', 'UY']);
export type Origem = z.infer<typeof OrigemSchema>;

export const SexoSchema = z.enum(['FEMEA', 'MACHO']);
export type Sexo = z.infer<typeof SexoSchema>;

export const PERIOD_KEYS = ['today', 'yesterday', 'last7', 'last30'] as const;
export const PeriodKeySchema = z.enum(PERIOD_KEYS);
export type PeriodKey = z.infer<typeof PeriodKeySchema>;

export const ComprasRowSchema = z.object({
  origem: OrigemSchema,
  sexo: SexoSchema,
  qtdCompra: z.number().nonnegative(),
  pesoMedioKg: z.number().nonnegative(),
  precoMedioUSDKg: z.number().nonnegative(),
  valorKgBaseUSD: z.number().nonnegative().optional(),
});
export type ComprasRow = z.infer<typeof ComprasRowSchema>;

export const TotalsSchema = z.object({
  qtdCompra: z.number().nonnegative(),
  pesoMedioKg: z.number().nonnegative(),
  precoMedioUSDKg: z.number().nonnegative(),
  valorKgBaseUSD: z.number().nonnegative().optional(),
});
export type Totals = z.infer<typeof TotalsSchema>;

export const OriginTotalsSchema = z.record(OrigemSchema, TotalsSchema);
export type OriginTotals = z.infer<typeof OriginTotalsSchema>;

export const ComprasSnapshotSchema = z.object({
  period: PeriodKeySchema,
  periodLabel: z.string(),
  periodFrom: z.string(),
  periodTo: z.string(),
  capturedAt: z.string(),
  screenshotPath: z.string().optional(),
  screenshotUrl: z.string().optional(),
  cotacaoUSD: z.record(z.string(), z.number()).optional(),
  rows: z.array(ComprasRowSchema),
  totals: TotalsSchema,
  originTotals: OriginTotalsSchema.optional(),
  source: z
    .object({
      module: z.string().default('Compras Now'),
      breadcrumb: z.string().default('DUX > Minerva Reports > Relatorios de Controle > Compras Now'),
    })
    .optional(),
});
export type ComprasSnapshot = z.infer<typeof ComprasSnapshotSchema>;

export const AllSnapshotsSchema = z.object({
  today: ComprasSnapshotSchema.nullable(),
  yesterday: ComprasSnapshotSchema.nullable(),
  last7: ComprasSnapshotSchema.nullable(),
  last30: ComprasSnapshotSchema.nullable(),
});
export type AllSnapshots = z.infer<typeof AllSnapshotsSchema>;

export const IntradayPointSchema = z.object({
  capturedAt: z.string(),
  filename: z.string(),
  totals: TotalsSchema,
  byOrigem: z.array(
    z.object({
      origem: OrigemSchema,
      sexo: SexoSchema,
      precoMedioUSDKg: z.number(),
      qtdCompra: z.number(),
    }),
  ),
});
export type IntradayPoint = z.infer<typeof IntradayPointSchema>;

export const IntradayResponseSchema = z.object({
  count: z.number(),
  points: z.array(IntradayPointSchema),
});
export type IntradayResponse = z.infer<typeof IntradayResponseSchema>;

export const ORIGEM_LABELS: Record<Origem, string> = {
  AR: 'Argentina',
  BR: 'Brasil',
  CO: 'Colombia',
  PY: 'Paraguai',
  UY: 'Uruguai',
};

export const SEXO_LABELS: Record<Sexo, string> = {
  MACHO: 'Macho',
  FEMEA: 'Fêmea',
};

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Hoje',
  yesterday: 'Ontem (fechado)',
  last7: 'Ultimos 7 dias',
  last30: 'Ultimos 30 dias',
};

export const PERIOD_SHORT_LABELS: Record<PeriodKey, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last7: '7 dias',
  last30: '30 dias',
};

export interface DashboardFilters {
  origens: Origem[];
  sexos: Sexo[];
  period: PeriodKey;
}

export const DEFAULT_FILTERS: DashboardFilters = {
  origens: ['AR', 'BR', 'CO', 'PY', 'UY'],
  sexos: ['MACHO', 'FEMEA'],
  period: 'today',
};
