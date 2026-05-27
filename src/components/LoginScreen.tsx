import { motion } from 'framer-motion';
import { LogIn, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useTheme } from '../contexts/useTheme';
import MinervaTagline from './brand/MinervaTagline';
import MinervaValues from './brand/MinervaValues';

interface Props {
  onLogin: () => void;
}

/**
 * Tela de login full-bleed cinematica:
 *   - background gradiente animado (aurora) com 3 blobs radiais sutis
 *   - card central glassmorphism com favicon Minerva, badge do produto,
 *     frase corporativa e botao "Entrar com Microsoft"
 *   - faixa inferior com os 5 valores Minerva como assinatura
 *   - toggle de tema no canto superior direito
 *
 * Substitui o redirect automatico antigo (que jogava direto pro Microsoft).
 * O click no botao dispara `goToLogin()` do AuthContext.
 */
export default function LoginScreen({ onLogin }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-between py-6 px-4 sm:px-6">
      {/* Background: gradiente base + 3 auroras animadas */}
      <BackgroundCanvas />

      {/* Toggle de tema no topo */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggle}
          className="nav-btn"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Espacador no topo pra empurrar o card pro centro */}
      <div aria-hidden className="h-2 sm:h-4" />

      {/* Card central */}
      <motion.section
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-2xl mx-auto"
      >
        <div
          className="relative rounded-2xl px-6 sm:px-8 py-6 sm:py-8 flex flex-col items-center gap-4 sm:gap-5"
          style={{
            background: 'var(--login-card-bg)',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            border: '1px solid var(--login-card-border)',
            boxShadow:
              '0 24px 80px -32px rgba(0,0,0,0.35), 0 2px 0 rgba(255,255,255,0.04) inset',
          }}
        >
          {/* Halo + favicon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
            className="relative"
          >
            <div
              aria-hidden
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: 'radial-gradient(circle, rgba(227,72,82,0.35), transparent 70%)' }}
            />
            <motion.img
              src="/favicon.png"
              alt="Minerva Foods"
              width={56}
              height={56}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-contain"
              style={{
                background: 'rgba(255,255,255,0.95)',
                padding: 6,
                boxShadow: '0 8px 24px -8px rgba(227,72,82,0.30)',
              }}
            />
          </motion.div>

          {/* Badge produto */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
              Compras Now Executivo
            </span>
            <p
              className="text-sm sm:text-base text-center max-w-md"
              style={{ color: 'var(--text-muted)' }}
            >
              Painel executivo de compras Minerva Foods
            </p>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.55 }}
            className="w-full"
          >
            <MinervaTagline size="medium" />
          </motion.div>

          {/* Botao Entrar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.4 }}
            className="flex flex-col items-center gap-3 w-full"
          >
            <motion.button
              type="button"
              onClick={onLogin}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              className="inline-flex items-center justify-center gap-3 px-6 sm:px-7 h-11 sm:h-12 rounded-xl text-sm sm:text-base font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, #b03742 100%)',
                boxShadow:
                  '0 12px 32px -8px rgba(227,72,82,0.55), 0 0 0 1px rgba(255,255,255,0.10) inset',
                minWidth: 280,
              }}
            >
              <MicrosoftLogo />
              <span>Entrar com sua conta Microsoft</span>
              <LogIn className="h-4 w-4" strokeWidth={2.4} />
            </motion.button>

            <p
              className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs"
              style={{ color: 'var(--text-faint)' }}
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
              Acesso restrito a colaboradores Minerva Foods
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Faixa inferior com valores */}
      <motion.footer
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="relative z-10 w-full max-w-5xl mx-auto px-2 sm:px-4 pt-4 sm:pt-6"
      >
        <p
          className="text-center text-[10px] uppercase tracking-[0.16em] font-semibold mb-3"
          style={{ color: 'var(--text-faint)' }}
        >
          Valores Minerva Foods
        </p>
        <MinervaValues variant="compact" />
      </motion.footer>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 23 23"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}

/**
 * Background animado: gradiente base + 3 blobs radiais que se movem.
 * Implementado em CSS puro (variaveis e animacao keyframe) - nao usa lib.
 */
function BackgroundCanvas() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" style={{ background: 'var(--login-bg)' }}>
      <div className="login-aurora login-aurora-1" />
      <div className="login-aurora login-aurora-2" />
      <div className="login-aurora login-aurora-3" />
      <div className="login-grain" />
    </div>
  );
}
