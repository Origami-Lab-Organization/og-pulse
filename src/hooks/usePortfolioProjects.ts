import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PortfolioStage } from '@/types/portfolio';

export interface PortfolioProject {
  id: string;
  name: string;
  manager_id: string | null;
  total_value: number;
  start_date: string;
  end_date: string | null;
  completed_date?: string | null;
  is_continuous: boolean;
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

  const clientId = filters?.clientId;
  const serviceLineFilter = filters?.serviceLine;
  const managerIdFilter = filters?.managerId;
  const yearFilter = filters?.year;

  return useQuery({
    queryKey: ['portfolio-projects', tenantId, searchQuery, clientId, serviceLineFilter, managerIdFilter, yearFilter],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          financials:project_financials(total_value),
          start_date,
          end_date,
          completed_date,
          is_continuous,
          portfolio_stage,
          lead_id,
          service_line,
          manager_id,
          client:clients(id, company_name, trading_name),
          manager:employees!projects_manager_id_fkey(id, nome, cargo),
          installments:project_installments(value, status, due_date)
        `)
        .eq('tenant_id', tenantId!);

      // Filtros avançados
      if (clientId) query = query.eq('client_id', clientId);
      if (serviceLineFilter) query = query.eq('service_line', serviceLineFilter);
      // Seguindo .harness/patterns/security.md: a leitura ampla depende de RLS por tenant;
      // o filtro de PM é uma escolha da tela, não uma regra de autorização.
      if (managerIdFilter) query = query.eq('manager_id', managerIdFilter);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching portfolio projects:', error);
        throw error;
      }

      // total_value vive em project_financials (PUL-164): reexposto na raiz para
      // não mudar o contrato dos consumidores do portfólio.
      let projects = ((data || []) as unknown[]).map((row) => {
        const record = row as Record<string, unknown>;
        const financials = record.financials as { total_value?: number | null } | null | undefined;
        return { ...record, total_value: Number(financials?.total_value ?? 0) };
      }) as unknown as PortfolioProject[];

      if (searchQuery && searchQuery.length > 0) {
        const q = searchQuery.toLowerCase();
        projects = projects.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.client?.company_name || '').toLowerCase().includes(q) ||
          (p.client?.trading_name || '').toLowerCase().includes(q) ||
          (p.manager?.nome || '').toLowerCase().includes(q)
        );
      }

      // O array de parcelas NÃO é recortado por ano. Os cartões, a tabela e a barra
      // de KPI passaram a exibir o VALOR DO CONTRATO (não a soma das parcelas do
      // ano), e o gerador de PDF de receita faz o próprio recorte anual — com o
      // tratamento correto de data (meio-dia local). Pré-filtrar aqui truncava o
      // insumo dele: escolher 2027 no portfólio deixava o PDF de 2026 vazio.

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
    mutationFn: async ({
      projectId,
      newStage,
      completedDate,
    }: {
      projectId: string;
      newStage: PortfolioStage;
      completedDate?: string;
    }) => {
      // Seguindo .harness/patterns/security.md: manter payload tipado evita enviar campos fora do schema.
      const updateData: {
        portfolio_stage: PortfolioStage;
        status?: 'completed';
        completed_date?: string | null;
      } = { portfolio_stage: newStage };
      if (newStage === 'completed') {
        updateData.status = 'completed';
        updateData.completed_date = completedDate;
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
