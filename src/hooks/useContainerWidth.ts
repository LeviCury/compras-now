import { useEffect, useState, type RefObject } from 'react';

/**
 * Mede a largura real do elemento referenciado em tempo real
 * via ResizeObserver. Atualiza sempre que o container muda de tamanho
 * (incluindo entrar/sair de fullscreen, redimensionar janela, etc.).
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        setWidth(rect.width);
      }
    });
    observer.observe(el);
    // Captura inicial sincrona
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
