import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthUser, type AuthStatus, type AuthContextValue } from './auth-context';

interface MeResponse {
  user?: AuthUser | null;
  authDisabled?: boolean;
  error?: string;
  loginUrl?: string;
}

/**
 * Provider que mantem o estado de autenticacao do usuario atual.
 *
 * Faz GET /api/me na inicializacao:
 *   - 200 com user        -> status = authenticated
 *   - 200 com authDisabled -> status = authenticated (modo bypass)
 *   - 401                 -> status = unauthenticated (AuthGate dispara redirect)
 *   - erro de rede / 500  -> status = error
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authDisabled, setAuthDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch('/api/me', {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      if (res.status === 401) {
        setUser(null);
        setAuthDisabled(false);
        setStatus('unauthenticated');
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setError(`HTTP ${res.status}: ${text}`);
        setStatus('error');
        return;
      }

      const data = (await res.json()) as MeResponse;
      setAuthDisabled(Boolean(data.authDisabled));
      setUser(data.user ?? null);
      setStatus('authenticated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro desconhecido');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[auth] logout falhou:', err);
    }
    setUser(null);
    setStatus('unauthenticated');
    window.location.href = '/';
  }, []);

  const goToLogin = useCallback((returnTo?: string) => {
    const target = returnTo ?? window.location.pathname + window.location.search;
    const url = `/auth/login?returnTo=${encodeURIComponent(target)}`;
    window.location.href = url;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      authDisabled,
      error,
      refresh,
      logout,
      goToLogin,
    }),
    [status, user, authDisabled, error, refresh, logout, goToLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
