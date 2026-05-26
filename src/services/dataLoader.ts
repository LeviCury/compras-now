import {
  AllSnapshotsSchema,
  ComprasSnapshotSchema,
  IntradayResponseSchema,
  type AllSnapshots,
  type ComprasSnapshot,
  type IntradayResponse,
  type PeriodKey,
} from '../types';
import { mockAllSnapshots, mockIntraday, mockSnapshot } from './mockData';

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === '1' ||
  (typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' &&
    window.location.port === '5173' &&
    import.meta.env.VITE_USE_MOCK !== '0');

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/**
 * Quando o backend retorna 401 (sessao Microsoft expirada/inexistente),
 * jogamos o usuario direto pro fluxo de /auth/login mantendo a URL atual
 * como returnTo. Isso cobre o caso de sessao expirar durante o uso ativo.
 */
function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const target = window.location.pathname + window.location.search;
  window.location.href = `/auth/login?returnTo=${encodeURIComponent(target)}`;
}

async function safeJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    credentials: 'include',
  });
  if (response.status === 401) {
    redirectToLogin();
    // Mesmo apos o redirect, lancamos pra evitar que o caller siga com dados invalidos.
    throw new Error('Sessao expirada - redirecionando para login Microsoft...');
  }
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function fetchSnapshot(period: PeriodKey): Promise<ComprasSnapshot | null> {
  if (USE_MOCK) {
    await sleep(200);
    const mock = mockSnapshot(period);
    return mock ? ComprasSnapshotSchema.parse(mock) : null;
  }
  try {
    const data = await safeJson<unknown>(`${API_BASE}/api/snapshot?period=${period}`);
    return ComprasSnapshotSchema.parse(data);
  } catch (err) {
    if (err instanceof Error && /404/.test(err.message)) {
      return null;
    }
    throw err;
  }
}

export async function fetchAllSnapshots(): Promise<AllSnapshots> {
  if (USE_MOCK) {
    await sleep(250);
    return AllSnapshotsSchema.parse(mockAllSnapshots());
  }
  const data = await safeJson<unknown>(`${API_BASE}/api/snapshots`);
  return AllSnapshotsSchema.parse(data);
}

export async function fetchIntraday(): Promise<IntradayResponse> {
  if (USE_MOCK) {
    await sleep(150);
    return IntradayResponseSchema.parse(mockIntraday());
  }
  const data = await safeJson<unknown>(`${API_BASE}/api/intraday`);
  return IntradayResponseSchema.parse(data);
}

export function screenshotUrl(snapshot: ComprasSnapshot): string | null {
  if (snapshot.screenshotUrl) return snapshot.screenshotUrl;
  if (USE_MOCK) return '/mock/dux-screenshot.svg';
  return `${API_BASE}/api/screenshot?period=${snapshot.period}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
