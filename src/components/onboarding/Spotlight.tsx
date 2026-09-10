import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Escurece a tela e deixa um elemento aceso (PUL-250).
 *
 * **Quatro retângulos, não uma sombra gigante.** O jeito curto seria um `div` sobre o alvo
 * com `box-shadow: 0 0 0 9999px`, como faz `OnboardingModal`. O problema é que essa sombra
 * é do mesmo elemento, então ela intercepta o clique em cima do alvo: o holofote mostra o
 * botão e impede de apertá-lo. Com um retângulo de cada lado, o buraco do meio é buraco de
 * verdade e a pessoa usa a tela enquanto é guiada — que é o ponto de guiar sobre a UI real.
 *
 * Devolve `null` quando o alvo não está na tela. Quem chama trata esse caso mostrando o
 * texto alternativo do passo, nunca escondendo o passo.
 */

interface Props {
  /** Seletores em ordem de preferência: o primeiro visível ganha o holofote. */
  selectors: readonly string[];
  /** Recalcula quando muda: use o id do passo para reposicionar ao trocar de alvo. */
  stepKey: string;
  onRectChange?: (rect: DOMRect | null) => void;
}

const PADDING = 8;
const RADIUS = 10;

function visibleRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // Elemento existe no DOM mas está colapsado (menu recolhido, `display:none` de breakpoint):
  // tratar como ausente, senão o holofote acende um ponto de 0 por 0 pixel.
  if (rect.width === 0 || rect.height === 0) return null;
  return rect;
}

function findRect(selectors: readonly string[]): DOMRect | null {
  for (const selector of selectors) {
    const rect = visibleRect(selector);
    if (rect) return rect;
  }
  return null;
}

export function Spotlight(props: Props) {
  const { selectors, stepKey, onRectChange } = props;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const measure = () => setRect(findRect(selectors));
    measure();
    // `true` na captura: o alvo pode estar dentro de um container com rolagem própria, e o
    // evento de scroll dele não sobe até window na fase de bubbling.
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
    // `selectors` vem de config estática; `stepKey` é o que muda de verdade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  useEffect(() => {
    onRectChange?.(rect);
  }, [rect, onRectChange]);

  if (!rect) return null;

  const top = Math.max(0, rect.top - PADDING);
  const left = Math.max(0, rect.left - PADDING);
  const right = rect.right + PADDING;
  const bottom = rect.bottom + PADDING;
  const shade = 'fixed bg-foreground/55';

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
      <div className={shade} style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className={shade} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={shade} style={{ top, left: 0, width: left, height: bottom - top }} />
      <div className={shade} style={{ top, left: right, right: 0, height: bottom - top }} />
      <div
        className="fixed rounded-md ring-2 ring-primary ring-offset-2 ring-offset-background"
        style={{ top, left, width: right - left, height: bottom - top, borderRadius: RADIUS }}
      />
    </div>,
    document.body,
  );
}
