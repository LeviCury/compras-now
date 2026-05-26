import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { useCountUp } from '../hooks/useCountUp';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Se passar, o card anima o numero de 0 (ou do anterior) ate `numericValue`. */
  numericValue?: number;
  /** Formatter usado pelo count-up por frame. Obrigatorio se `numericValue` for passado. */
  formatValue?: (n: number) => string;
  hint?: string;
  emphasis?: 'default' | 'primary';
  footer?: ReactNode;
}

export default function KPICard({
  icon: Icon,
  label,
  value,
  numericValue,
  formatValue,
  hint,
  emphasis = 'default',
  footer,
}: Props) {
  const iconStyle =
    emphasis === 'primary'
      ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
      : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' };

  const animated = useCountUp(typeof numericValue === 'number' ? numericValue : NaN, 700);
  const showValue =
    typeof numericValue === 'number' && formatValue
      ? formatValue(Number.isFinite(animated) ? animated : numericValue)
      : value;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="card-padded flex flex-col gap-3"
      style={{ willChange: 'transform' }}
    >
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
            color: emphasis === 'primary' ? 'var(--accent)' : 'var(--text)',
          }}
        >
          {showValue}
        </div>
        {hint && (
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </div>
        )}
      </div>
      {footer && (
        <div
          className="text-xs pt-2 border-t"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          {footer}
        </div>
      )}
    </motion.div>
  );
}
