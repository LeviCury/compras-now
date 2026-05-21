import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getContents, getEnv, handleCors, sendError } from './_lib/github';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  try {
    const env = getEnv();
    const result = await getContents(`${env.dataPath}/latest.json`, env);
    const item = Array.isArray(result) ? result[0] : result;
    res.status(200).json({
      ok: true,
      repo: env.repo,
      branch: env.branch,
      latestSha: item?.sha ?? null,
      size: item?.size ?? 0,
    });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : 'unknown error');
  }
}
