import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, Loader2, LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

/**
 * Wrapper que envolve a app inteira e garante que so' usuarios autenticados
 * (ou o modo AUTH_DISABLED) vejam o dashboard.
 *
 * Estados:
 *   - loading        -> spinner + texto "Verificando sua sessao..."
 *   - unauthenticated -> dispara redirect pra /auth/login automaticamente
 *   - error          -> tela de erro com botao de tentar novamente
 *   - authenticated  -> renderiza filhos (app normal)
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { status, error, refresh, goToLogin } = useAuth();

  // Quando o servidor responde 401 na primeira validacao, levamos o usuario
  // pro fluxo de login Microsoft automaticamente. O efeito so' dispara uma
  // vez por mudanca de status pra evitar redirect-loop em caso de error.
  useEffect(() => {
    if (status === 'unauthenticated') {
      goToLogin();
    }
  }, [status, goToLogin]);

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-padded max-w-md w-full text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" strokeWidth={1.6} />
          <h2 className="text-lg font-bold mb-1">Nao foi possivel verificar sua sessao</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {error ?? 'Erro de comunicacao com o servidor.'}
          </p>
          <button className="btn-primary" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
  }

  // status === 'loading' ou 'unauthenticated' (com redirect em curso)
  const isRedirecting = status === 'unauthenticated';
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {isRedirecting ? (
          <LogIn
            className="h-10 w-10 mx-auto mb-3 animate-pulse"
            strokeWidth={1.6}
            style={{ color: 'var(--accent)' }}
          />
        ) : (
          <Loader2
            className="h-10 w-10 mx-auto mb-3 animate-spin"
            strokeWidth={1.6}
            style={{ color: 'var(--text-muted)' }}
          />
        )}
        <h2 className="text-base font-semibold mb-1">
          {isRedirecting ? 'Redirecionando para o login Microsoft...' : 'Verificando sua sessao...'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {isRedirecting
            ? 'Use sua conta corporativa Minerva para entrar.'
            : 'So um instante.'}
        </p>
      </div>
    </div>
  );
}
