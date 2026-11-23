import { useRef, useState } from 'react';
import { guardarPainel, painelDoNavegador } from '@/lib/prospecting/filtrosReceita';
import { useTelaLarga } from '@/hooks/useTelaLarga';

/**
 * Painel de filtros da tela Empresas (US-0004).
 *
 * - Computador: ao lado da lista; recolhido na primeira visita e, depois, como a pessoa deixou.
 * - Celular e tablet: gaveta por cima da lista, sempre fechada ao chegar, sem lembrar.
 *
 * Ao recolher, o foco volta ao botão "Filtros" (`botao`): o botão de recolher some com o painel.
 */
export function usePainelDeFiltros() {
  const larga = useTelaLarga();
  const [lateral, setLateral] = useState(painelDoNavegador);
  const [gaveta, setGaveta] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const aberto = larga ? lateral : gaveta;

  const definir = (novo: boolean) => {
    if (!larga) return setGaveta(novo);
    setLateral(novo);
    guardarPainel(novo);
  };
  const recolher = () => {
    definir(false);
    botao.current?.focus();
  };

  return { larga, aberto, botao, alternar: () => definir(!aberto), recolher, definirGaveta: setGaveta };
}
