import { createContext } from 'react';

export interface AuthUser {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail: string;
  userPrincipalName?: string;
  jobTitle?: string;
  photoDataUrl?: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /**
   * Quando true, indica que o servidor esta com AUTH_DISABLED=1 e nao vai
   * exigir login (ambiente de transicao enquanto HTTPS nao esta pronto).
   * Frontend trata como "sem usuario, mas mostra a app mesmo assim".
   */
  authDisabled: boolean;
  /**
   * Erro de fetch ao validar sessao (rede, 500 do server, etc.). Diferente
   * de 401 (que vira status='unauthenticated' e dispara redirect).
   */
  error: string | null;
  /** Forca um re-fetch de /api/me. */
  refresh: () => Promise<void>;
  /** POST /auth/logout e redireciona pra '/'. */
  logout: () => Promise<void>;
  /** Redireciona pra Microsoft via /auth/login. */
  goToLogin: (returnTo?: string) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
