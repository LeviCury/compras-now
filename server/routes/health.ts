import { Router, type Request, type Response } from 'express';
import { getEnv, getFileText } from '../lib/github';

const router = Router();

/**
 * Health check util: tenta ler o snapshot de 'today' do GitHub.
 *
 * - 200 OK se o env esta configurado E o arquivo existe (RPA ativo)
 * - 200 OK + warning se env OK mas arquivo nao existe (RPA ainda nao rodou hoje)
 * - 500 se nem o env esta valido (problema de credencial)
 */
router.get('/', async (_req: Request, res: Response) => {
  let env;
  try {
    env = getEnv();
  } catch (err) {
    res.status(500).json({
      ok: false,
      stage: 'env',
      error: err instanceof Error ? err.message : 'unknown error',
    });
    return;
  }

  try {
    const text = await getFileText(`${env.dataPath}/snapshots/today.json`, env);
    const parsed = JSON.parse(text) as { capturedAt?: string };
    res.status(200).json({
      ok: true,
      repo: env.repo,
      branch: env.branch,
      todayCapturedAt: parsed.capturedAt ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    if (message.includes('404')) {
      res.status(200).json({
        ok: true,
        repo: env.repo,
        branch: env.branch,
        warning: 'snapshot de today ainda nao existe (RPA pode nao ter rodado hoje)',
      });
      return;
    }
    res.status(500).json({
      ok: false,
      stage: 'github',
      error: message,
    });
  }
});

export default router;
