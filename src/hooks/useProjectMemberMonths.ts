import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectMemberMonthDB } from '@/types/project';

export const useProjectMemberMonths = (projectMemberIds: string[]) => {
  return useQuery({
    queryKey: ['project-member-months', projectMemberIds],
    queryFn: async () => {
      if (projectMemberIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('project_member_months')
        .select('*')
        .in('project_member_id', projectMemberIds)
        .order('month_number', { ascending: true });

      if (error) throw error;
      return data as ProjectMemberMonthDB[];
    },
    enabled: projectMemberIds.length > 0,
  });
};

export const useUpsertMemberMonth = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      projectMemberId,
      monthNumber,
      hours,
    }: {
      projectMemberId: string;
      monthNumber: number;
      hours: number;
    }) => {
      const { data, error } = await supabase
        .from('project_member_months')
        .upsert(
          {
            project_member_id: projectMemberId,
            month_number: monthNumber,
            hours,
          },
          { onConflict: 'project_member_id,month_number' }
        )
        .select()
        .single();

      if (error) throw error;
      
      const { data: member, error: memberError } = await supabase
        .from('project_members')
        .select('employee_id')
        .eq('id', projectMemberId)
        .single();

      if (memberError) throw memberError;

      if (member?.employee_id) {
        const { error: recalcError } = await (supabase as any).rpc('recalculate_employee_cost_snapshots', {
          p_employee_id: member.employee_id,
        });

        if (recalcError) throw recalcError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-member-months'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['allocation-employee-month-summary'] });
      queryClient.invalidateQueries({ queryKey: ['allocation-employee-detail'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar horas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteMemberMonths = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectMemberId: string) => {
      const { error } = await supabase
        .from('project_member_months')
        .delete()
        .eq('project_member_id', projectMemberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-member-months'] });
    },
  });
};
