import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ReimbursementRequest {
  id: string;
  tenant_id: string;
  requested_by: string;
  project_id: string | null;
  client_id: string | null;
  is_internal: boolean;
  description: string;
  total_amount: number;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  corrected_from_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  requester_name?: string;
  project_name?: string;
  client_name?: string;
}

export interface ReimbursementItem {
  id: string;
  reimbursement_id: string;
  expense_date: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface ReimbursementAttachment {
  id: string;
  reimbursement_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

export function useMyReimbursements() {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['my-reimbursements', employee?.id],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await supabase
        .from('reimbursement_requests' as any)
        .select('*')
        .eq('requested_by', employee.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReimbursementRequest[];
    },
    enabled: !!employee,
  });
}

export function usePendingReimbursements() {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['pending-reimbursements', employee?.id, employee?.tenant_id],
    queryFn: async () => {
      if (!employee) return [];

      let requests: ReimbursementRequest[] = [];

      if (employee.isAdmin) {
        // Admin sees all tenant pending reimbursements
        const { data, error } = await supabase
          .from('reimbursement_requests' as any)
          .select('*')
          .eq('tenant_id', employee.tenant_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        requests = (data || []) as unknown as ReimbursementRequest[];
      } else {
        // Pure gerente: own pending + pending from their projects
        const { data: memberships } = await supabase
          .from('project_members' as any)
          .select('project_id')
          .eq('employee_id', employee.id);
        const projectIds = ((memberships || []) as any[]).map((m: any) => m.project_id);

        const [ownRes, projectRes] = await Promise.all([
          supabase.from('reimbursement_requests' as any).select('*')
            .eq('requested_by', employee.id).eq('status', 'pending').order('created_at', { ascending: false }),
          projectIds.length > 0
            ? supabase.from('reimbursement_requests' as any).select('*')
                .in('project_id', projectIds).eq('status', 'pending').order('created_at', { ascending: false })
            : { data: [], error: null },
        ]);
        if (ownRes.error) throw ownRes.error;
        if ((projectRes as any).error) throw (projectRes as any).error;

        const seen = new Set<string>();
        const merged: ReimbursementRequest[] = [];
        for (const r of [...((ownRes.data || []) as any[]), ...((projectRes as any).data || []) as any[]]) {
          if (!seen.has(r.id)) { seen.add(r.id); merged.push(r as unknown as ReimbursementRequest); }
        }
        requests = merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      if (requests.length === 0) return requests;

      const employeeIds = [...new Set(requests.map(r => r.requested_by))];
      const projectIds = [...new Set(requests.filter(r => r.project_id).map(r => r.project_id!))];
      const clientIds = [...new Set(requests.filter(r => r.client_id).map(r => r.client_id!))];

      const [empRes, projRes, clientRes] = await Promise.all([
        supabase.from('employees').select('id, nome').in('id', employeeIds),
        projectIds.length > 0 ? supabase.from('projects').select('id, name').in('id', projectIds) : { data: [] },
        clientIds.length > 0 ? supabase.from('clients').select('id, company_name').in('id', clientIds) : { data: [] },
      ]);

      const empMap = new Map((empRes.data || []).map(e => [e.id, e.nome]));
      const projMap = new Map(((projRes as any).data || []).map((p: any) => [p.id, p.name]));
      const clientMap = new Map(((clientRes as any).data || []).map((c: any) => [c.id, c.company_name]));

      return requests.map(r => ({
        ...r,
        requester_name: empMap.get(r.requested_by) || 'Desconhecido',
        project_name: r.project_id ? projMap.get(r.project_id) || '' : '',
        client_name: r.client_id ? clientMap.get(r.client_id) || '' : '',
      }));
    },
    enabled: !!employee && (employee.is_gerente || employee.isAdmin),
  });
}

export function usePendingReimbursementsCount() {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['pending-reimbursements-count', employee?.id, employee?.tenant_id],
    queryFn: async () => {
      if (!employee) return 0;

      if (employee.isAdmin) {
        const { count, error } = await supabase
          .from('reimbursement_requests' as any)
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', employee.tenant_id)
          .eq('status', 'pending');
        if (error) throw error;
        return count || 0;
      }

      // Pure gerente: count pending from own requests + their projects
      const { data: memberships } = await supabase
        .from('project_members' as any)
        .select('project_id')
        .eq('employee_id', employee.id);
      const projectIds = ((memberships || []) as any[]).map((m: any) => m.project_id);

      const [ownRes, projectRes] = await Promise.all([
        supabase.from('reimbursement_requests' as any)
          .select('id', { count: 'exact', head: true })
          .eq('requested_by', employee.id).eq('status', 'pending'),
        projectIds.length > 0
          ? supabase.from('reimbursement_requests' as any)
              .select('id', { count: 'exact', head: true })
              .in('project_id', projectIds).eq('status', 'pending').neq('requested_by', employee.id)
          : { count: 0, error: null },
      ]);
      if (ownRes.error) throw ownRes.error;
      if ((projectRes as any).error) throw (projectRes as any).error;

      return (ownRes.count || 0) + ((projectRes as any).count || 0);
    },
    enabled: !!employee && (employee.is_gerente || employee.isAdmin),
    refetchInterval: 30000,
  });
}

export function useReimbursementAttachments(reimbursementId: string | null) {
  return useQuery({
    queryKey: ['reimbursement-attachments', reimbursementId],
    queryFn: async () => {
      if (!reimbursementId) return [];
      const { data, error } = await supabase
        .from('reimbursement_attachments' as any)
        .select('*')
        .eq('reimbursement_id', reimbursementId);
      if (error) throw error;
      return (data || []) as unknown as ReimbursementAttachment[];
    },
    enabled: !!reimbursementId,
  });
}

export function useReimbursementItems(reimbursementId: string | null) {
  return useQuery({
    queryKey: ['reimbursement-items', reimbursementId],
    queryFn: async () => {
      if (!reimbursementId) return [];
      const { data, error } = await supabase
        .from('reimbursement_items' as any)
        .select('*')
        .eq('reimbursement_id', reimbursementId)
        .order('expense_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ReimbursementItem[];
    },
    enabled: !!reimbursementId,
  });
}

export function useCreateReimbursement() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      project_id?: string;
      client_id?: string;
      is_internal: boolean;
      description: string;
      total_amount: number;
      files: File[];
      items?: { expense_date: string; description: string; amount: number }[];
      corrected_from_id?: string;
    }) => {
      if (!employee) throw new Error('Não autenticado');

      // Gerentes de projeto têm seus pedidos auto-aprovados (vão direto para pagamento)
      const isManager = employee.is_gerente;
      const now = new Date().toISOString();

      // 1. Create request
      const { data: request, error: reqError } = await supabase
        .from('reimbursement_requests' as any)
        .insert({
          tenant_id: employee.tenant_id,
          requested_by: employee.id,
          project_id: params.project_id || null,
          client_id: params.client_id || null,
          is_internal: params.is_internal,
          description: params.description,
          total_amount: params.total_amount,
          corrected_from_id: params.corrected_from_id || null,
          ...(isManager ? { status: 'approved', reviewed_by: employee.id, reviewed_at: now } : {}),
        } as any)
        .select()
        .single();
      if (reqError) throw reqError;

      const requestId = (request as any).id;

      // 2. Insert expense items
      if (params.items && params.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('reimbursement_items' as any)
          .insert(
            params.items.map(it => ({
              reimbursement_id: requestId,
              expense_date: it.expense_date,
              description: it.description,
              amount: it.amount,
            })) as any
          );
        if (itemsError) throw itemsError;
      }

      // 3. Upload files and create attachments
      for (const file of params.files) {
        const sanitizedName = file.name
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${employee.tenant_id}/${requestId}/${Date.now()}-${sanitizedName}`;
        const { error: uploadError } = await supabase.storage
          .from('reimbursement-receipts')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: attachError } = await supabase
          .from('reimbursement_attachments' as any)
          .insert({
            reimbursement_id: requestId,
            file_name: file.name,
            file_url: filePath,
            file_size: file.size,
          } as any);
        if (attachError) throw attachError;
      }

      // If manager submitted, notify admins directly (awaiting payment)
      if (isManager) {
        try {
          const { data: admins } = await supabase
            .from('user_roles' as any)
            .select('user_id')
            .eq('tenant_id', employee.tenant_id)
            .eq('role', 'admin');
          if (admins && (admins as any[]).length > 0) {
            const adminUserIds = (admins as any[]).map((a: any) => a.user_id);
            const { data: adminEmps } = await supabase
              .from('employees')
              .select('id, auth_id')
              .in('auth_id', adminUserIds);
            if (adminEmps && adminEmps.length > 0) {
              await supabase.from('notifications' as any).insert(
                adminEmps.map((emp: any) => ({
                  tenant_id: employee.tenant_id,
                  recipient_id: emp.id,
                  type: 'reimbursement_approved',
                  title: 'Reembolso aprovado aguardando pagamento',
                  message: 'Um reembolso de gerente foi enviado e aguarda confirmação de pagamento.',
                  reference_id: requestId,
                })) as any
              );
            }
          }
        } catch (e) {
          console.error('Error notifying admins of manager reimbursement:', e);
        }
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
      queryClient.invalidateQueries({ queryKey: ['all-my-reimbursements'] });
      toast.success(employee?.is_gerente
        ? 'Pedido de reembolso enviado e aprovado automaticamente!'
        : 'Pedido de reembolso enviado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar pedido: ' + error.message);
    },
  });
}

export function useApproveReimbursement() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (reimbursementId: string) => {
      if (!employee) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('reimbursement_requests' as any)
        .update({
          status: 'approved',
          reviewed_by: employee.id,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', reimbursementId);
      if (error) throw error;

      const { error: fnError } = await supabase.functions.invoke('send-reimbursement-email', {
        body: { reimbursement_id: reimbursementId },
      });
      if (fnError) {
        console.error('Error sending reimbursement email:', fnError);
      }

      // Notify the requester that their reimbursement was approved
      try {
        const { data: reimb } = await supabase
          .from('reimbursement_requests' as any)
          .select('requested_by')
          .eq('id', reimbursementId)
          .single();
        if (reimb) {
          await supabase.from('notifications' as any).insert({
            tenant_id: employee.tenant_id,
            recipient_id: (reimb as any).requested_by,
            type: 'reimbursement_approved',
            title: 'Reembolso aprovado',
            message: 'Seu pedido de reembolso foi aprovado e aguarda pagamento.',
            reference_id: reimbursementId,
          } as any);
        }
      } catch (e) {
        console.error('Error creating requester approval notification:', e);
      }

      // Notify all admins about approved reimbursement
      try {
        const { data: admins } = await supabase
          .from('user_roles' as any)
          .select('user_id')
          .eq('tenant_id', employee.tenant_id)
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          // Get admin employee IDs
          const adminUserIds = (admins as any[]).map((a: any) => a.user_id);
          const { data: adminEmps } = await supabase
            .from('employees')
            .select('id, auth_id')
            .in('auth_id', adminUserIds);

          if (adminEmps && adminEmps.length > 0) {
            const notifications = adminEmps.map((emp: any) => ({
              tenant_id: employee.tenant_id,
              recipient_id: emp.id,
              type: 'reimbursement_approved',
              title: 'Reembolso aprovado aguardando pagamento',
              message: `Um reembolso foi aprovado e aguarda confirmação de pagamento.`,
              reference_id: reimbursementId,
            }));

            await supabase.from('notifications' as any).insert(notifications as any);
          }
        }
      } catch (e) {
        console.error('Error creating admin notifications:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['all-my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Reembolso aprovado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao aprovar: ' + error.message);
    },
  });
}

export function useMarkReimbursementPaid() {
  const queryClient = useQueryClient();
  const { employee, user } = useAuth();

  return useMutation({
    mutationFn: async (reimbursementId: string) => {
      if (!employee || !user) throw new Error('Não autenticado');

      // Update reimbursement status
      const { error } = await supabase
        .from('reimbursement_requests' as any)
        .update({
          status: 'paid',
          paid_by: user.id,
          paid_at: new Date().toISOString(),
        } as any)
        .eq('id', reimbursementId);
      if (error) throw error;

      // Get the requester to notify them
      const { data: reimb } = await supabase
        .from('reimbursement_requests' as any)
        .select('requested_by')
        .eq('id', reimbursementId)
        .single();

      if (reimb) {
        await supabase.from('notifications' as any).insert({
          tenant_id: employee.tenant_id,
          recipient_id: (reimb as any).requested_by,
          type: 'reimbursement_paid',
          title: 'Reembolso pago',
          message: 'Seu pedido de reembolso foi pago!',
          reference_id: reimbursementId,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['all-my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['project-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Reembolso marcado como pago!');
    },
    onError: (error: any) => {
      toast.error('Erro ao marcar como pago: ' + error.message);
    },
  });
}

export function useProjectApprovedReimbursements(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-reimbursements', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('reimbursement_requests' as any)
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['approved', 'paid'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      const requests = (data || []) as unknown as ReimbursementRequest[];
      if (requests.length === 0) return requests;

      const requesterIds = [...new Set(requests.map(r => r.requested_by))];
      const reviewerIds = [...new Set(requests.filter(r => r.reviewed_by).map(r => r.reviewed_by!))];
      const allIds = [...new Set([...requesterIds, ...reviewerIds])];

      const { data: emps } = await supabase
        .from('employees')
        .select('id, nome')
        .in('id', allIds);
      const nameMap = new Map((emps || []).map(e => [e.id, e.nome]));

      return requests.map(r => ({
        ...r,
        requester_name: nameMap.get(r.requested_by) || 'Desconhecido',
        reviewer_name: r.reviewed_by ? nameMap.get(r.reviewed_by) || 'Desconhecido' : undefined,
      }));
    },
    enabled: !!projectId,
  });
}

export function useAllMyReimbursements() {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['all-my-reimbursements', employee?.id, employee?.tenant_id],
    queryFn: async () => {
      if (!employee) return [];

      let requests: ReimbursementRequest[] = [];

      if (employee.isAdmin) {
        // Admin sees everything in tenant
        const { data, error } = await supabase
          .from('reimbursement_requests' as any)
          .select('*')
          .eq('tenant_id', employee.tenant_id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        requests = (data || []) as unknown as ReimbursementRequest[];
      } else if (employee.is_gerente) {
        // Pure gerente: own requests + requests from their projects
        const { data: memberships } = await supabase
          .from('project_members' as any)
          .select('project_id')
          .eq('employee_id', employee.id);
        const projectIds = ((memberships || []) as any[]).map((m: any) => m.project_id);

        const [ownRes, projectRes] = await Promise.all([
          supabase.from('reimbursement_requests' as any).select('*')
            .eq('requested_by', employee.id).order('created_at', { ascending: false }),
          projectIds.length > 0
            ? supabase.from('reimbursement_requests' as any).select('*')
                .in('project_id', projectIds).order('created_at', { ascending: false })
            : { data: [], error: null },
        ]);
        if (ownRes.error) throw ownRes.error;
        if ((projectRes as any).error) throw (projectRes as any).error;

        const seen = new Set<string>();
        const merged: ReimbursementRequest[] = [];
        for (const r of [...((ownRes.data || []) as any[]), ...((projectRes as any).data || []) as any[]]) {
          if (!seen.has(r.id)) { seen.add(r.id); merged.push(r as unknown as ReimbursementRequest); }
        }
        requests = merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        // Regular employee: own requests only
        const { data, error } = await supabase
          .from('reimbursement_requests' as any)
          .select('*')
          .eq('requested_by', employee.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        requests = (data || []) as unknown as ReimbursementRequest[];
      }

      if (requests.length === 0) return requests;

      const employeeIds = [...new Set([
        ...requests.map(r => r.requested_by),
        ...requests.filter(r => r.reviewed_by).map(r => r.reviewed_by!),
      ])];

      // Get paid_by user IDs to resolve names
      const paidByUserIds = [...new Set(requests.filter(r => (r as any).paid_by).map(r => (r as any).paid_by as string))];
      
      const projectIds = [...new Set(requests.filter(r => r.project_id).map(r => r.project_id!))];
      const clientIds = [...new Set(requests.filter(r => r.client_id).map(r => r.client_id!))];

      // Also fetch items to get earliest expense_date
      const requestIds = requests.map(r => r.id);
      const [empRes, projRes, clientRes, tenantRes, itemsRes, paidByEmpRes] = await Promise.all([
        supabase.from('employees').select('id, nome').in('id', employeeIds),
        projectIds.length > 0 ? supabase.from('projects').select('id, name').in('id', projectIds) : { data: [] },
        clientIds.length > 0 ? supabase.from('clients').select('id, company_name').in('id', clientIds) : { data: [] },
        supabase.from('tenants' as any).select('id, name').eq('id', employee.tenant_id).maybeSingle(),
        supabase.from('reimbursement_items' as any).select('reimbursement_id, expense_date').in('reimbursement_id', requestIds).order('expense_date', { ascending: true }),
        paidByUserIds.length > 0 ? supabase.from('employees').select('id, nome, auth_id').in('auth_id', paidByUserIds) : { data: [] },
      ]);

      const empMap = new Map<string, string>((empRes.data || []).map(e => [e.id, e.nome]));
      const projMap = new Map<string, string>(((projRes as any).data || []).map((p: any) => [p.id, p.name as string]));
      const clientMap = new Map<string, string>(((clientRes as any).data || []).map((c: any) => [c.id, c.company_name as string]));
      const tenantName = (tenantRes as any)?.data?.name || '';
      const paidByMap = new Map<string, string>(((paidByEmpRes as any).data || []).map((e: any) => [e.auth_id, e.nome]));

      // Build map of earliest expense_date per reimbursement
      const expenseDateMap = new Map<string, string>();
      for (const item of ((itemsRes as any).data || []) as any[]) {
        if (!expenseDateMap.has(item.reimbursement_id)) {
          expenseDateMap.set(item.reimbursement_id, item.expense_date);
        }
      }

      return requests.map(r => ({
        ...r,
        requester_name: empMap.get(r.requested_by) || 'Desconhecido',
        reviewer_name: r.reviewed_by ? empMap.get(r.reviewed_by) || 'Desconhecido' : undefined,
        project_name: r.project_id ? projMap.get(r.project_id) || '' : '',
        client_name: r.client_id ? clientMap.get(r.client_id) || '' : '',
        tenant_name: tenantName,
        earliest_expense_date: expenseDateMap.get(r.id) || null,
        paid_by_name: (r as any).paid_by ? paidByMap.get((r as any).paid_by) || '-' : undefined,
      }));
    },
    enabled: !!employee,
  });
}

export function useDeleteReimbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { reimbursementId: string; reason: string }) => {
      const { error } = await supabase
        .from('reimbursement_requests' as any)
        .delete()
        .eq('id', params.reimbursementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
      queryClient.invalidateQueries({ queryKey: ['all-my-reimbursements'] });
      toast.success('Reembolso excluído com sucesso.');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir reembolso: ' + error.message);
    },
  });
}

export function useRejectReimbursement() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (params: { reimbursementId: string; reason: string }) => {
      if (!employee) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('reimbursement_requests' as any)
        .update({
          status: 'rejected',
          reviewed_by: employee.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: params.reason,
        } as any)
        .eq('id', params.reimbursementId);
      if (error) throw error;

      // Notify the requester of rejection
      try {
        const { data: reimb } = await supabase
          .from('reimbursement_requests' as any)
          .select('requested_by')
          .eq('id', params.reimbursementId)
          .single();
        if (reimb) {
          await supabase.from('notifications' as any).insert({
            tenant_id: employee.tenant_id,
            recipient_id: (reimb as any).requested_by,
            type: 'reimbursement_rejected',
            title: 'Reembolso rejeitado',
            message: 'Seu pedido de reembolso foi rejeitado. Acesse os detalhes para ver o motivo.',
            reference_id: params.reimbursementId,
          } as any);
        }
      } catch (e) {
        console.error('Error creating rejection notification:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['all-my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Reembolso rejeitado.');
    },
    onError: (error: any) => {
      toast.error('Erro ao rejeitar: ' + error.message);
    },
  });
}
