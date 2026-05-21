import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import type { Toast } from '../hooks/useToasts';

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const VARIANT_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const VARIANT_CLASS = {
  info: 'border-sky-500/40 text-sky-700 dark:text-sky-300',
  success: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/40 text-amber-700 dark:text-amber-300',
  error: 'border-red-500/40 text-red-700 dark:text-red-300',
};

export default function Toaster({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = VARIANT_ICON[t.variant];
        return (
          <div
            key={t.id}
            className={`card-tight flex items-start gap-3 border ${VARIANT_CLASS[t.variant]} animate-slide-up`}
          >
            <Icon className="h-5 w-5 flex-none mt-0.5" />
            <div className="text-sm font-medium flex-1" style={{ color: 'var(--text)' }}>
              {t.message}
            </div>
            <button onClick={() => onDismiss(t.id)} className="btn-ghost h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
