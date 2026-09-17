import { useSyncExternalStore } from 'react';
import { areValuesHidden, subscribeValueVisibility } from '@/lib/valueVisibility';

/**
 * Assina a preferência de ocultar valores (o "olho" do cabeçalho).
 *
 * Quem consome: o botão, para desenhar o estado, e o `AppLayout`, cujo `key` remonta o
 * conteúdo da rota — é isso que faz as ~600 chamadas de `formatCurrency` no JSX refletirem a
 * mudança sem terem sido editadas uma a uma. Ver `@/lib/valueVisibility`.
 */
export function useValuesHidden(): boolean {
  return useSyncExternalStore(subscribeValueVisibility, areValuesHidden, () => false);
}
