"""
Remove o fundo preto do PNG oficial da tagline Minerva e gera versao com alpha
transparente real. Tecnica: alpha = max(R,G,B), com leve compensacao das cores
para evitar "halos" pretos no anti-aliasing das letras.

Uso:
    python scripts/process_tagline.py
"""

from pathlib import Path

from PIL import Image

SRC = Path("public/brand/minerva-tagline.png")
DST = SRC  # sobrescreve in-place


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            # alpha = canal mais brilhante: preto puro = 0 (transparente),
            # branco/colorido = 255 (opaco). Bordas anti-aliased ficam
            # semi-transparentes preservando a cor da letra.
            a = max(r, g, b)
            if a == 0:
                px[x, y] = (0, 0, 0, 0)
                continue
            # Compensa "halo" preto nas bordas: divide a cor pelo alpha
            # (premultiplied -> straight alpha). Resultado: cores saturadas
            # bonitas em qualquer fundo (claro ou escuro).
            scale = 255.0 / a
            nr = min(255, int(r * scale))
            ng = min(255, int(g * scale))
            nb = min(255, int(b * scale))
            px[x, y] = (nr, ng, nb, a)

    img.save(DST, "PNG", optimize=True)
    print(f"OK -> {DST} ({DST.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
