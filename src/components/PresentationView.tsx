import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minimize2 } from 'lucide-react';
import type { AllSnapshots, DashboardFilters } from '../types';
import { PERIOD_KEYS } from '../types';
import { formatDateTime, formatTime, timeAgo } from '../utils/formatters';
import PresentationColumn from './PresentationColumn';
import MinervaTagline from './brand/MinervaTagline';
import HyperAutomationCredit from './brand/HyperAutomationCredit';

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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setShowSplash(false), 2500);
    return () => window.clearTimeout(t);
  }, []);

  const todayCapturedAt = all?.today?.capturedAt;

  if (isLoading && !all) {
    return (
      <div className="presentation-root items-center justify-center">
        <div className="text-2xl font-semibold" style={{ color: 'var(--pres-faint-2)' }}>
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
              background: 'var(--pres-card-bg)',
              borderColor: 'var(--pres-card-border)',
              boxShadow: 'inset 0 1px 0 var(--pres-subtle)',
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

      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
            style={{ background: 'var(--pres-bg)' }}
            aria-hidden
          >
            <motion.img
              src="/favicon.png"
              alt="Minerva"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
              className="h-20 w-20 rounded-2xl object-contain mb-6"
              style={{ background: '#ffffff', padding: 8 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.55, ease: 'easeOut' }}
            >
              <MinervaTagline size="hero" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.45 }}
              className="text-[11px] uppercase tracking-[0.24em] font-bold mt-8"
              style={{ color: 'var(--pres-faint)' }}
            >
              Compras Now Executivo - Minerva Foods
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
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
      style={{ borderColor: 'var(--pres-divider)' }}
    >
      <div className="flex items-center gap-4">
        <img
          src="/favicon.png"
          alt="Minerva Foods"
          width={48}
          height={48}
          className="h-12 w-12 rounded-xl object-contain"
          style={{ background: '#ffffff', padding: 4 }}
        />
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--pres-text)', letterSpacing: '-0.02em' }}
            >
              Compras Now Executivo
            </h1>
            <span
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(227, 6, 19, 0.12)', color: 'var(--pres-accent)' }}
            >
              <span
                className="presentation-live-dot h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--pres-accent)' }}
              />
              Ao vivo
            </span>
          </div>
          <div className="text-sm" style={{ color: 'var(--pres-muted)' }}>
            Painel executivo - DUX / Minerva Reports
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--pres-faint)' }}>
            Atualizado em
          </div>
          <div className="text-2xl font-bold tabular" style={{ color: 'var(--pres-text)', letterSpacing: '-0.02em' }}>
            {formatTime(now)}
          </div>
          {todayCapturedAt && (
            <div className="text-xs tabular" style={{ color: 'var(--pres-muted)' }}>
              ultima captura {timeAgo(todayCapturedAt)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
            style={{
              borderColor: 'var(--pres-card-border)',
              color: 'var(--pres-text)',
              background: 'var(--pres-subtle)',
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
      className="flex items-center justify-between px-8 py-3 border-t text-[11px] tracking-[0.06em] gap-4"
      style={{ borderColor: 'var(--pres-divider)', color: 'var(--pres-faint)' }}
    >
      <span className="flex-1 min-w-0 truncate">
        Fonte oficial: DUX &gt; Minerva Reports &gt; Relatorios de Controle &gt; Compras Now
      </span>
      <div className="flex-shrink-0">
        <HyperAutomationCredit variant="dark" />
      </div>
      <span className="tabular flex-shrink-0">{formatDateTime(new Date())} - ESC para sair</span>
    </footer>
  );
}
