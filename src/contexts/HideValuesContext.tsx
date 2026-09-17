import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, ReactNode } from 'react';
import { formatCurrency, formatPercent, HIDDEN_VALUE_MASK } from '@/lib/formatters';
import {
  HIDE_VALUES_STORAGE_KEY,
  setValuesHidden,
  subscribeValuesHidden,
  valuesAreHidden,
} from '@/lib/hideValuesStore';

/**
 * A preferência é UMA no app inteiro, não uma por tela.
 *
 * Antes cada página guardava o próprio `useState`, sincronizado só pelo evento `storage` —
 * que o navegador dispara para OUTRAS abas, nunca para a que escreveu. Na prática: ligar o
 * olho no Portfólio e abrir um projeto mostrava os valores de novo. O estado agora vive em
 * `@/lib/hideValuesStore`, e toda instância lê o mesmo valor.
 */
export function useHideValuesPreference(): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const value = useSyncExternalStore(subscribeValuesHidden, valuesAreHidden, () => false);

  const setAndPersist = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setValuesHidden(typeof next === 'function' ? next(valuesAreHidden()) : next);
  }, []);

  // Outra aba mudou a preferência: acompanha, como acompanhava antes.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === HIDE_VALUES_STORAGE_KEY && e.newValue !== null) {
        setValuesHidden(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return [value, setAndPersist];
}

const HideValuesContext = createContext<boolean>(false);

export function HideValuesProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <HideValuesContext.Provider value={value}>{children}</HideValuesContext.Provider>
  );
}

/**
 * Para quem está DENTRO do conteúdo da página (componentes, widgets, gráficos).
 *
 * Lê o contexto, que o `AppLayout` provê em volta de `children`.
 */
export function useHideValues(): boolean {
  return useContext(HideValuesContext);
}

/**
 * Para a PÁGINA, no corpo do componente de rota.
 *
 * Assina o store direto, e não o contexto, porque o provider é renderizado DENTRO do
 * `AppLayout` — que é filho da página. Chamar `useHideValues()` no corpo da página lê o
 * contexto de CIMA do provider, onde não há nenhum, e devolve `false` para sempre: o botão
 * alternava e nada acontecia até recarregar a tela.
 *
 * Serve para a página re-renderizar quando o olho muda, fazendo `formatCurrency` rodar de
 * novo na subárvore inteira. Re-render, não remontagem.
 */
export function useHideValuesOnScreen(): boolean {
  const [hidden] = useHideValuesPreference();
  return hidden;
}

/**
 * Continua existindo porque quem chama vira CONSUMIDOR do contexto e re-renderiza sozinho —
 * útil em componente memoizado, que não acompanharia o re-render da página. A máscara em si
 * já mora em `formatCurrency`; aqui só se repete o valor para o caso de o contexto dizer
 * "esconde" antes de o store propagar.
 */
export function useMaskedCurrency() {
  const hide = useHideValues();
  return (value: number | null | undefined) =>
    hide ? HIDDEN_VALUE_MASK : formatCurrency(Number(value) || 0);
}

export function useMaskedPercent() {
  const hide = useHideValues();
  return (value: number | null | undefined, decimals = 0) =>
    hide ? '•••' : formatPercent(Number(value) || 0, decimals);
}
