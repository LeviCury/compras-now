/**
 * Banner oficial dos 5 valores corporativos Minerva renderizado a partir
 * do PNG fornecido pela area de marca (fundo transparente).
 *
 *   Orientacao para Resultados | Comprometimento | Sustentabilidade |
 *   Inovacao | Reconhecimento
 *
 * O arquivo fica em /public/brand/minerva-valores.png. Quando precisarmos
 * de uma versao SVG ou de cores diferentes pra dark mode, basta substituir
 * o asset - a aplicacao nao precisa mudar.
 */

type Variant = 'horizontal' | 'compact';
type Tone = 'color' | 'mono';

interface Props {
  variant?: Variant;
  tone?: Tone;
  className?: string;
}

const IMAGE_SRC = '/brand/minerva-valores.png';

export default function MinervaValues({
  variant = 'horizontal',
  tone = 'color',
  className = '',
}: Props) {
  const isCompact = variant === 'compact';
  const isMono = tone === 'mono';

  // No modo `mono` o banner fica em escala de cinza + opacity reduzida pra
  // virar uma assinatura discreta (footer do dashboard). No `color` aparece
  // com a paleta oficial Minerva.
  const filter = isMono ? 'grayscale(1) opacity(0.55)' : undefined;

  // Largura maxima fluida. Compact eh menor (uso em footer / login),
  // horizontal eh maior (pode ser usado em hero futuro).
  const maxWidth = isCompact ? 720 : 960;

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <img
        src={IMAGE_SRC}
        alt="Valores Minerva Foods: Orientacao para Resultados, Comprometimento, Sustentabilidade, Inovacao, Reconhecimento"
        className="h-auto w-full select-none"
        style={{
          maxWidth,
          filter,
          // Pequena suavizacao em fundos escuros (a imagem original e' pensada
          // pra fundo claro). Em dark mode, deixamos `mix-blend-mode: normal`
          // mas reforcamos contraste com um leve brightness.
        }}
        draggable={false}
        loading="lazy"
      />
    </div>
  );
}
