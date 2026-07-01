import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from './useNotifications';

export type InboxFolder =
  | 'all'
  | 'unread'
  | 'timesheet'
  | 'budget'
  | 'candidates'
  | 'projeto'
  | 'documentos'
  | 'archived'
  | 'lixeira';

export interface InboxCounts {
  all: number;
  unread: number;
  timesheet: number;
  budget: number;
  candidates: number;
  projeto: number;
  documentos: number;
  archived: number;
  lixeira: number;
}

export const EMPTY_INBOX_COUNTS: InboxCounts = {
  all: 0,
  unread: 0,
  timesheet: 0,
  budget: 0,
  candidates: 0,
  projeto: 0,
  documentos: 0,
  archived: 0,
  lixeira: 0,
};

function invalidateAll(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['inbox-notifications'] });
  queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
}

export function useInboxNotifications(folder: InboxFolder = 'all') {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['inbox-notifications', employee?.id, folder],
    queryFn: async () => {
      if (!employee) return [];
      let query = (supabase as any)
        .from('notifications')
        .select('*')
        .eq('recipient_id', employee.id);

      if (folder === 'lixeira') {
        // Lixeira: somente as soft-deletadas.
        query = query.not('deleted_at', 'is', null);
      } else {
        // Demais pastas: nunca mostram itens na Lixeira.
        query = query.is('deleted_at', null);
        if (folder === 'archived') {
          query = query.eq('is_archived', true);
        } else {
          query = query.neq('is_archived', true);
          if (folder === 'unread') query = query.eq('is_read', false);
          if (folder === 'timesheet') query = query.eq('category', 'timesheet');
          if (folder === 'candidates') query = query.eq('category', 'candidatos');
          if (folder === 'budget') query = query.eq('category', 'budget');
          if (folder === 'projeto') query = query.eq('category', 'projeto');
          if (folder === 'documentos') query = query.eq('category', 'documento');
        }
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!employee,
    refetchInterval: 30000,
  });
}

export function useInboxCounts() {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['inbox-counts', employee?.id],
    queryFn: async (): Promise<InboxCounts> => {
      if (!employee) return EMPTY_INBOX_COUNTS;

      // Contagem de NÃO LIDAS por categoria, ignorando arquivadas e Lixeira.
      const unreadActive = () =>
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_read', false)
          .eq('is_archived', false)
          .is('deleted_at', null);

      const [
        totalRes,
        timesheetRes,
        budgetRes,
        candidatesRes,
        projetoRes,
        documentosRes,
        archivedRes,
        lixeiraRes,
      ] = await Promise.all([
        unreadActive(),
        unreadActive().eq('category', 'timesheet'),
        unreadActive().eq('category', 'budget'),
        unreadActive().eq('category', 'candidatos'),
        unreadActive().eq('category', 'projeto'),
        unreadActive().eq('category', 'documento'),
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_archived', true)
          .is('deleted_at', null),
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .not('deleted_at', 'is', null),
      ]);

      return {
        all: totalRes.count || 0,
        unread: totalRes.count || 0,
        timesheet: timesheetRes.count || 0,
        budget: budgetRes.count || 0,
        candidates: candidatesRes.count || 0,
        projeto: projetoRes.count || 0,
        documentos: documentosRes.count || 0,
        archived: archivedRes.count || 0,
        lixeira: lixeiraRes.count || 0,
      };
    },
    enabled: !!employee,
    refetchInterval: 30000,
  });
}

export function useMarkAllInboxRead() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!employee) return;
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', employee.id)
        .eq('is_read', false)
        .is('deleted_at', null);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useResolveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_resolved: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUnarchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_archived: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useArchiveMultipleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_archived: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

// "Excluir" = soft delete (move para a Lixeira). A RLS de notifications não
// permite DELETE físico, e isto preserva o histórico para restauração.
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteMultipleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

// Restaura da Lixeira (limpa deleted_at).
export function useRestoreNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRestoreMultipleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ deleted_at: null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useMarkMultipleNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useMarkMultipleNotificationsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: false, read_at: null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
