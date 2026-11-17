import { useSyncExternalStore } from 'react';

/** A partir daqui (breakpoint `lg` do Tailwind) um painel lateral cabe ao lado da lista. */
const LARGURA_MINIMA = 1024;
const CONSULTA = `(min-width: ${LARGURA_MINIMA}px)`;

function assinar(avisar: () => void): () => void {
  const mql = window.matchMedia(CONSULTA);
  mql.addEventListener('change', avisar);
  return () => mql.removeEventListener('change', avisar);
}

const agora = () => window.matchMedia(CONSULTA).matches;

/** Tela de computador (1024 px ou mais). Muda junto com a janela. */
export function useTelaLarga(): boolean {
  return useSyncExternalStore(assinar, agora, () => true);
}
