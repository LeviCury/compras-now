import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  emphasis?: 'default' | 'primary';
  footer?: ReactNode;
}

export default function KPICard({
  icon: Icon,
  label,
  value,
  hint,
  emphasis = 'default',
  footer,
}: Props) {
  const iconStyle =
    emphasis === 'primary'
      ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
      : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' };

  return (
    <div className="card-padded flex flex-col gap-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <span className="label-muted">{label}</span>
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
          style={iconStyle}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </div>
      <div>
        <div
          className="text-3xl font-bold tabular tracking-tight"
          style={{
            color:
              emphasis === 'primary' ? 'var(--accent)' : 'var(--text)',
          }}
        >
          {value}
        </div>
        {hint && (
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </div>
        )}
      </div>
      {footer && (
        <div className="text-xs pt-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
