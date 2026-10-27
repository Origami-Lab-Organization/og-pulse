import { useEffect, useState } from 'react';

/** Largura `lg` do Tailwind: a partir daqui cabem três colunas lado a lado. */
const WIDE_BREAKPOINT = 1024;

const QUERY = `(min-width: ${WIDE_BREAKPOINT}px)`;

/** Tela larga o bastante para layout em colunas (pastas · lista · leitura). */
export function useIsWideScreen(): boolean {
  const [isWide, setIsWide] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setIsWide(media.matches);
    media.addEventListener('change', onChange);
    onChange();
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isWide;
}
