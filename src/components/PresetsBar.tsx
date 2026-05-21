import { CheckCircle2, Clock, Filter, RotateCcw, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import type { AllSnapshots, DashboardFilters, Origem, PeriodKey, Sexo } from '../types';
import { ORIGEM_LABELS, PERIOD_KEYS, SEXO_LABELS } from '../types';
import { formatDateTime, timeAgo } from '../utils/formatters';

interface Props {
  filters: DashboardFilters;
  isDefault: boolean;
  onToggleOrigem: (o: Origem) => void;
  onToggleSexo: (s: Sexo) => void;
  onPeriod: (p: PeriodKey) => void;
  onReset: () => void;
  allSnapshots?: AllSnapshots;
}

const ORIGENS: Origem[] = ['PY', 'UY', 'AR', 'BR', 'CO'];
const SEXOS: Sexo[] = ['MACHO', 'FEMEA'];

const TAB_TITLES: Record<PeriodKey, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last7: 'Ultimos 7 dias',
  last30: 'Ultimos 30 dias',
};

export default function PresetsBar({
  filters,
  isDefault,
  onToggleOrigem,
  onToggleSexo,
  onPeriod,
  onReset,
  allSnapshots,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <PeriodTabs active={filters.period} onPeriod={onPeriod} all={allSnapshots} />

      <div className="card-padded flex flex-col gap-3 hide-in-presentation">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" strokeWidth={2} style={{ color: 'var(--text-faint)' }} />
            <span className="label-muted">Filtros do periodo selecionado</span>
          </div>
          {!isDefault && (
            <button onClick={onReset} className="btn-ghost text-xs">
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <FilterGroup label="Origem">
            {ORIGENS.map((o) => (
              <button
                key={o}
                onClick={() => onToggleOrigem(o)}
                className={`chip ${filters.origens.includes(o) ? 'chip-active' : ''}`}
              >
                <span className="font-bold tabular">{o}</span>
                <span className="opacity-70 hidden sm:inline">{ORIGEM_LABELS[o]}</span>
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
      </div>
    </div>
  );
}

function PeriodTabs({
  active,
  onPeriod,
  all,
}: {
  active: PeriodKey;
  onPeriod: (p: PeriodKey) => void;
  all?: AllSnapshots;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {PERIOD_KEYS.map((key) => {
        const isActive = active === key;
        const snapshot = all?.[key] ?? null;
        return (
          <PeriodTab
            key={key}
            periodKey={key}
            title={TAB_TITLES[key]}
            isActive={isActive}
            onClick={() => onPeriod(key)}
            snapshot={snapshot}
          />
        );
      })}
    </div>
  );
}

interface TabProps {
  periodKey: PeriodKey;
  title: string;
  isActive: boolean;
  onClick: () => void;
  snapshot: AllSnapshots[PeriodKey];
}

function PeriodTab({ periodKey, title, isActive, onClick, snapshot }: TabProps) {
  const status = useMemo(() => {
    if (!snapshot) {
      return { label: 'sem dados', tone: 'muted' as const };
    }
    if (periodKey === 'today') {
      const capturedDate = new Date(snapshot.capturedAt);
      const today = new Date();
      const sameDay =
        capturedDate.getFullYear() === today.getFullYear() &&
        capturedDate.getMonth() === today.getMonth() &&
        capturedDate.getDate() === today.getDate();
      if (!sameDay) {
        return { label: 'aguardando captura', tone: 'warn' as const };
      }
    }
    return { label: timeAgo(snapshot.capturedAt), tone: 'ok' as const };
  }, [snapshot, periodKey]);

  return (
    <button
      onClick={onClick}
      title={snapshot ? formatDateTime(snapshot.capturedAt) : ''}
      className="text-left rounded-xl border p-4 transition-all"
      style={{
        background: isActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
        borderColor: isActive ? 'var(--accent)' : 'var(--border)',
        boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.12em] font-semibold"
            style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
          >
            Periodo
          </div>
          <div
            className="text-base sm:text-lg font-semibold mt-0.5 tracking-tight"
            style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}
          >
            {title}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <StatusIcon tone={status.tone} />
        <span style={{ color: 'var(--text-muted)' }}>{status.label}</span>
      </div>

      {snapshot && (
        <div
          className="mt-1 text-[11px] truncate"
          style={{ color: 'var(--text-faint)' }}
          title={snapshot.periodLabel}
        >
          {snapshot.periodLabel}
        </div>
      )}
    </button>
  );
}

function StatusIcon({ tone }: { tone: 'ok' | 'warn' | 'muted' }) {
  if (tone === 'ok')
    return <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} style={{ color: 'var(--text-muted)' }} />;
  if (tone === 'warn')
    return <Clock className="h-3.5 w-3.5" strokeWidth={2} style={{ color: 'var(--accent)' }} />;
  return <XCircle className="h-3.5 w-3.5" strokeWidth={2} style={{ color: 'var(--text-faint)' }} />;
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
