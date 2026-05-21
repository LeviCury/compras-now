import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getContents,
  getEnv,
  getFileText,
  handleCors,
  sendError,
  type GithubContentItem,
} from './_lib/github.js';

interface IntradayPoint {
  capturedAt: string;
  filename: string;
  totals: { qtdCompra: number; pesoMedioKg: number; precoMedioUSDKg: number };
  byOrigem: Array<{
    origem: string;
    sexo: string;
    precoMedioUSDKg: number;
    qtdCompra: number;
  }>;
}

const DAYS_BACK = 7;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  try {
    const env = getEnv();
    const dir = `${env.dataPath}/history/today`;
    const cutoff = Date.now() - DAYS_BACK * 86400000;

    let listing: GithubContentItem[] = [];
    try {
      const result = await getContents(dir, env);
      listing = Array.isArray(result) ? result : [result];
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        res.status(200).json({ count: 0, points: [] });
        return;
      }
      throw err;
    }

    const files = listing
      .filter((item) => item.type === 'file' && item.name.endsWith('.json'))
      .filter((item) => {
        const iso = item.name.replace(/\.json$/, '').replace(/_/g, ':');
        const t = Date.parse(iso);
        if (Number.isNaN(t)) return true;
        return t >= cutoff;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const concurrency = 6;
    const points: IntradayPoint[] = [];
    for (let i = 0; i < files.length; i += concurrency) {
      const slice = files.slice(i, i + concurrency);
      const batch = await Promise.all(
        slice.map(async (item) => {
          try {
            const text = await getFileText(item.path, env);
            const json = JSON.parse(text);
            return summarize(json, item.name);
          } catch (err) {
            console.error('[api/intraday] skip', item.path, err);
            return null;
          }
        }),
      );
      for (const point of batch) if (point) points.push(point);
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.status(200).json({ count: points.length, points });
  } catch (err) {
    console.error('[api/intraday]', err);
    sendError(res, 500, err instanceof Error ? err.message : 'unknown error');
  }
}

function summarize(
  raw: { capturedAt?: string; totals?: IntradayPoint['totals']; rows?: unknown; byOrigem?: IntradayPoint['byOrigem'] },
  filename: string,
): IntradayPoint | null {
  const capturedAt = raw.capturedAt ?? '';
  const totals = raw.totals ?? { qtdCompra: 0, pesoMedioKg: 0, precoMedioUSDKg: 0 };

  let byOrigem: IntradayPoint['byOrigem'] = [];
  if (Array.isArray(raw.byOrigem)) {
    byOrigem = raw.byOrigem;
  } else if (Array.isArray(raw.rows)) {
    byOrigem = (raw.rows as Array<Record<string, unknown>>).map((r) => ({
      origem: String(r.origem ?? ''),
      sexo: String(r.sexo ?? ''),
      precoMedioUSDKg: Number(r.precoMedioUSDKg ?? 0),
      qtdCompra: Number(r.qtdCompra ?? 0),
    }));
  }

  if (!capturedAt) return null;
  return { capturedAt, filename, totals, byOrigem };
}
