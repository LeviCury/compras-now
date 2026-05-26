import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { AllSnapshots, DashboardFilters, Origem, PeriodKey, Sexo } from '../types';
import { DEFAULT_FILTERS, ORIGEM_LABELS, PERIOD_KEYS, SEXO_LABELS } from '../types';
import { timeAgo } from '../utils/formatters';

interface Props {
  filters: DashboardFilters;
  isDefault: boolean;
  onToggleOrigem: (o: Origem) => void;
  onToggleSexo: (s: Sexo) => void;
  onPeriod: (p: PeriodKey) => void;
  onReset: () => void;
  allSnapshots?: AllSnapshots;
}

const TAB_TITLES: Record<PeriodKey, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last7: 'Ultimos 7 dias',
  last30: 'Ultimos 30 dias',
};

const TAB_SHORT: Record<PeriodKey, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last7: '7 dias',
  last30: '30 dias',
};

const ORIGENS: Origem[] = ['PY', 'UY', 'AR', 'BR', 'CO'];
const SEXOS: Sexo[] = ['MACHO', 'FEMEA'];

/**
 * Barra sticky logo abaixo da AppNavbar. Mostra os 4 periodos como tabs
 * com indicador deslizante (layoutId) e um botao "Filtros" que abre um
 * popover inline com os chips de origem e tipo.
 */
export default function PeriodNav({
  filters,
  isDefault,
  onToggleOrigem,
  onToggleSexo,
  onPeriod,
  onReset,
  allSnapshots,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const filtersBadge = useMemo(() => {
    const removedOrigens = DEFAULT_FILTERS.origens.length - filters.origens.length;
    const removedSexos = DEFAULT_FILTERS.sexos.length - filters.sexos.length;
    const total = Math.max(0, removedOrigens) + Math.max(0, removedSexos);
    return total;
  }, [filters]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [filtersOpen]);

  return (
    <motion.div
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
      className="hide-in-presentation glass sticky z-40"
      style={{ top: 'var(--navbar-h)', height: 'var(--periodbar-h)' }}
    >
      <div className="mx-auto max-w-[1400px] h-full px-3 sm:px-6 flex items-center justify-between gap-2">
        <div data-tour="period-tabs" role="tablist" aria-label="Periodo" className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {PERIOD_KEYS.map((key) => {
            const snapshot = allSnapshots?.[key] ?? null;
            const isActive = filters.period === key;
            const status = computeStatus(snapshot, key);
            return (
              <PeriodTab
                key={key}
                periodKey={key}
                title={TAB_TITLES[key]}
                short={TAB_SHORT[key]}
                isActive={isActive}
                onClick={() => onPeriod(key)}
                status={status}
                lastCapturedLabel={snapshot ? timeAgo(snapshot.capturedAt) : '-'}
              />
            );
          })}
        </div>

        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            data-tour="filters-btn"
            onClick={() => setFiltersOpen((v) => !v)}
            className="nav-btn relative"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            title="Filtros"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            <span className="hidden md:inline">Filtros</span>
            {filtersBadge > 0 && (
              <span
                className="inline-flex items-center justify-center text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {filtersBadge}
              </span>
            )}
          </button>

          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                key="filters-popover"
                role="dialog"
                aria-label="Filtros do periodo"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-[min(92vw,420px)] rounded-xl border overflow-hidden z-50"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border)',
                  boxShadow: '0 16px 48px -12px rgba(23, 42, 57, 0.25), 0 4px 12px -4px rgba(23, 42, 57, 0.10)',
                  transformOrigin: 'top right',
                }}
              >
                <div
                  className="px-4 py-3 flex items-center justify-between border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5" strokeWidth={2} style={{ color: 'var(--text-faint)' }} />
                    <span className="label-muted">Filtros do periodo</span>
                  </div>
                  {!isDefault && (
                    <button
                      onClick={() => {
                        onReset();
                      }}
                      className="btn-ghost text-xs h-7 px-2"
                    >
                      <RotateCcw className="h-3 w-3" strokeWidth={2} />
                      Limpar
                    </button>
                  )}
                </div>

                <div className="px-4 py-4 flex flex-col gap-4">
                  <FilterGroup label="Origem">
                    {ORIGENS.map((o) => (
                      <button
                        key={o}
                        onClick={() => onToggleOrigem(o)}
                        className={`chip ${filters.origens.includes(o) ? 'chip-active' : ''}`}
                      >
                        <span className="font-bold tabular">{o}</span>
                        <span className="opacity-70">{ORIGEM_LABELS[o]}</span>
                      </button>
                    ))}
                  </FilterGroup>

                  <FilterGroup label="Tipo">
                    {SEXOS.map((s) => (
                      <button
                        key={s}
                        onClick={() => onToggleSexo(s)}
                        className={`chip ${filters.sexos.includes(s) ? 'chip-active' : ''}`}
                      >
                        {SEXO_LABELS[s]}
                      </button>
                    ))}
                  </FilterGroup>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

type StatusTone = 'ok' | 'warn' | 'muted';

interface Status {
  tone: StatusTone;
  label: string;
}

function computeStatus(
  snapshot: AllSnapshots[PeriodKey] | null,
  periodKey: PeriodKey,
): Status {
  if (!snapshot) return { tone: 'muted', label: 'sem dados' };
  if (periodKey === 'today') {
    const capturedDate = new Date(snapshot.capturedAt);
    const today = new Date();
    const sameDay =
      capturedDate.getFullYear() === today.getFullYear() &&
      capturedDate.getMonth() === today.getMonth() &&
      capturedDate.getDate() === today.getDate();
    if (!sameDay) return { tone: 'warn', label: 'aguardando' };
  }
  return { tone: 'ok', label: timeAgo(snapshot.capturedAt) };
}

interface TabProps {
  periodKey: PeriodKey;
  title: string;
  short: string;
  isActive: boolean;
  onClick: () => void;
  status: Status;
  lastCapturedLabel: string;
}

function PeriodTab({ title, short, isActive, onClick, status }: TabProps) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className="relative inline-flex items-center gap-2 px-3 sm:px-4 h-9 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
      style={{
        color: isActive ? 'var(--text)' : 'var(--text-muted)',
      }}
    >
      {isActive && (
        <motion.span
          layoutId="period-nav-pill"
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent)',
            boxShadow: '0 1px 2px rgba(227, 72, 82, 0.18)',
          }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        />
      )}
      <span className="relative inline-flex items-center gap-2">
        <StatusDot tone={status.tone} />
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{title}</span>
      </span>
    </button>
  );
}

function StatusDot({ tone }: { tone: StatusTone }) {
  const color =
    tone === 'ok' ? 'var(--positive, #afae89)' : tone === 'warn' ? 'var(--accent)' : 'var(--text-faint)';
  return (
    <span
      aria-hidden
      className="h-1.5 w-1.5 rounded-full inline-block"
      style={{ background: color, boxShadow: tone === 'warn' ? '0 0 0 3px rgba(227,72,82,0.12)' : undefined }}
    />
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.12em] font-semibold"
        style={{ color: 'var(--text-faint)' }}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
