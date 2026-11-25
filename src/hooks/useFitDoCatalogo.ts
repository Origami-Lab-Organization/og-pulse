import { useMemo } from 'react';
import { useServiceLines } from '@/hooks/useServiceLines';
import { useServices } from '@/hooks/useServices';
import { fitsDoCatalogo, gruposDeFit, linhasDoFit, servicosDoFit } from '@/lib/prospecting/fitDoCatalogo';
import type { CompanyFit } from '@/types/receita';

/** Os serviços e as linhas do catálogo que mostram fit, as regras em uso e a conversão das notas (US-0047). */
export function useFitDoCatalogo() {
  const { data: services = [] } = useServices();
  const { data: lines = [] } = useServiceLines();
  return useMemo(() => {
    const servicos = servicosDoFit(services, lines);
    return {
      servicos,
      grupos: gruposDeFit(servicos),
      linhas: linhasDoFit(services, lines),
      projetar: (fits: CompanyFit[] | null) => fitsDoCatalogo(fits, servicos),
    };
  }, [services, lines]);
}
