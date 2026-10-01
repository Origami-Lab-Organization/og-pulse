import { supabase } from '@/integrations/supabase/client';
import type { ProjectPersonHoursRow } from '@/types/relatorioHoras';

/** Horas por projeto e pessoa (ADR-0025: só horas, autorizado por projeto em `can_read_project_hours`). */
export const relatorioHorasService = {
  async getProjectPersonHours(tenantId: string, from: string, to: string): Promise<ProjectPersonHoursRow[]> {
    const { data, error } = await supabase.rpc('project_hours_by_person', { p_tenant_id: tenantId, p_from: from, p_to: to });
    if (error) throw error;
    return (data ?? []) as unknown as ProjectPersonHoursRow[];
  },
};
