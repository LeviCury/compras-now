/**
 * Credito visivel da autoria do sistema. Usado nos lugares estrategicos
 * do app: footer do dashboard, tela de login, modo apresentacao TV.
 *
 * "HyperAutomation Team" recebe destaque em vermelho Minerva para garantir
 * que o CEO note a autoria sem o credito ficar agressivo.
 */
interface Props {
  variant?: 'light' | 'dark';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export default function HyperAutomationCredit({
  variant = 'light',
  align = 'center',
  className = '',
}: Props) {
  const baseColor =
    variant === 'dark' ? 'var(--pres-muted, #cbd5e1)' : 'var(--text-muted, #64748b)';
  const strongColor = 'var(--accent, #e34852)';

  return (
    <p
      className={`text-[12px] tracking-[0.04em] ${className}`}
      style={{
        color: baseColor,
        textAlign: align,
        margin: 0,
        lineHeight: 1.5,
        fontWeight: 500,
      }}
    >
      Desenvolvido por{' '}
      <strong style={{ color: strongColor, fontWeight: 700, letterSpacing: '0.03em' }}>
        HyperAutomation Team
      </strong>{' '}
      &middot; TI Minerva
    </p>
  );
}
