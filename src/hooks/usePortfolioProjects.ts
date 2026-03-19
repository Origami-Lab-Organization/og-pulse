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
  end_date?: string | null;
  portfolio_stage: PortfolioStage;
  lead_id: string | null;
  client?: {
    id: string;
    company_name: string;
    trading_name: string | null;
  };
  service_line?: string;
  service?: {
    name: string;
    billing_type: string;
  } | null;
  manager?: {
    id: string;
    nome: string;
    cargo: string;
  };
  installments?: {
    value: number;
    status: string;
    due_date: string;
  }[];
  milestones?: {
    status: string | null;
    start_date: string;
    end_date: string;
    completed_date: string | null;
  }[];
}

interface PortfolioFilters {
  searchQuery?: string;
  clientId?: string;
  serviceLine?: string;
  managerId?: string;
  year?: number;
}

export const usePortfolioProjects = (searchQuery?: string, filters?: PortfolioFilters) => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const employeeId = employee?.id;

  const clientId = filters?.clientId;
  const serviceLineFilter = filters?.serviceLine;
  const managerIdFilter = filters?.managerId;
  const yearFilter = filters?.year;

  return useQuery({
    queryKey: ['portfolio-projects', tenantId, searchQuery, isAdmin, employeeId, clientId, serviceLineFilter, managerIdFilter, yearFilter],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          total_value,
          start_date,
          end_date,
          portfolio_stage,
          lead_id,
          service_line,
          manager_id,
          client:clients(id, company_name, trading_name),
          manager:employees!projects_manager_id_fkey(id, nome, cargo),
          installments:project_installments(value, status, due_date),
          milestones:project_milestones(status, start_date, end_date, completed_date)
        `)
        .eq('tenant_id', tenantId!);

      // Se não é admin, filtra apenas projetos onde é gerente
      if (!isAdmin && employeeId) {
        query = query.eq('manager_id', employeeId);
      }

      // Filtros avançados
      if (clientId) query = query.eq('client_id', clientId);
      if (serviceLineFilter) query = query.eq('service_line', serviceLineFilter);
      if (isAdmin && managerIdFilter) query = query.eq('manager_id', managerIdFilter);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching portfolio projects:', error);
        throw error;
      }

      let projects = (data || []) as unknown as PortfolioProject[];

      if (searchQuery && searchQuery.length > 0) {
        const q = searchQuery.toLowerCase();
        projects = projects.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.client?.company_name || '').toLowerCase().includes(q) ||
          (p.client?.trading_name || '').toLowerCase().includes(q) ||
          (p.manager?.nome || '').toLowerCase().includes(q)
        );
      }

      // Filter installments by year if selected
      if (yearFilter) {
        projects = projects.map(p => ({
          ...p,
          installments: (p.installments || []).filter(i => {
            if (!i.due_date) return false;
            return new Date(i.due_date).getFullYear() === yearFilter;
          }),
        }));
      }

      // service_line is a plain text column — some projects may have old slugs instead of UUIDs
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const serviceIds = [...new Set(
        projects.map(p => p.service_line).filter((s): s is string => !!s && uuidPattern.test(s))
      )];
      let serviceMap = new Map<string, { name: string; billing_type: string }>();
      if (serviceIds.length > 0) {
        const { data: services, error: svcError } = await supabase
          .from('services')
          .select('id, name, billing_type')
          .eq('tenant_id', tenantId!)
          .in('id', serviceIds);
        if (svcError) {
          console.error('Error fetching services for portfolio:', svcError);
        }
        serviceMap = new Map(
          (services || []).map(s => [s.id, { name: s.name, billing_type: s.billing_type ?? '' }])
        );
      }

      return projects.map(p => ({
        ...p,
        service: p.service_line ? (serviceMap.get(p.service_line) ?? null) : null,
      }));
    },
    enabled: !!tenantId,
  });
};

export const useUpdatePortfolioStage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, newStage }: { projectId: string; newStage: PortfolioStage }) => {
      const updateData: Record<string, unknown> = { portfolio_stage: newStage };
      if (newStage === 'completed') {
        updateData.status = 'completed';
      }
      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
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
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
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
