import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import LoginScreen from './LoginScreen';

const LOOP_GUARD_KEY = 'compras-now:lastLoginRedirect';
const LOOP_WINDOW_MS = 10_000; // se redirecionou pra login ha menos disso e voltou unauthenticated, tem loop

/**
 * Wrapper que envolve a app inteira e garante que so' usuarios autenticados
 * (ou o modo AUTH_DISABLED) vejam o dashboard.
 *
 * Estados:
 *   - loading        -> spinner + texto "Verificando sua sessao..."
 *   - unauthenticated -> renderiza <LoginScreen /> (usuario clica pra ir pro MS)
 *   - error          -> tela de erro com botao de tentar novamente
 *   - authenticated  -> renderiza filhos (app normal)
 *
 * Anti-loop guard: se o usuario voltar como unauthenticated DEPOIS de um
 * clique recente no botao "Entrar", paramos de exibir a LoginScreen e
 * mostramos a tela de loop. Evita que ele clique no botao varias vezes
 * caso o cookie de sessao nao persista entre callback e /api/me.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { status, error, refresh, goToLogin } = useAuth();
  const [loopDetected, setLoopDetected] = useState(false);

  // Quando autenticar com sucesso, limpa marca de loop.
  useEffect(() => {
    if (status === 'authenticated') {
      sessionStorage.removeItem(LOOP_GUARD_KEY);
      setLoopDetected(false);
    }
  }, [status]);

  // Se chegamos unauthenticated e ja' tentamos ha pouco, marca loop.
  useEffect(() => {
    if (status !== 'unauthenticated') return;
    const last = sessionStorage.getItem(LOOP_GUARD_KEY);
    if (last && Date.now() - Number(last) < LOOP_WINDOW_MS) {
      console.error('[auth] loop detectado - sessao nao persistiu apos /auth/callback');
      setLoopDetected(true);
    }
  }, [status]);

  const handleLogin = () => {
    sessionStorage.setItem(LOOP_GUARD_KEY, String(Date.now()));
    goToLogin();
  };

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  if (loopDetected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-padded max-w-md w-full text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" strokeWidth={1.6} />
          <h2 className="text-lg font-bold mb-1">Sessao nao persistiu</h2>
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Voce completou o login na Microsoft mas o cookie de sessao nao chegou
            de volta. Isso pode acontecer se houver service worker antigo,
            extensao de navegador bloqueando cookies, ou modo de navegacao com
            terceiros bloqueados.
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>
            Tente em uma janela anonima limpa, ou desative extensoes de bloqueio.
          </p>
          <button
            className="btn-primary"
            onClick={() => {
              sessionStorage.removeItem(LOOP_GUARD_KEY);
              window.location.href = '/';
            }}
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
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

  if (status === 'unauthenticated') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // status === 'loading'
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Loader2
          className="h-10 w-10 mx-auto mb-3 animate-spin"
          strokeWidth={1.6}
          style={{ color: 'var(--text-muted)' }}
        />
        <h2 className="text-base font-semibold mb-1">Verificando sua sessao...</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          So um instante.
        </p>
      </div>
    </div>
  );
}
