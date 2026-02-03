import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PortfolioStage } from '@/types/portfolio';

export interface PortfolioProject {
  id: string;
  name: string;
  total_value: number;
  start_date: string;
  portfolio_stage: PortfolioStage;
  client?: {
    id: string;
    company_name: string;
    trading_name: string | null;
  };
  manager?: {
    id: string;
    nome: string;
    cargo: string;
  };
  installments?: {
    value: number;
    status: string;
  }[];
}

export const usePortfolioProjects = (searchQuery?: string) => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['portfolio-projects', tenantId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          total_value,
          start_date,
          portfolio_stage,
          client:clients(id, company_name, trading_name),
          manager:employees!projects_manager_id_fkey(id, nome, cargo),
          installments:project_installments(value, status)
        `)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (searchQuery && searchQuery.length > 0) {
        query = query.or(`name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching portfolio projects:', error);
        throw error;
      }

      return (data || []) as unknown as PortfolioProject[];
    },
    enabled: !!tenantId,
  });
};

export const useUpdatePortfolioStage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, newStage }: { projectId: string; newStage: PortfolioStage }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ portfolio_stage: newStage })
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Error updating portfolio stage:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
      toast({
        title: 'Projeto movido',
        description: 'O estágio do projeto foi atualizado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao mover projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
