/**
 * Helpers para chamar o Microsoft Graph com um access_token Bearer.
 *
 * Usamos so' duas rotas:
 *   - GET /me                 -> perfil do usuario autenticado
 *   - GET /me/photo/$value    -> foto da conta corporativa (binario)
 *
 * Esses dados sao buscados uma vez logo apos o login (no /auth/callback) e
 * cacheados na sessao do usuario, evitando chamadas repetidas ao Graph a
 * cada request do dashboard.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export interface GraphMe {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail?: string | null;
  userPrincipalName?: string;
  jobTitle?: string | null;
}

export async function fetchGraphMe(accessToken: string): Promise<GraphMe> {
  const res = await fetch(`${GRAPH_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[graph] GET /me -> ${res.status}: ${text}`);
  }
  return (await res.json()) as GraphMe;
}

export interface GraphPhotoResult {
  /** Foto codificada como data URI (data:image/jpeg;base64,...). */
  dataUrl: string;
  contentType: string;
  bytes: number;
}

/**
 * Busca a foto do usuario logado.
 *
 * Retorna null quando o usuario nao tem foto configurada no Entra ID (a API
 * responde com 404 nesse caso) - nao e' um erro fatal.
 */
export async function fetchGraphPhoto(
  accessToken: string,
): Promise<GraphPhotoResult | null> {
  const res = await fetch(`${GRAPH_BASE}/me/photo/$value`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[graph] GET /me/photo/$value -> ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString('base64');
  return {
    dataUrl: `data:${contentType};base64,${base64}`,
    contentType,
    bytes: buffer.length,
  };
}
