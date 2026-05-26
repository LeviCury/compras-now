import { useEffect, useRef, useState } from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

/**
 * Badge compacto pro header: foto + nome + dropdown com info do usuario
 * logado e botao "Sair".
 *
 * Em modo AUTH_DISABLED, mostra um placeholder discreto indicando que o
 * login esta desligado (util pra developer/admin saber rapido).
 */
export default function UserBadge() {
  const { user, authDisabled, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (authDisabled && !user) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-[0.12em] font-bold"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-faint)' }}
        title="Servidor com AUTH_DISABLED=1"
      >
        <UserIcon className="h-3 w-3" strokeWidth={2} />
        Auth Off
      </div>
    );
  }

  if (!user) return null;

  const initials = buildInitials(user.displayName);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
        style={{
          background: open ? 'var(--bg-subtle)' : 'transparent',
          border: '1px solid var(--border)',
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user.displayName}
      >
        {user.photoDataUrl ? (
          <img
            src={user.photoDataUrl}
            alt={user.displayName}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span
            className="h-7 w-7 rounded-full inline-flex items-center justify-center text-xs font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            {initials}
          </span>
        )}
        <span
          className="hidden sm:inline text-sm font-medium max-w-[160px] truncate"
          style={{ color: 'var(--text)' }}
        >
          {user.givenName ?? user.displayName.split(' ')[0]}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-lg border shadow-lg overflow-hidden z-50"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              {user.photoDataUrl ? (
                <img
                  src={user.photoDataUrl}
                  alt={user.displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span
                  className="h-10 w-10 rounded-full inline-flex items-center justify-center text-sm font-semibold"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  {initials}
                </span>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {user.displayName}
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: 'var(--text-muted)' }}
                  title={user.mail}
                >
                  {user.mail}
                </div>
                {user.jobTitle && (
                  <div
                    className="text-[11px] truncate mt-0.5"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    {user.jobTitle}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="w-full px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function buildInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
