import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnv, getFileText, handleCors, sendError } from './_lib/github';
import { PERIOD_KEYS, type PeriodKey } from './_lib/periods';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  try {
    const env = getEnv();
    const entries = await Promise.all(
      PERIOD_KEYS.map(async (period) => {
        try {
          const text = await getFileText(`${env.dataPath}/snapshots/${period}.json`, env);
          const parsed = JSON.parse(text) as Record<string, unknown>;
          parsed.period = parsed.period ?? period;
          if (!parsed.screenshotUrl) {
            parsed.screenshotUrl = `/api/screenshot?period=${period}`;
          }
          return [period, parsed] as const;
        } catch (err) {
          console.warn(`[api/snapshots] ${period} indisponivel`, err);
          return [period, null] as const;
        }
      }),
    );

    const payload: Record<PeriodKey, unknown> = {
      today: null,
      yesterday: null,
      last7: null,
      last30: null,
    };
    for (const [period, value] of entries) {
      payload[period] = value;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.status(200).json(payload);
  } catch (err) {
    console.error('[api/snapshots]', err);
    sendError(res, 500, err instanceof Error ? err.message : 'unknown error');
  }
}
