import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import type { AnalyticsFilters } from './useAnalyticsData';

export interface OverdueItem {
  projectId: string;
  projectName: string;
  clientName: string;
  managerName: string;
  installmentNumber: number;
  dueDate: string;
  value: number;
  daysOverdue: number;
}

export interface RevenueByDimension {
  id: string;
  label: string;
  received: number;
  planned: number;
  faturado: number;
}

export interface RevenueAnalyticsData {
  overdueNFs: OverdueItem[];
  overdueReceipts: OverdueItem[];
  byClient: RevenueByDimension[];
  byManager: RevenueByDimension[];
  byServiceLine: RevenueByDimension[];
}

export function useRevenueAnalytics(
  filters: AnalyticsFilters,
  options?: { enabled?: boolean },
) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  const startStr = format(filters.startDate, 'yyyy-MM-dd');
  const endStr = format(filters.endDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: [
      'revenue-analytics',
      tenantId,
      startStr,
      endStr,
      filters.clientId,
      filters.managerId,
      filters.projectId,
      isAdmin,
      currentEmployeeId,
    ],
    queryFn: async (): Promise<RevenueAnalyticsData> => {
      if (!tenantId) throw new Error('No tenant');

      let projectsQuery = supabase
        .from('projects')
        .select('id, name, service_line, client:clients(id, company_name), manager:employees(id, nome)')
        .eq('tenant_id', tenantId);

      if (!isAdmin && currentEmployeeId) projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      if (filters.clientId) projectsQuery = projectsQuery.eq('client_id', filters.clientId);
      if (filters.managerId) projectsQuery = projectsQuery.eq('manager_id', filters.managerId);
      if (filters.projectId) projectsQuery = projectsQuery.eq('id', filters.projectId);

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;

      const empty: RevenueAnalyticsData = {
        overdueNFs: [], overdueReceipts: [],
        byClient: [], byManager: [], byServiceLine: [],
      };
      if (!projects || projects.length === 0) return empty;

      const projectIds = projects.map((p: any) => p.id);
      const projectMap = new Map(projects.map((p: any) => [p.id, p]));

      const [overdueRes, allRes] = await Promise.all([
        // All past-due installments (for overdue detection)
        supabase
          .from('project_installments')
          .select('id, project_id, installment_number, value, due_date, status, invoice_date')
          .in('project_id', projectIds)
          .lt('due_date', todayStr),

        // All installments (for period-scoped rankings)
        supabase
          .from('project_installments')
          .select('project_id, value, due_date, status, invoice_date, payment_date')
          .in('project_id', projectIds),
      ]);

      if (overdueRes.error) throw overdueRes.error;
      if (allRes.error) throw allRes.error;

      const todayDate = new Date();

      const overdueNFs: OverdueItem[] = (overdueRes.data || [])
        .filter((i: any) => !['invoiced', 'received'].includes(i.status) && !i.invoice_date)
        .map((i: any) => {
          const proj = projectMap.get(i.project_id) as any;
          return {
            projectId: i.project_id,
            projectName: proj?.name || '',
            clientName: proj?.client?.company_name || '',
            managerName: proj?.manager?.nome || '',
            installmentNumber: i.installment_number,
            dueDate: i.due_date,
            value: Number(i.value),
            daysOverdue: differenceInDays(todayDate, parseISO(i.due_date)),
          };
        })
        .sort((a: OverdueItem, b: OverdueItem) => b.daysOverdue - a.daysOverdue);

      const overdueReceipts: OverdueItem[] = (overdueRes.data || [])
        .filter((i: any) => i.status !== 'received')
        .map((i: any) => {
          const proj = projectMap.get(i.project_id) as any;
          return {
            projectId: i.project_id,
            projectName: proj?.name || '',
            clientName: proj?.client?.company_name || '',
            managerName: proj?.manager?.nome || '',
            installmentNumber: i.installment_number,
            dueDate: i.due_date,
            value: Number(i.value),
            daysOverdue: differenceInDays(todayDate, parseISO(i.due_date)),
          };
        })
        .sort((a: OverdueItem, b: OverdueItem) => b.daysOverdue - a.daysOverdue);

      // Period-scoped rankings
      const clientMap = new Map<string, RevenueByDimension>();
      const managerMap = new Map<string, RevenueByDimension>();
      const serviceLineMap = new Map<string, RevenueByDimension>();

      const addTo = (
        map: Map<string, RevenueByDimension>,
        key: string,
        label: string,
        received: number,
        planned: number,
        faturado: number,
      ) => {
        if (!map.has(key)) map.set(key, { id: key, label, received: 0, planned: 0, faturado: 0 });
        const e = map.get(key)!;
        e.received += received;
        e.planned += planned;
        e.faturado += faturado;
      };

      for (const inst of (allRes.data || []) as any[]) {
        const proj = projectMap.get(inst.project_id) as any;
        if (!proj) continue;

        const value = Number(inst.value);
        const inPeriodByDue = inst.due_date >= startStr && inst.due_date <= endStr;
        const inPeriodByPayment = inst.payment_date && inst.payment_date >= startStr && inst.payment_date <= endStr;
        const inPeriodByInvoice = inst.invoice_date && inst.invoice_date >= startStr && inst.invoice_date <= endStr;

        const received = inst.status === 'received' && inPeriodByPayment ? value : 0;
        const planned = inPeriodByDue ? value : 0;
        const faturado = ['invoiced', 'received'].includes(inst.status) && inst.invoice_date && inPeriodByInvoice ? value : 0;

        if (received === 0 && planned === 0 && faturado === 0) continue;

        const clientId = proj.client?.id || 'sem-cliente';
        const clientName = proj.client?.company_name || 'Sem cliente';
        const managerId = proj.manager?.id || 'sem-gerente';
        const managerName = proj.manager?.nome || 'Sem gerente';
        const serviceLine = proj.service_line || 'other';
        const serviceLineLabel = SERVICE_LINE_LABELS[serviceLine] || serviceLine;

        addTo(clientMap, clientId, clientName, received, planned, faturado);
        addTo(managerMap, managerId, managerName, received, planned, faturado);
        addTo(serviceLineMap, serviceLine, serviceLineLabel, received, planned, faturado);
      }

      return {
        overdueNFs,
        overdueReceipts,
        byClient: [...clientMap.values()].sort((a, b) => b.received - a.received),
        byManager: [...managerMap.values()].sort((a, b) => b.received - a.received),
        byServiceLine: [...serviceLineMap.values()].sort((a, b) => b.received - a.received),
      };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
