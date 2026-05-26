import { Quote } from 'lucide-react';

/**
 * Frase corporativa Minerva renderizada com cada palavra-chave em sua cor.
 * Reconstruida em React/CSS para escalar e adaptar a fundos diferentes -
 * NAO usa PNG da arte original. Cores extraidas da referencia oficial:
 *
 *   "Criando conexoes entre pessoas, alimentos e natureza"
 *      cyan      red    navy   purple    orange  navy  green
 *
 * Usa CSS vars (--tagline-*) para que dark/light tenha tonalidade ajustada.
 */

type Size = 'hero' | 'large' | 'medium' | 'compact';
type Align = 'center' | 'left';

interface Props {
  size?: Size;
  align?: Align;
  className?: string;
}

const SIZE_CLASSES: Record<Size, string> = {
  hero: 'text-[clamp(2rem,5vw,3.75rem)] leading-[1.05]',
  large: 'text-[clamp(1.5rem,3.6vw,2.5rem)] leading-[1.1]',
  medium: 'text-[clamp(1.1rem,2.2vw,1.5rem)] leading-[1.15]',
  compact: 'text-base sm:text-lg leading-snug',
};

const QUOTE_SIZE: Record<Size, number> = {
  hero: 48,
  large: 36,
  medium: 26,
  compact: 18,
};

export default function MinervaTagline({ size = 'large', align = 'center', className = '' }: Props) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  const quoteOpenClass = align === 'center' ? '-translate-y-1' : '';
  return (
    <div className={`${className} ${alignClass} font-display tracking-tight ${SIZE_CLASSES[size]}`}>
      <Quote
        className={`inline-block align-top mr-2 sm:mr-3 ${quoteOpenClass}`}
        style={{ color: 'var(--tagline-cyan)', transform: 'scaleX(-1)' }}
        size={QUOTE_SIZE[size]}
        strokeWidth={2.4}
        fill="currentColor"
        aria-hidden
      />
      <span className="italic font-medium" style={{ color: 'var(--tagline-cyan)' }}>
        Criando
      </span>{' '}
      <span className="font-extrabold" style={{ color: 'var(--tagline-red)' }}>
        conex&otilde;es
      </span>{' '}
      <span className="font-semibold" style={{ color: 'var(--tagline-navy)' }}>
        entre
      </span>{' '}
      <span className="font-extrabold" style={{ color: 'var(--tagline-purple)' }}>
        pessoas,
      </span>{' '}
      <span className="font-extrabold" style={{ color: 'var(--tagline-orange)' }}>
        alimentos
      </span>{' '}
      <span className="font-semibold" style={{ color: 'var(--tagline-navy)' }}>
        e
      </span>{' '}
      <span className="font-extrabold" style={{ color: 'var(--tagline-green)' }}>
        natureza
      </span>
      <Quote
        className="inline-block align-top ml-2 sm:ml-3"
        style={{ color: 'var(--tagline-cyan)' }}
        size={QUOTE_SIZE[size]}
        strokeWidth={2.4}
        fill="currentColor"
        aria-hidden
      />
    </div>
  );
}
