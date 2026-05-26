/**
 * Configuracao do cliente MSAL (Microsoft Authentication Library) Node em
 * modo Confidential (suporta client_secret).
 *
 * O Compras Now Executivo usa Authorization Code Flow server-side:
 * - usuario e' redirecionado para login.microsoftonline.com
 * - retorna com um code
 * - servidor troca o code por id_token + access_token + refresh_token usando
 *   o client_secret
 * - servidor cria uma sessao por cookie HttpOnly
 *
 * Variaveis de ambiente necessarias:
 *   AZURE_TENANT_ID      - GUID do tenant Minerva
 *   AZURE_CLIENT_ID      - GUID do app registrado no Entra ID
 *   AZURE_CLIENT_SECRET  - secret do app
 *   AZURE_REDIRECT_URI   - callback completo (ex: http://localhost:8080/auth/callback)
 */

import { ConfidentialClientApplication, type Configuration, LogLevel } from '@azure/msal-node';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[msal] variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

function buildConfig(): Configuration {
  const tenantId = required('AZURE_TENANT_ID');
  const clientId = required('AZURE_CLIENT_ID');
  const clientSecret = required('AZURE_CLIENT_SECRET');

  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
    system: {
      loggerOptions: {
        piiLoggingEnabled: false,
        logLevel: LogLevel.Warning,
        loggerCallback: (level, message) => {
          if (level <= LogLevel.Warning) {
            console.log(`[msal] ${message}`);
          }
        },
      },
    },
  };
}

let _client: ConfidentialClientApplication | null = null;

export function getMsalClient(): ConfidentialClientApplication {
  if (!_client) {
    _client = new ConfidentialClientApplication(buildConfig());
  }
  return _client;
}

export const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

/**
 * URI de callback configurada no Entra ID. Em dev local sera
 * `http://localhost:8080/auth/callback`. Em producao com HTTPS,
 * `https://comprasnow.minervafoods.com/auth/callback`.
 */
export function getRedirectUri(): string {
  return required('AZURE_REDIRECT_URI');
}

/**
 * URL absoluta para qual o usuario sera enviado apos logout opcional do
 * Microsoft (signout federation). Pode ser sobrescrito por env, ou cai no
 * proprio dominio raiz.
 */
export function getPostLogoutRedirectUri(): string {
  return process.env.AZURE_POST_LOGOUT_REDIRECT_URI ?? getOrigin();
}

/**
 * Origem (protocolo + host) do servidor, derivada do AZURE_REDIRECT_URI.
 * Util para construir links de redirect apos o callback.
 */
export function getOrigin(): string {
  const uri = new URL(getRedirectUri());
  return `${uri.protocol}//${uri.host}`;
}
