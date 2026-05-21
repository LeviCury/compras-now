import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnv, getFileText, handleCors, sendError } from './_lib/github';
import { parsePeriodQuery } from './_lib/periods';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  const period = parsePeriodQuery(req.query.period);

  try {
    const env = getEnv();
    const path = `${env.dataPath}/snapshots/${period}.json`;
    const text = await getFileText(path, env);
    const data = JSON.parse(text);

    if (data && typeof data === 'object') {
      data.period = data.period ?? period;
      if (!data.screenshotUrl) {
        data.screenshotUrl = `/api/screenshot?period=${period}`;
      }
    }

    const cache = period === 'today'
      ? 'public, s-maxage=60, stale-while-revalidate=300'
      : 'public, s-maxage=3600, stale-while-revalidate=7200';
    res.setHeader('Cache-Control', cache);
    res.status(200).json(data);
  } catch (err) {
    console.error('[api/snapshot]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    const status = message.includes('404') ? 404 : 500;
    sendError(res, status, message);
  }
}
