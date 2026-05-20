import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssignableMember {
  employee_id: string;
  nome: string;
  cargo: string | null;
  foto_url: string | null;
}

// Lists everyone who can be set as assignee on a project's activity board:
// project_members (with employee_id set) ∪ projects.manager_id.
// Reads via SECURITY DEFINER RPC to bypass employees RLS quirks that were
// hiding co-members from the dropdown.
export function useProjectAssignableMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-assignable-members', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<AssignableMember[]> => {
      const { data, error } = await (supabase as any).rpc('get_project_assignable_members', {
        p_project_id: projectId,
      });
      if (error) throw error;
      return (data ?? []) as AssignableMember[];
    },
  });
}
