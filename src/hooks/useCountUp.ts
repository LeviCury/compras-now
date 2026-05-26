import { useEffect, useRef, useState } from 'react';

/**
 * Hook que anima um numero de "from" ate "to" durante `durationMs` usando
 * requestAnimationFrame e easing easeOutCubic. Util para KPIs ganharem
 * vida ao trocar de periodo. Respeita prefers-reduced-motion.
 */
export function useCountUp(target: number, durationMs = 750): number {
  const [value, setValue] = useState<number>(target);
  const fromRef = useRef<number>(target);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setValue(target);
      return;
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || durationMs <= 0) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    if (from === target) return;

    startedAtRef.current = null;
    const step = (timestamp: number) => {
      if (startedAtRef.current == null) startedAtRef.current = timestamp;
      const elapsed = timestamp - startedAtRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;
      setValue(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return value;
}
