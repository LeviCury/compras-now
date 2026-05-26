import { Moon, Play, Share2, Sun, Clock, Calendar } from 'lucide-react';
import type { ComprasSnapshot, PeriodKey } from '../types';
import { useTheme } from '../contexts/useTheme';
import { formatDateTime, minutesSince, timeAgo } from '../utils/formatters';
import UserBadge from './UserBadge';

interface Props {
  snapshot?: ComprasSnapshot | null;
  activePeriod: PeriodKey;
  isFetching: boolean;
  onShare: () => void;
  onPresentation: () => void;
}

export default function DashboardHeader({
  snapshot,
  activePeriod,
  isFetching: _isFetching,
  onShare,
  onPresentation,
}: Props) {
  const { theme, toggle } = useTheme();
  const lastUpdate = snapshot?.capturedAt;
  const lateMinutes = lastUpdate ? minutesSince(lastUpdate) : null;
  const isLate = activePeriod === 'today' && lateMinutes !== null && lateMinutes > 180;

  return (
    <header className="card-padded flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <img
          src="/favicon.png"
          alt="Minerva Foods"
          width={48}
          height={48}
          className="h-12 w-12 rounded-xl object-contain"
          style={{ background: 'var(--bg-elevated)', padding: 4 }}
        />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-2xl md:text-[1.7rem] font-bold tracking-tight"
              style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
            >
              Compras Now
            </h1>
            <span
              className="hidden sm:inline-block text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              Executivo
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap mt-1" style={{ color: 'var(--text-muted)' }}>
            <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="font-semibold" style={{ color: 'var(--text)' }}>
              {snapshot?.periodLabel ?? 'Sem periodo selecionado'}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
            {snapshot?.source?.breadcrumb ?? 'DUX > Minerva Reports > Relatorios de Controle > Compras Now'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
          title={lastUpdate ? formatDateTime(lastUpdate) : 'Sem dados'}
        >
          <Clock
            className="h-4 w-4"
            strokeWidth={2}
            style={{ color: isLate ? 'var(--accent)' : 'var(--text-muted)' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>Capturado</span>
          <span
            className="font-semibold tabular"
            style={{ color: isLate ? 'var(--accent)' : 'var(--text)' }}
          >
            {lastUpdate ? timeAgo(lastUpdate) : '-'}
          </span>
        </div>

        <button className="btn-ghost" onClick={onPresentation} title="Modo apresentacao (TV)">
          <Play className="h-4 w-4" strokeWidth={2} />
          <span className="hidden md:inline">Apresentar</span>
        </button>

        <button className="btn-ghost" onClick={toggle} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" strokeWidth={2} /> : <Moon className="h-4 w-4" strokeWidth={2} />}
        </button>

        <button className="btn-primary" onClick={onShare}>
          <Share2 className="h-4 w-4" strokeWidth={2} />
          <span>Exportar</span>
        </button>

        <UserBadge />
      </div>
    </header>
  );
}
