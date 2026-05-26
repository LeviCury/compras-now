import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsFetching } from '@tanstack/react-query';
import { Clock, Moon, Play, RefreshCw, Share2, Sun } from 'lucide-react';
import type { ComprasSnapshot, PeriodKey } from '../types';
import { useTheme } from '../contexts/useTheme';
import { formatDateTime, minutesSince, timeAgo } from '../utils/formatters';
import UserBadge from './UserBadge';

interface Props {
  snapshot?: ComprasSnapshot | null;
  activePeriod: PeriodKey;
  onShare: () => void;
  onPresentation: () => void;
}

/**
 * Navbar fina sticky no topo. Carrega logo, acoes (Apresentar, Exportar,
 * tema, UserBadge) e um chip discreto "Capturado X". Vira solid com sombra
 * suave ao rolar a pagina.
 */
export default function AppNavbar({ snapshot, activePeriod, onShare, onPresentation }: Props) {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const fetchingCount = useIsFetching();
  const isFetching = fetchingCount > 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const lastUpdate = snapshot?.capturedAt;
  const lateMinutes = lastUpdate ? minutesSince(lastUpdate) : null;
  const isLate = activePeriod === 'today' && lateMinutes !== null && lateMinutes > 180;

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`hide-in-presentation sticky top-0 z-50 transition-all duration-200 ${scrolled ? 'glass-solid' : 'glass'}`}
      style={{ height: 'var(--navbar-h)' }}
    >
      <div className="mx-auto max-w-[1400px] h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        <a href="/" data-tour="navbar-brand" className="flex items-center gap-3 min-w-0 group">
          <motion.img
            src="/favicon.png"
            alt="Minerva Foods"
            width={36}
            height={36}
            whileHover={{ rotate: -6, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="h-9 w-9 rounded-lg object-contain shrink-0"
            style={{ background: 'var(--bg-elevated)', padding: 3, border: '1px solid var(--border)' }}
          />
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-base sm:text-lg font-bold tracking-tight truncate"
              style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
            >
              Compras Now
            </span>
            <span
              className="hidden sm:inline-block text-[9px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              Executivo
            </span>
          </div>
        </a>

        <div className="flex items-center gap-1 sm:gap-2">
          <AnimatePresence mode="wait" initial={false}>
            {isFetching ? (
              <motion.div
                key="fetching"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-lg border text-xs"
                style={{
                  background: 'var(--accent-soft)',
                  borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
                  color: 'var(--accent)',
                }}
                aria-live="polite"
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
                <span className="font-semibold">Atualizando dados</span>
              </motion.div>
            ) : lastUpdate ? (
              <motion.div
                key={`captured-${lastUpdate}`}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-lg border text-xs"
                style={{
                  background: 'var(--bg-subtle)',
                  borderColor: 'var(--border)',
                }}
                title={formatDateTime(lastUpdate)}
              >
                <Clock
                  className="h-3.5 w-3.5"
                  strokeWidth={2}
                  style={{ color: isLate ? 'var(--accent)' : 'var(--text-muted)' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>Capturado</span>
                <span
                  className="font-semibold tabular"
                  style={{ color: isLate ? 'var(--accent)' : 'var(--text)' }}
                >
                  {timeAgo(lastUpdate)}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Mobile/tablet: dot pulsante quando atualizando */}
          {isFetching && (
            <span
              className="lg:hidden h-2 w-2 rounded-full animate-pulse"
              style={{ background: 'var(--accent)' }}
              aria-label="Atualizando dados"
              title="Atualizando dados"
            />
          )}

          <button
            data-tour="present-btn"
            className="nav-btn"
            onClick={onPresentation}
            title="Modo apresentacao (TV)"
            aria-label="Modo apresentacao"
          >
            <Play className="h-4 w-4" strokeWidth={2} />
            <span className="hidden lg:inline">Apresentar</span>
          </button>

          <button
            className="nav-btn"
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            aria-label="Alternar tema"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <Moon className="h-4 w-4" strokeWidth={2} />
                )}
              </motion.span>
            </AnimatePresence>
          </button>

          <button data-tour="export-btn" className="nav-btn-primary" onClick={onShare}>
            <Share2 className="h-4 w-4" strokeWidth={2} />
            <span className="hidden md:inline">Exportar</span>
          </button>

          <div className="ml-1 sm:ml-2">
            <UserBadge />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
