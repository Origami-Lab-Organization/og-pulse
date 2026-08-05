import { supabase } from '@/integrations/supabase/client';
import { ServiceLineAvgTicketDB } from '@/types/serviceLineAvgTicket';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = () => supabase.from('service_line_avg_tickets' as any);

export interface UpdateServiceLineAvgTicketInput {
  avgTicketValue: number;
  isManualOverride: boolean;
  updatedBy: string;
}

export const serviceLineAvgTicketService = {
  async getAll(tenantId: string): Promise<ServiceLineAvgTicketDB[]> {
    const { data, error } = await fromTable()
      .select('*')
      .eq('tenant_id', tenantId)
      .order('label');

    if (error) {
      console.error('Error fetching service line avg tickets:', error);
      throw error;
    }

    return (data || []) as unknown as ServiceLineAvgTicketDB[];
  },

  async update(id: string, input: UpdateServiceLineAvgTicketInput): Promise<ServiceLineAvgTicketDB> {
    const { data, error } = await fromTable()
      .update({
        avg_ticket_value: input.avgTicketValue,
        is_manual_override: input.isManualOverride,
        updated_by: input.updatedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service line avg ticket:', error);
      throw error;
    }

    return data as unknown as ServiceLineAvgTicketDB;
  },

  /** Restaura o valor calculado automaticamente, saindo do modo override manual. */
  async resetToComputed(id: string, computedValue: number, updatedBy: string): Promise<ServiceLineAvgTicketDB> {
    return this.update(id, { avgTicketValue: computedValue, isManualOverride: false, updatedBy });
  },

  async recalculateNow(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('recalculate_service_line_avg_tickets_now');
    if (error) {
      console.error('Error recalculating service line avg tickets:', error);
      throw error;
    }
    return (data as number) ?? 0;
  },
};
