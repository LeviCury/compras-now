import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnv, getFileBuffer, handleCors, sendError } from './_lib/github';
import { isValidPeriod } from './_lib/periods';

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const EXT_CANDIDATES = ['png', 'jpg', 'jpeg'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  const env = getEnv();
  const rawPeriod = req.query.period;
  const rawName = req.query.name;
  const periodValue = Array.isArray(rawPeriod) ? rawPeriod[0] : rawPeriod;

  const candidates: string[] = [];

  if (periodValue && isValidPeriod(periodValue)) {
    for (const ext of EXT_CANDIDATES) {
      candidates.push(`${env.dataPath}/screenshots/${periodValue}.${ext}`);
    }
  }

  const nameValue = Array.isArray(rawName) ? rawName[0] : rawName;
  if (nameValue) {
    const safe = String(nameValue).replace(/[^A-Za-z0-9._-]/g, '');
    if (safe && !safe.includes('..')) {
      candidates.push(`${env.dataPath}/screenshots/${safe}`);
    }
  }

  if (candidates.length === 0) {
    return sendError(res, 400, 'Informe ?period=today|yesterday|last7|last30 ou ?name=arquivo.png');
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
  sendError(res, status, message);
}
