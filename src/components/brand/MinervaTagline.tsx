/**
 * Frase corporativa Minerva renderizada a partir do PNG oficial fornecido
 * pela area de marca (fundo transparente, cores e tipografia padrao).
 *
 *   "Criando conexoes entre pessoas, alimentos e natureza"
 *
 * NAO aplicar filtros, blend modes, opacity reduzida ou qualquer alteracao
 * de cor - esses sao os ATIVOS oficiais Minerva. Use sempre como veio.
 *
 * O arquivo fica em /public/brand/minerva-tagline.png.
 */

type Size = 'hero' | 'large' | 'medium' | 'compact';

interface Props {
  size?: Size;
  className?: string;
}

const IMAGE_SRC = '/brand/minerva-tagline.png';

// Largura maxima por size. A imagem mantem aspect ratio sozinha.
const MAX_WIDTH: Record<Size, number> = {
  hero: 1100,
  large: 720,
  medium: 480,
  compact: 320,
};

export default function MinervaTagline({ size = 'large', className = '' }: Props) {
  return (
    <div className={`w-full flex justify-center ${className}`}>
      <img
        src={IMAGE_SRC}
        alt="Criando conexoes entre pessoas, alimentos e natureza - Minerva Foods"
        className="h-auto w-full select-none"
        style={{ maxWidth: MAX_WIDTH[size] }}
        draggable={false}
        loading="lazy"
      />
    </div>
  );
}
