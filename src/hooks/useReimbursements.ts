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
  created_at: string;
  updated_at: string;
  // joined
  requester_name?: string;
  project_name?: string;
  client_name?: string;
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
    queryKey: ['pending-reimbursements', employee?.tenant_id],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await supabase
        .from('reimbursement_requests' as any)
        .select('*')
        .eq('tenant_id', employee.tenant_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with names
      const requests = (data || []) as unknown as ReimbursementRequest[];
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
    queryKey: ['pending-reimbursements-count', employee?.tenant_id],
    queryFn: async () => {
      if (!employee) return 0;
      const { count, error } = await supabase
        .from('reimbursement_requests' as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', employee.tenant_id)
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
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
    }) => {
      if (!employee) throw new Error('Não autenticado');

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
        } as any)
        .select()
        .single();
      if (reqError) throw reqError;

      const requestId = (request as any).id;

      // 2. Upload files and create attachments
      for (const file of params.files) {
        // Sanitize filename: remove accents, replace spaces/special chars
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

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
      toast.success('Pedido de reembolso enviado com sucesso!');
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

      // Call edge function to send email
      const { error: fnError } = await supabase.functions.invoke('send-reimbursement-email', {
        body: { reimbursement_id: reimbursementId },
      });
      if (fnError) {
        console.error('Error sending reimbursement email:', fnError);
        // Don't throw - approval succeeded even if email fails
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      toast.success('Reembolso aprovado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao aprovar: ' + error.message);
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
        .eq('status', 'approved')
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements'] });
      toast.success('Reembolso rejeitado.');
    },
    onError: (error: any) => {
      toast.error('Erro ao rejeitar: ' + error.message);
    },
  });
}
