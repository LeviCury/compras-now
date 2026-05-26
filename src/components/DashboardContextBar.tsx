import { Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ComprasSnapshot, PeriodKey } from '../types';
import { formatDateTime, minutesSince, timeAgo } from '../utils/formatters';

interface Props {
  snapshot?: ComprasSnapshot | null;
  activePeriod: PeriodKey;
}

/**
 * Faixa fina (nao sticky) que aparece logo abaixo da PeriodNav, dentro do
 * fluxo da pagina. Mostra periodo selecionado em destaque, breadcrumb DUX
 * e horario de captura. Substitui o antigo DashboardHeader.
 */
export default function DashboardContextBar({ snapshot, activePeriod }: Props) {
  const lastUpdate = snapshot?.capturedAt;
  const lateMinutes = lastUpdate ? minutesSince(lastUpdate) : null;
  const isLate = activePeriod === 'today' && lateMinutes !== null && lateMinutes > 180;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar
            className="h-4 w-4 shrink-0"
            strokeWidth={2}
            style={{ color: 'var(--text-faint)' }}
          />
          <h2
            className="text-base sm:text-lg font-semibold tracking-tight truncate"
            style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}
          >
            {snapshot?.periodLabel ?? 'Sem periodo selecionado'}
          </h2>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
          {snapshot?.source?.breadcrumb ?? 'DUX > Minerva Reports > Relatorios de Controle > Compras Now'}
        </p>
      </div>

      <div
        className="inline-flex items-center gap-2 self-start sm:self-auto px-3 h-8 rounded-lg border text-xs lg:hidden"
        style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
        title={lastUpdate ? formatDateTime(lastUpdate) : 'Sem dados'}
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
          {lastUpdate ? timeAgo(lastUpdate) : '-'}
        </span>
      </div>
    </motion.section>
  );
}
