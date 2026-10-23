import { createContext, useContext } from 'react';
import type { CSSProperties } from 'react';
import type { CalendarEvent } from '@/types/microsoftGraph';

/**
 * Cores das categorias do Outlook, pelo preset que o Graph devolve.
 *
 * Exceção deliberada ao "sem hex avulso" do Design System: não é paleta do
 * Pulse, é espelho de um dado do Outlook — a categoria "vermelha" precisa ser
 * vermelha aqui também, senão a pessoa não a reconhece. Fica isolada neste
 * arquivo e só pinta marcadores de categoria.
 */
const OUTLOOK_PRESET_COLORS: Record<string, string> = {
  preset0: '#e74856', // vermelho
  preset1: '#f7630c', // laranja
  preset2: '#a86d4b', // marrom
  preset3: '#f2b600', // amarelo
  preset4: '#16a34a', // verde
  preset5: '#00a5b0', // azul-petróleo
  preset6: '#8a8a26', // oliva
  preset7: '#0078d4', // azul
  preset8: '#8764b8', // roxo
  preset9: '#c2185b', // cranberry
  preset10: '#69797e', // aço
  preset11: '#4a5459', // aço escuro
  preset12: '#a0a0a0', // cinza
  preset13: '#6e6e6e', // cinza escuro
  preset14: '#393939', // preto
  preset15: '#a4262c', // vermelho escuro
  preset16: '#ca5010', // laranja escuro
  preset17: '#8e562e', // marrom escuro
  preset18: '#c19c00', // amarelo escuro
  preset19: '#107c10', // verde escuro
  preset20: '#038387', // azul-petróleo escuro
  preset21: '#5c5c00', // oliva escuro
  preset22: '#004e8c', // azul escuro
  preset23: '#5c2e91', // roxo escuro
  preset24: '#8e0d3c', // cranberry escuro
};

/** Categoria sem cor (`none`) ou preset desconhecido: cinza neutro. */
const FALLBACK_COLOR = '#a0a0a0';

export function categoryHex(preset: string | null | undefined): string {
  return (preset && OUTLOOK_PRESET_COLORS[preset]) || FALLBACK_COLOR;
}

/** Nome da categoria → preset de cor do Outlook. Vazio = grade sem cor de categoria. */
export const CategoryColorsContext = createContext<Map<string, string>>(new Map());

/** Cor da primeira categoria do evento, como o Outlook pinta; `null` sem categoria conhecida. */
export function useEventCategoryColor(event: CalendarEvent): string | null {
  const byName = useContext(CategoryColorsContext);
  const first = event.categories.find((name) => byName.has(name));
  return first ? categoryHex(byName.get(first)) : null;
}

/** Faixa lateral na cor da categoria; sem categoria, nada muda no chip. */
export function useCategoryStripe(event: CalendarEvent): { className?: string; style?: CSSProperties } {
  const color = useEventCategoryColor(event);
  if (!color) return {};
  return { className: 'border-l-[3px] border-solid', style: { borderLeftColor: color } };
}
