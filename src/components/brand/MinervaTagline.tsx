import { Quote } from 'lucide-react';

/**
 * Frase corporativa Minerva reconstruida com a hierarquia tipografica
 * exata da arte oficial (fornecida pela area de marca):
 *
 *   [aspa] "Criando" "conexoes"
 *   "entre" "pessoas,"
 *   "alimentos" "e"
 *   "natureza" [aspa]
 *
 * As palavras-chave (conexoes, pessoas, alimentos, natureza) sao maiores e
 * em bold; as palavras de ligacao (Criando, entre, e) sao menores e em
 * italic. As aspas sao cyan, do mesmo tamanho das palavras-chave.
 *
 * Cores oficiais Minerva (definidas em src/index.css como CSS vars que
 * tem variante para dark mode).
 */

type Size = 'hero' | 'large' | 'medium' | 'compact';

interface Props {
  size?: Size;
  className?: string;
}

interface Scale {
  key: string;        // tailwind class das palavras-chave (bold, grandes)
  join: string;       // tailwind class das palavras de ligacao (italic, menores)
  quote: number;      // px do icone Quote
  lineGap: string;    // gap vertical entre linhas
  inlineGap: string;  // gap horizontal entre palavras na mesma linha
}

const SCALES: Record<Size, Scale> = {
  hero: {
    key: 'text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95]',
    join: 'text-[clamp(1.6rem,4vw,3.2rem)] leading-[0.95]',
    quote: 64,
    lineGap: 'gap-y-1 sm:gap-y-2',
    inlineGap: 'gap-x-3 sm:gap-x-5',
  },
  large: {
    key: 'text-[clamp(1.8rem,4.6vw,3.2rem)] leading-[0.95]',
    join: 'text-[clamp(1.1rem,2.6vw,1.85rem)] leading-[0.95]',
    quote: 40,
    lineGap: 'gap-y-1',
    inlineGap: 'gap-x-2 sm:gap-x-4',
  },
  medium: {
    key: 'text-[clamp(1.3rem,3vw,2rem)] leading-[0.95]',
    join: 'text-[clamp(0.85rem,1.8vw,1.2rem)] leading-[0.95]',
    quote: 28,
    lineGap: 'gap-y-1',
    inlineGap: 'gap-x-2 sm:gap-x-3',
  },
  compact: {
    key: 'text-[clamp(1rem,2.2vw,1.4rem)] leading-[0.95]',
    join: 'text-[clamp(0.7rem,1.4vw,0.9rem)] leading-[0.95]',
    quote: 20,
    lineGap: 'gap-y-0.5',
    inlineGap: 'gap-x-1.5 sm:gap-x-2',
  },
};

export default function MinervaTagline({ size = 'large', className = '' }: Props) {
  const s = SCALES[size];

  return (
    <div
      className={`font-display tracking-tight text-center inline-flex flex-col items-center ${s.lineGap} ${className}`}
      aria-label="Criando conexoes entre pessoas, alimentos e natureza"
    >
      {/* Linha 1: [«] Criando conexoes */}
      <div className={`inline-flex items-start ${s.inlineGap}`}>
        <Quote
          className="shrink-0"
          style={{ color: 'var(--tagline-cyan)', transform: 'scaleX(-1)' }}
          size={s.quote}
          strokeWidth={2.4}
          fill="currentColor"
          aria-hidden
        />
        <span className={`${s.join} italic font-medium`} style={{ color: 'var(--tagline-cyan)' }}>
          Criando
        </span>
        <span className={`${s.key} font-extrabold`} style={{ color: 'var(--tagline-red)' }}>
          conex&otilde;es
        </span>
      </div>

      {/* Linha 2: entre pessoas, */}
      <div className={`inline-flex items-baseline ${s.inlineGap}`}>
        <span className={`${s.join} italic font-medium`} style={{ color: 'var(--tagline-navy)' }}>
          entre
        </span>
        <span className={`${s.key} font-extrabold`} style={{ color: 'var(--tagline-purple)' }}>
          pessoas,
        </span>
      </div>

      {/* Linha 3: alimentos e */}
      <div className={`inline-flex items-baseline ${s.inlineGap}`}>
        <span className={`${s.key} font-extrabold`} style={{ color: 'var(--tagline-orange)' }}>
          alimentos
        </span>
        <span className={`${s.join} italic font-medium`} style={{ color: 'var(--tagline-navy)' }}>
          e
        </span>
      </div>

      {/* Linha 4: natureza [»] */}
      <div className={`inline-flex items-start ${s.inlineGap}`}>
        <span className={`${s.key} font-extrabold`} style={{ color: 'var(--tagline-green)' }}>
          natureza
        </span>
        <Quote
          className="shrink-0 self-end"
          style={{ color: 'var(--tagline-cyan)' }}
          size={s.quote}
          strokeWidth={2.4}
          fill="currentColor"
          aria-hidden
        />
      </div>
    </div>
  );
}
