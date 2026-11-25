import { useCallback } from 'react';
import { useServiceLines } from '@/hooks/useServiceLines';
import { useServices } from '@/hooks/useServices';
import { rotuloDoServicoDoProjeto, servicoDoProjeto } from '@/lib/catalogo';

/** Catálogo para telas de projeto: serviços, linhas, o rótulo "Linha › Serviço" e a linha e o serviço separados (US-0048). */
export function useCatalogoDosProjetos() {
  const { data: services = [] } = useServices();
  const { data: lines = [] } = useServiceLines();
  const rotuloDoServico = useCallback(
    (serviceLine: string | null) => rotuloDoServicoDoProjeto(serviceLine, services, lines),
    [services, lines],
  );
  const linhaEServico = useCallback(
    (serviceLine: string | null) => servicoDoProjeto(serviceLine, services, lines),
    [services, lines],
  );
  return { services, lines, rotuloDoServico, linhaEServico };
}
