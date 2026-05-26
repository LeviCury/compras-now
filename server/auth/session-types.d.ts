/**
 * Extensao do tipo de sessao do express-session para incluir os campos que
 * armazenamos apos um login bem sucedido via Microsoft Entra ID.
 *
 * Express-session usa augmentation de modulo: declarando aqui o `Session`
 * com campos opcionais, ganhamos auto-complete e type-safety em todos os
 * handlers que usam `req.session.user`, `req.session.tokens`, etc.
 */

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /**
     * Perfil do usuario autenticado (subset do que vem do Graph /me).
     * So' fica preenchido apos o callback do MSAL processar com sucesso.
     */
    user?: SessionUser;

    /**
     * Tokens retornados pelo Entra ID. Usamos o accessToken para chamar o
     * Microsoft Graph (renovacao de foto, expansao do perfil, etc.). O
     * refreshToken eh gerenciado internamente pelo cache do MSAL Node.
     */
    tokens?: SessionTokens;

    /**
     * Estado curto usado durante o redirect do MSAL para anti-CSRF.
     * Limpo no callback.
     */
    authState?: string;

    /**
     * URL a' qual voltar apos completar o login (ex: '/' ou caminho que o
     * usuario tentou acessar). Limpa apos uso.
     */
    postLoginRedirect?: string;
  }
}

export interface SessionUser {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail: string;
  userPrincipalName?: string;
  jobTitle?: string;
  /**
   * Foto do usuario em formato data URI (data:image/jpeg;base64,...).
   * Buscada do Graph no momento do login. Pode ser undefined se o usuario
   * nao tem foto configurada no perfil corporativo.
   */
  photoDataUrl?: string;
}

export interface SessionTokens {
  accessToken: string;
  /**
   * Timestamp UNIX (ms) em que o accessToken expira. O MSAL Node faz refresh
   * silencioso usando o cache interno; aqui guardamos so' como referencia
   * para o middleware decidir se vale a pena pre-renovar.
   */
  expiresOn: number;
  /**
   * Account info do MSAL Node, usado para o getTokenSilently() em renovacoes.
   */
  homeAccountId?: string;
}
