"""
Remove o fundo preto do PNG oficial da tagline Minerva, gerando alpha
transparente real e PRESERVANDO as cores oficiais (inclusive as escuras
como navy/roxo/cinza, que precisam ficar legiveis em fundo claro).

Tecnica - smoothstep matte por luminancia:
    L = 0.299*R + 0.587*G + 0.114*B   (luminancia perceptual)
    alpha:
        L <= T_LOW              -> 0    (fundo preto puro)
        L >= T_HIGH             -> 255  (interior da letra: opaco)
        T_LOW < L < T_HIGH      -> smoothstep entre os dois (borda AA)

    (R, G, B) sao mantidos ORIGINAIS.

Resultado:
    - Fundo preto sumiu totalmente.
    - Letras de TODAS as cores (incluindo navy escuro e cinza) ficam opacas
      e legiveis em fundo claro e escuro.
    - Bordas anti-aliased ficam suaves graca a faixa intermediaria.

Uso:
    python scripts/process_tagline.py
"""

from pathlib import Path

from PIL import Image

SRC = Path("public/brand/minerva-tagline.png")
DST = SRC

# Faixa de transicao do matte (em luminancia 0..255).
T_LOW = 12   # abaixo disso, considera fundo
T_HIGH = 48  # acima disso, considera letra solida


def smoothstep(t0: float, t1: float, x: float) -> float:
    if x <= t0:
        return 0.0
    if x >= t1:
        return 1.0
    n = (x - t0) / (t1 - t0)
    return n * n * (3.0 - 2.0 * n)


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()

    opaque_count = 0
    transparent_count = 0
    partial_count = 0

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            a = int(round(smoothstep(T_LOW, T_HIGH, lum) * 255))
            px[x, y] = (r, g, b, a)
            if a == 0:
                transparent_count += 1
            elif a == 255:
                opaque_count += 1
            else:
                partial_count += 1

    img.save(DST, "PNG", optimize=True)
    print(f"OK -> {DST} ({DST.stat().st_size // 1024} KB)")
    print(
        f"   transparent={transparent_count}  partial={partial_count}  "
        f"opaque={opaque_count}"
    )


if __name__ == "__main__":
    main()
