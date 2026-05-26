/**
 * Rotas de autenticacao Microsoft Entra ID via Authorization Code Flow.
 *
 *   GET  /auth/login     - inicia o fluxo (redirect ao Entra ID)
 *   GET  /auth/callback  - recebe o code, troca por tokens, popula sessao
 *   POST /auth/logout    - destroi sessao local
 *   GET  /api/me         - retorna o perfil do usuario logado (200) ou 401
 *
 * NOTA: a rota /api/me eh tratada aqui (e nao em routes/snapshot etc.)
 * porque ela precisa ficar FORA do middleware requireAuth - ela deve poder
 * responder 401 limpo quando o usuario nao esta logado (e' justamente o
 * sinal que o frontend usa para decidir se redireciona pra /auth/login).
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { getMsalClient, SCOPES, getRedirectUri, getOrigin } from './msal';
import { fetchGraphMe, fetchGraphPhoto } from '../lib/graph';
import { isAuthDisabled } from '../middleware/requireAuth';
import type { SessionUser } from './session-types';

const router = Router();

// ---------------------------------------------------------------------------
// GET /auth/login
// ---------------------------------------------------------------------------
router.get('/login', async (req: Request, res: Response) => {
  if (isAuthDisabled()) {
    res.redirect('/');
    return;
  }

  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.authState = state;
    const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
    req.session.postLoginRedirect = returnTo;

    const url = await getMsalClient().getAuthCodeUrl({
      scopes: SCOPES,
      redirectUri: getRedirectUri(),
      state,
      prompt: 'select_account',
    });

    console.log(
      `[/auth/login] sid=${req.sessionID} state=${state.slice(0, 8)}... -> redirect MS`,
    );

    // CRITICO: forca persistencia da sessao ANTES do redirect, senao o
    // SID do cookie pode apontar pra "nada" no store quando o usuario
    // volta do Microsoft (causa loop de login).
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[auth/login] erro salvando sessao:', saveErr);
        res.status(500).send('Erro salvando sessao.');
        return;
      }
      res.redirect(url);
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res
      .status(500)
      .send(`Falha ao iniciar login: ${err instanceof Error ? err.message : 'erro desconhecido'}`);
  }
});

// ---------------------------------------------------------------------------
// GET /auth/callback
// ---------------------------------------------------------------------------
router.get('/callback', async (req: Request, res: Response) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const error = typeof req.query.error === 'string' ? req.query.error : undefined;
  const errorDescription =
    typeof req.query.error_description === 'string' ? req.query.error_description : undefined;

  if (error) {
    console.error('[auth/callback] erro do Entra:', error, errorDescription);
    res
      .status(400)
      .send(`Login cancelado ou rejeitado: ${error} - ${errorDescription ?? ''}`);
    return;
  }

  if (!code) {
    res.status(400).send('Codigo de autorizacao ausente.');
    return;
  }

  console.log(
    `[/auth/callback] sid=${req.sessionID} authState(session)=${req.session.authState?.slice(0, 8) ?? 'undefined'}... state(query)=${state?.slice(0, 8) ?? 'undefined'}...`,
  );

  // Verificacao anti-CSRF: o state precisa bater com o que geramos no /login.
  if (!state || !req.session.authState || state !== req.session.authState) {
    console.error(
      `[/auth/callback] state mismatch! Sessao perdida? sid=${req.sessionID}. ` +
        'Isso geralmente significa que /auth/login nao persistiu a sessao antes de redirecionar.',
    );
    res.status(400).send(
      'Estado invalido. A sessao foi perdida entre o login e o callback. ' +
        'Volte para o painel e tente novamente.',
    );
    return;
  }
  delete req.session.authState;

  try {
    const tokenResponse = await getMsalClient().acquireTokenByCode({
      code,
      scopes: SCOPES,
      redirectUri: getRedirectUri(),
    });

    if (!tokenResponse || !tokenResponse.accessToken) {
      throw new Error('Token response sem accessToken');
    }

    // Busca perfil e foto do Graph com o accessToken recem obtido.
    const me = await fetchGraphMe(tokenResponse.accessToken);
    let photoDataUrl: string | undefined;
    try {
      const photo = await fetchGraphPhoto(tokenResponse.accessToken);
      photoDataUrl = photo?.dataUrl;
    } catch (photoErr) {
      // Foto e' opcional - se falhar, segue sem ela.
      console.warn('[auth/callback] foto nao disponivel:', photoErr);
    }

    const user: SessionUser = {
      id: me.id,
      displayName: me.displayName,
      givenName: me.givenName,
      surname: me.surname,
      mail: me.mail ?? me.userPrincipalName ?? '',
      userPrincipalName: me.userPrincipalName,
      jobTitle: me.jobTitle ?? undefined,
      photoDataUrl,
    };

    req.session.user = user;
    req.session.tokens = {
      accessToken: tokenResponse.accessToken,
      expiresOn: tokenResponse.expiresOn?.getTime() ?? Date.now() + 60 * 60 * 1000,
      homeAccountId: tokenResponse.account?.homeAccountId,
    };

    const returnTo = req.session.postLoginRedirect ?? '/';
    delete req.session.postLoginRedirect;

    // Salva explicitamente antes de redirecionar (alguns stores sao async).
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[auth/callback] erro salvando sessao:', saveErr);
        res.status(500).send('Erro salvando sessao.');
        return;
      }
      res.redirect(returnTo);
    });
  } catch (err) {
    console.error('[auth/callback] falha trocando code por token:', err);
    res
      .status(500)
      .send(
        `Falha ao concluir login: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
      );
  }
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req: Request, res: Response) => {
  const user = req.session.user;
  const isHttps = (process.env.AZURE_REDIRECT_URI ?? '').startsWith('https://');
  const isProd = process.env.NODE_ENV === 'production';

  req.session.destroy((err) => {
    if (err) {
      console.error('[auth/logout] erro destruindo sessao:', err);
      res.status(500).json({ error: 'logout_failed' });
      return;
    }

    // CRITICO: clearCookie precisa das MESMAS opcoes usadas para SETAR o
    // cookie. Se nao bater (path, sameSite, secure), o browser ignora o
    // Set-Cookie de deletion e o cookie zombie persiste, causando bug no
    // proximo login.
    res.clearCookie('compras-now-sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd && isHttps,
    });

    // URL opcional pra logout federado no Microsoft (encerra a sessao
    // tambem no SSO, fazendo a proxima entrada exigir login limpo).
    const federationLogoutUrl =
      user && process.env.AZURE_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(getOrigin())}`
        : null;

    console.log(`[/auth/logout] sessao destruida (user=${user?.mail ?? 'n/a'})`);
    res.json({ ok: true, federationLogoutUrl });
  });
});

// ---------------------------------------------------------------------------
// Handler para GET /api/me - perfil do usuario logado
// ---------------------------------------------------------------------------
// Exportado separadamente porque ele e' montado em PATH EXATO (/api/me) no
// server/index.ts, fora do requireAuth global. Frontend chama na inicializacao
// para descobrir se ja' esta logado: 200 -> renderiza app, 401 -> redirect.
export function meHandler(req: Request, res: Response): void {
  if (isAuthDisabled()) {
    res.status(200).json({
      user: null,
      authDisabled: true,
    });
    return;
  }
  if (!req.session?.user) {
    res.status(401).json({
      error: 'unauthenticated',
      message: 'Faca login com sua conta Microsoft.',
      loginUrl: '/auth/login',
    });
    return;
  }
  res.status(200).json({ user: req.session.user, authDisabled: false });
}

// Tambem disponivel como /auth/me, util para diagnostico.
router.get('/me', meHandler);

export default router;
