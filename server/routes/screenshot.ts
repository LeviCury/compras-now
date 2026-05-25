import { Router, type Request, type Response } from 'express';
import { getEnv, getFileBuffer } from '../lib/github';
import { isValidPeriod } from '../lib/periods';

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const EXT_CANDIDATES = ['png', 'jpg', 'jpeg'];

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const env = getEnv();
  const rawPeriod = req.query.period;
  const rawName = req.query.name;
  const periodValue = Array.isArray(rawPeriod) ? rawPeriod[0] : rawPeriod;

  const candidates: string[] = [];

  if (periodValue && typeof periodValue === 'string' && isValidPeriod(periodValue)) {
    for (const ext of EXT_CANDIDATES) {
      candidates.push(`${env.dataPath}/screenshots/${periodValue}.${ext}`);
    }
  }

  const nameValue = Array.isArray(rawName) ? rawName[0] : rawName;
  if (nameValue && typeof nameValue === 'string') {
    const safe = nameValue.replace(/[^A-Za-z0-9._-]/g, '');
    if (safe && !safe.includes('..')) {
      candidates.push(`${env.dataPath}/screenshots/${safe}`);
    }
  }

  if (candidates.length === 0) {
    res
      .status(400)
      .json({ error: 'Informe ?period=today|yesterday|last7|last30 ou ?name=arquivo.png' });
    return;
  }

  let lastError: unknown = null;
  for (const path of candidates) {
    try {
      const buffer = await getFileBuffer(path, env);
      const ext = path.split('.').pop()?.toLowerCase() ?? 'png';
      const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      res.setHeader('Content-Length', String(buffer.length));
      res.status(200).send(buffer);
      return;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('404')) {
        console.error('[api/screenshot]', path, err);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'screenshot nao encontrado';
  const status = message.includes('404') ? 404 : 500;
  res.status(status).json({ error: message });
});

export default router;
