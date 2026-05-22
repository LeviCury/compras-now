import { useEffect, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import type { AllSnapshots, DashboardFilters } from '../types';
import { PERIOD_KEYS } from '../types';
import { formatDateTime, formatTime, timeAgo } from '../utils/formatters';
import PresentationColumn from './PresentationColumn';

interface Props {
  all?: AllSnapshots;
  isLoading: boolean;
  isFetching: boolean;
  filters: DashboardFilters;
  onExit: () => void;
}

export default function PresentationView({
  all,
  isLoading,
  isFetching: _isFetching,
  filters,
  onExit,
}: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const todayCapturedAt = all?.today?.capturedAt;

  if (isLoading && !all) {
    return (
      <div className="presentation-root items-center justify-center">
        <div className="text-2xl font-semibold" style={{ color: '#a1a1aa' }}>
          Carregando snapshots...
        </div>
      </div>
    );
  }

  return (
    <div className="presentation-root">
      <Header now={now} todayCapturedAt={todayCapturedAt} onExit={onExit} />

      <main className="flex-1 grid grid-cols-4 gap-3 lg:gap-4 px-4 py-3 lg:px-5 lg:py-4 min-h-0">
        {PERIOD_KEYS.map((key) => (
          <section
            key={key}
            className="pcol overflow-hidden rounded-2xl border flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.025)',
              borderColor: 'rgba(255, 255, 255, 0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
            }}
          >
            <PresentationColumn
              periodKey={key}
              snapshot={all?.[key] ?? null}
              origens={filters.origens}
              sexos={filters.sexos}
            />
          </section>
        ))}
      </main>

      <Footer />
    </div>
  );
}

interface HeaderProps {
  now: Date;
  todayCapturedAt?: string;
  onExit: () => void;
}

function Header({ now, todayCapturedAt, onExit }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-8 py-5 border-b"
      style={{ borderColor: 'rgba(244,244,245,0.08)' }}
    >
      <div className="flex items-center gap-4">
        <img
          src="/favicon.png"
          alt="Minerva Foods"
          width={48}
          height={48}
          className="h-12 w-12 rounded-xl object-contain"
          style={{ background: 'rgba(255,255,255,0.04)', padding: 4 }}
        />
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: '#fafafa', letterSpacing: '-0.02em' }}
            >
              Compras Now Executivo
            </h1>
            <span
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(227, 6, 19, 0.16)', color: '#FF3B49' }}
            >
              <span
                className="presentation-live-dot h-1.5 w-1.5 rounded-full"
                style={{ background: '#FF3B49' }}
              />
              Ao vivo
            </span>
          </div>
          <div className="text-sm" style={{ color: '#a1a1aa' }}>
            Painel executivo - DUX / Minerva Reports
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: '#71717a' }}>
            Atualizado em
          </div>
          <div className="text-2xl font-bold tabular" style={{ color: '#fafafa', letterSpacing: '-0.02em' }}>
            {formatTime(now)}
          </div>
          {todayCapturedAt && (
            <div className="text-xs tabular" style={{ color: '#a1a1aa' }}>
              ultima captura {timeAgo(todayCapturedAt)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
            style={{
              borderColor: 'rgba(244,244,245,0.12)',
              color: '#fafafa',
              background: 'rgba(244,244,245,0.04)',
            }}
            title="Sair do modo apresentacao (ESC)"
          >
            <Minimize2 className="h-4 w-4" strokeWidth={2} />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="flex items-center justify-between px-8 py-3 border-t text-[11px] tracking-[0.06em]"
      style={{ borderColor: 'rgba(244,244,245,0.08)', color: '#71717a' }}
    >
      <span>Fonte oficial: DUX &gt; Minerva Reports &gt; Relatorios de Controle &gt; Compras Now</span>
      <span className="tabular">{formatDateTime(new Date())} - ESC para sair</span>
    </footer>
  );
}
