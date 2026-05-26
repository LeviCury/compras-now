/**
 * Middleware Express que bloqueia rotas protegidas com 401 quando o usuario
 * nao tem sessao valida.
 *
 * Habilitacao por ambiente:
 *   AUTH_DISABLED=1   -> bypass total (libera todas as requisicoes; util em
 *                        ambientes onde HTTPS ainda nao esta disponivel e o
 *                        SSO nao pode rodar - VER plano.md secao "HTTPS")
 *   AUTH_DISABLED=0   -> padrao; exige req.session.user
 *
 * Quando bloqueado, retorna JSON `{ error: 'unauthenticated', loginUrl: '/auth/login' }`
 * para o frontend interceptar e redirecionar.
 */

import type { Request, Response, NextFunction } from 'express';

export function isAuthDisabled(): boolean {
  return (process.env.AUTH_DISABLED ?? '0') === '1';
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthDisabled()) {
    next();
    return;
  }
  if (req.session && req.session.user) {
    next();
    return;
  }
  res.status(401).json({
    error: 'unauthenticated',
    message: 'Sessao expirada ou inexistente. Faca login com sua conta Microsoft.',
    loginUrl: '/auth/login',
  });
}
