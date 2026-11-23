import { useRef, useState } from 'react';

/**
 * Filtros da tela Empresas (US-0004; revisto em 18/11/2026): o ícone de filtros abre uma gaveta
 * por cima da lista, em qualquer tamanho de tela. O painel ao lado espremia a tabela e deixava
 * espaço sobrando embaixo dele. A gaveta sempre começa fechada; ao fechar, o foco volta ao
 * ícone (`botao`).
 */
export function usePainelDeFiltros() {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  return {
    aberto,
    botao,
    alternar: () => setAberto((a) => !a),
    recolher: () => setAberto(false),
    definir: setAberto,
  };
}
