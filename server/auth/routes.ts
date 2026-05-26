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
    res.redirect(url);
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

  // Verificacao anti-CSRF: o state precisa bater com o que geramos no /login.
  if (!state || !req.session.authState || state !== req.session.authState) {
    res.status(400).send('Estado invalido (possivel CSRF). Tente o login novamente.');
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

  req.session.destroy((err) => {
    if (err) {
      console.error('[auth/logout] erro destruindo sessao:', err);
      res.status(500).json({ error: 'logout_failed' });
      return;
    }
    res.clearCookie('compras-now-sid');

    // Por enquanto so' devolvemos um JSON com OK + a URL opcional pra um
    // logout federado no Microsoft. O front decide se redireciona pra la'
    // ou se so' volta pra '/' (que vai disparar /auth/login de novo).
    const federationLogoutUrl =
      user && process.env.AZURE_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(getOrigin())}`
        : null;

    res.json({ ok: true, federationLogoutUrl });
  });
});

// ---------------------------------------------------------------------------
// GET /api/me - perfil do usuario logado
// ---------------------------------------------------------------------------
// Fica fora de requireAuth: o frontend chama isso na inicializacao para
// descobrir se ja' esta logado. Resposta 200 -> renderiza app; 401 -> manda
// pra /auth/login.
router.get('/me', (req: Request, res: Response) => {
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
});

export default router;
