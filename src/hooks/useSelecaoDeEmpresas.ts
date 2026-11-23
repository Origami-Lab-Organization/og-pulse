import { useMemo, useState } from 'react';
import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import type { SelecaoDaLista } from '@/types/filtrosReceita';

/**
 * Empresas marcadas na lista da base (US-0008). Guarda a empresa inteira, e não só o CNPJ, para
 * a janela ter nome e faturamento mesmo depois de trocar de página ou de filtro.
 */
export function useSelecaoDeEmpresas() {
  const [porCnpj, setPorCnpj] = useState<ReadonlyMap<string, EmpresaReceita>>(new Map());

  const onMarcar = (empresas: EmpresaReceita[], marcar: boolean) =>
    setPorCnpj((atual) => {
      const nova = new Map(atual);
      for (const e of empresas) {
        if (marcar) nova.set(e.cnpj, e);
        else nova.delete(e.cnpj);
      }
      return nova;
    });

  const selecao: SelecaoDaLista = useMemo(() => ({ marcadas: new Set(porCnpj.keys()), onMarcar }), [porCnpj]);
  const empresas = useMemo(() => [...porCnpj.values()], [porCnpj]);
  const limpar = () => setPorCnpj(new Map());

  return { selecao, empresas, limpar };
}
