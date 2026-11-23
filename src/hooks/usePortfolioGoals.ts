import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import type { PortfolioGoals } from '@/types/portfolio';

const KEY = 'portfolio-goals';

/** Tabela ainda não criada (migration não aplicada): vale como "sem meta", sem erro na tela. */
const isMissingTable = (code?: string) => code === '42P01' || code === 'PGRST205';

/** Metas do portfólio no ano (US-0036). `null` = meta não definida. */
export function usePortfolioGoals(year: number) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: [KEY, tenantId, year],
    queryFn: async (): Promise<PortfolioGoals | null> => {
      const { data, error } = await supabase
        .from('portfolio_goals')
        .select('year, revenue_target, gross_margin_target_percent')
        .eq('tenant_id', tenantId!)
        .eq('year', year)
        .maybeSingle();
      if (error) {
        if (isMissingTable(error.code)) return null;
        throw error;
      }
      return data
        ? { year: data.year, revenueTarget: Number(data.revenue_target), grossMarginTargetPercent: Number(data.gross_margin_target_percent) }
        : null;
    },
    enabled: !!tenantId,
  });
}

/** Grava as metas do ano. A RLS exige `configuracao:editar`. */
export function useSavePortfolioGoals() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goals: PortfolioGoals) => {
      const { error } = await supabase.from('portfolio_goals').upsert(
        {
          tenant_id: employee!.tenant_id,
          year: goals.year,
          revenue_target: goals.revenueTarget,
          gross_margin_target_percent: goals.grossMarginTargetPercent,
          updated_by: employee?.id ?? null,
        },
        { onConflict: 'tenant_id,year' },
      );
      if (error) throw error;
    },
    onSuccess: (_data, goals) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast({ title: `Metas de ${goals.year} salvas` });
    },
    onError: (error: Error) => {
      toast({ title: 'Não foi possível salvar as metas', description: mensagemParaUsuario(error), variant: 'destructive' });
    },
  });
}
