import { Award, Heart, Leaf, Lightbulb, TrendingUp, type LucideIcon } from 'lucide-react';

/**
 * Os 5 valores corporativos Minerva renderizados como uma faixa horizontal
 * de "pilares" (icone circular + label colorido). Reconstruido em React;
 * NAO usa PNG da arte original.
 *
 *   Orientacao para Resultados -- TrendingUp (cyan)
 *   Comprometimento             -- Heart      (red)
 *   Sustentabilidade            -- Leaf       (green)
 *   Inovacao                    -- Lightbulb  (orange)
 *   Reconhecimento              -- Award      (purple)
 */

type Variant = 'horizontal' | 'compact';
type Tone = 'color' | 'mono';

interface Props {
  variant?: Variant;
  tone?: Tone;
  className?: string;
}

interface ValueDef {
  label: string;
  icon: LucideIcon;
  colorVar: string;
}

const VALUES: ValueDef[] = [
  { label: 'Orientacao para Resultados', icon: TrendingUp, colorVar: 'var(--tagline-cyan)' },
  { label: 'Comprometimento', icon: Heart, colorVar: 'var(--tagline-red)' },
  { label: 'Sustentabilidade', icon: Leaf, colorVar: 'var(--tagline-green)' },
  { label: 'Inovacao', icon: Lightbulb, colorVar: 'var(--tagline-orange)' },
  { label: 'Reconhecimento', icon: Award, colorVar: 'var(--tagline-purple)' },
];

export default function MinervaValues({
  variant = 'horizontal',
  tone = 'color',
  className = '',
}: Props) {
  const isCompact = variant === 'compact';
  const itemGap = isCompact ? 'gap-3 sm:gap-5' : 'gap-5 sm:gap-8';

  return (
    <ul
      role="list"
      aria-label="Valores Minerva Foods"
      className={`flex flex-wrap items-start justify-center ${itemGap} ${className}`}
    >
      {VALUES.map((v) => (
        <ValueItem key={v.label} value={v} variant={variant} tone={tone} />
      ))}
    </ul>
  );
}

function ValueItem({
  value,
  variant,
  tone,
}: {
  value: ValueDef;
  variant: Variant;
  tone: Tone;
}) {
  const isCompact = variant === 'compact';
  const isMono = tone === 'mono';
  const color = isMono ? 'var(--text-faint)' : value.colorVar;
  const labelColor = isMono ? 'var(--text-muted)' : value.colorVar;
  const Icon = value.icon;

  const circleSize = isCompact ? 'h-8 w-8' : 'h-10 w-10 sm:h-12 sm:w-12';
  const iconSize = isCompact ? 16 : 20;
  const labelSize = isCompact ? 'text-[10px] sm:text-[11px]' : 'text-xs sm:text-sm';
  // Garante 2 linhas de altura no label pra alinhar todos os itens pela base,
  // ja' que "Orientacao para Resultados" quebra em 2 linhas e os outros nao.
  const labelMinHeight = isCompact ? 'min-h-[2.6em]' : 'min-h-[2.8em]';
  const itemWidth = isCompact ? 'w-[96px] sm:w-[112px]' : 'w-[112px] sm:w-[128px]';

  return (
    <li className={`flex flex-col items-center gap-1.5 ${itemWidth}`}>
      <span
        className={`${circleSize} inline-flex items-center justify-center rounded-full transition-transform shrink-0`}
        style={{
          background: isMono ? 'var(--bg-subtle)' : 'color-mix(in srgb, ' + color + ' 12%, transparent)',
          border: `1.5px solid ${color}`,
          color,
        }}
      >
        <Icon size={iconSize} strokeWidth={2.2} />
      </span>
      <span
        className={`${labelSize} ${labelMinHeight} font-semibold text-center leading-tight tracking-tight flex items-start justify-center`}
        style={{ color: labelColor }}
      >
        {value.label}
      </span>
    </li>
  );
}
