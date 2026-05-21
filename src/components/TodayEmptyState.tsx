import { Coffee, Clock4, ArrowRight } from 'lucide-react';
import type { PeriodKey } from '../types';

interface Props {
  onSwitchPeriod: (period: PeriodKey) => void;
}

export default function TodayEmptyState({ onSwitchPeriod }: Props) {
  return (
    <div className="card-padded flex flex-col items-center gap-4 text-center py-12 sm:py-16 animate-fade-in">
      <span
        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        <Coffee className="h-8 w-8" />
      </span>
      <div>
        <h2 className="text-xl font-bold">Aguardando primeira captura de hoje</h2>
        <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--text-muted)' }}>
          O RPA roda a partir das 09:00. Antes disso, ainda nao ha volume de compras relevante para
          o dia atual. Enquanto isso, voce pode olhar como ontem fechou ou a media dos ultimos
          periodos.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-faint)' }}>
        <Clock4 className="h-3.5 w-3.5" />
        Primeira execucao intraday: hoje, 09:00
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <SwitchButton onClick={() => onSwitchPeriod('yesterday')}>
          Ver ontem fechado <ArrowRight className="h-3.5 w-3.5" />
        </SwitchButton>
        <SwitchButton onClick={() => onSwitchPeriod('last7')}>
          Ver ultimos 7 dias <ArrowRight className="h-3.5 w-3.5" />
        </SwitchButton>
        <SwitchButton onClick={() => onSwitchPeriod('last30')}>
          Ver ultimos 30 dias <ArrowRight className="h-3.5 w-3.5" />
        </SwitchButton>
      </div>
    </div>
  );
}

function SwitchButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="btn-secondary text-xs gap-1.5">
      {children}
    </button>
  );
}
