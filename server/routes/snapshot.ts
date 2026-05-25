import { Router, type Request, type Response } from 'express';
import { getEnv, getFileText } from '../lib/github';
import { parsePeriodQuery } from '../lib/periods';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const period = parsePeriodQuery(req.query.period);

  try {
    const env = getEnv();
    const path = `${env.dataPath}/snapshots/${period}.json`;
    const text = await getFileText(path, env);
    const data = JSON.parse(text) as Record<string, unknown>;

    if (data && typeof data === 'object') {
      data.period = data.period ?? period;
      if (!data.screenshotUrl) {
        data.screenshotUrl = `/api/screenshot?period=${period}`;
      }
    }

    const cache =
      period === 'today'
        ? 'public, s-maxage=60, stale-while-revalidate=300'
        : 'public, s-maxage=3600, stale-while-revalidate=7200';
    res.setHeader('Cache-Control', cache);
    res.status(200).json(data);
  } catch (err) {
    console.error('[api/snapshot]', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    const status = message.includes('404') ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
