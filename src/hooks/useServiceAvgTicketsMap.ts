import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceLineAvgTicketLookup, EMPTY_AVG_TICKET_LOOKUP } from '@/lib/leadValue';

interface AvgTicketRow {
  service_line_id: string | null;
  legacy_source_key: string | null;
  avg_ticket_value: number;
}

/**
 * Mapa leve { linha de serviço → ticket médio }, usado para estimar valor de
 * oportunidades sem orçamento (Kanban, card, Forecast). Não dá acesso à
 * tabela completa (histórico/edição) — só os pares valor por linha, via RPC
 * pública (get_service_line_avg_tickets, ver migration service_line_avg_tickets).
 */
export function useServiceLineAvgTicketsMap() {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['service-line-avg-tickets-map', employee?.tenant_id],
    queryFn: async (): Promise<ServiceLineAvgTicketLookup> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_service_line_avg_tickets');
      if (error) throw error;

      const lookup: ServiceLineAvgTicketLookup = { byServiceLineId: {}, byLegacyKey: {} };
      ((data as AvgTicketRow[]) || []).forEach((row) => {
        if (row.service_line_id) lookup.byServiceLineId[row.service_line_id] = row.avg_ticket_value;
        else if (row.legacy_source_key) lookup.byLegacyKey[row.legacy_source_key] = row.avg_ticket_value;
      });
      return lookup;
    },
    enabled: !!employee?.tenant_id,
    staleTime: 5 * 60 * 1000,
    placeholderData: EMPTY_AVG_TICKET_LOOKUP,
  });
}
