import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { podeDecidirNaBase } from '@/lib/prospecting/decisoesDaBase';
import { nomeDaEmpresa, type EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import type { EmpresaParaDecidir, ModoDaDecisao } from '@/types/decisoesDaBase';

/**
 * Descartar ou "Não agora" para as empresas marcadas na lista (US-0010). As que têm
 * oportunidade em andamento ficam de fora, com aviso: para elas, o caminho é a Perda (cenário 7).
 */
export function useDecidirNaSelecao(marcadas: EmpresaReceita[]) {
  const [modo, setModo] = useState<ModoDaDecisao | null>(null);
  const elegiveis = marcadas.filter((e) => podeDecidirNaBase(e.relacao?.relacao));
  const empresas: EmpresaParaDecidir[] = elegiveis.map((e) => ({ cnpj: e.cnpj, nome: nomeDaEmpresa(e) }));

  const abrir = (novo: ModoDaDecisao) => {
    const fora = marcadas.length - elegiveis.length;
    if (fora) {
      toast({
        title: `${fora.toLocaleString('pt-BR')} ${fora === 1 ? 'ficou' : 'ficaram'} de fora`,
        description: 'Com oportunidade em andamento: para essas, registre a Perda na oportunidade.',
      });
    }
    if (elegiveis.length) setModo(novo);
  };

  return { modo, empresas, abrir, fechar: () => setModo(null) };
}
