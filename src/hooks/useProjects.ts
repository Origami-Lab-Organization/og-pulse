import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  CreateProjectInput,
  CreateProjectMemberInput,
  CreateInstallmentInput,
  UpdateInstallmentInput,
} from '@/types/project';

export const useProjects = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const employeeId = employee?.id;

  return useQuery({
    queryKey: ['projects', tenantId, isAdmin, employeeId],
    queryFn: () => projectService.getAll(tenantId!, {
      isAdmin,
      managerId: isAdmin ? undefined : employeeId,
    }),
    enabled: !!tenantId,
  });
};

export const useProject = (id: string | undefined) => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getById(id!, tenantId),
    enabled: !!id && !!tenantId,
  });
};

export const useSearchProjects = (query: string) => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['projects', 'search', query, tenantId],
    queryFn: () => projectService.search(query, tenantId!),
    enabled: !!tenantId && query.length > 0,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!tenantId) throw new Error('Tenant ID not found');
      return projectService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Projeto criado',
        description: 'O projeto foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { employee, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      justification,
    }: {
      id: string;
      updates: Partial<CreateProjectInput>;
      justification?: string;
    }) => {
      const result = await projectService.update(id, updates);

      // If justification is provided, insert audit log
      if (justification && user?.id) {
        await supabase.from('project_edit_logs').insert({
          project_id: id,
          edited_by: user.id,
          justification,
          changes_summary: `Projeto editado por ${employee?.nome || 'Admin'}`,
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
      toast({
        title: 'Projeto atualizado',
        description: 'O projeto foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, withCascade }: { id: string; name: string; withCascade?: boolean }) => {
      if (withCascade) {
        await projectService.deleteWithCascade(id);
      } else {
        await projectService.delete(id);
      }
      return { name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Projeto excluído',
        description: `O projeto "${data.name}" foi excluído com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useArchiveProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason, notes }: { id: string; reason: string; notes: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      await projectService.archive(id, { reason, notes, cancelledBy: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast({
        title: 'Projeto arquivado',
        description: 'O projeto foi cancelado e arquivado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao arquivar projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Project Members hooks
export const useProjectMembers = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectService.getMembers(projectId!),
    enabled: !!projectId,
  });
};

export const useAddProjectMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateProjectMemberInput) => {
      return projectService.addMember(input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({
        title: 'Membro adicionado',
        description: 'O membro foi adicionado ao projeto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar membro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateProjectMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: { role?: string; seniority?: string; hours_per_month?: number; hourly_rate?: number; employee_id?: string | null };
    }) => {
      return projectService.updateMember(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({
        title: 'Membro atualizado',
        description: 'Os dados do membro foram atualizados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar membro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Assign/unassign employee to a role
export const useAssignMemberEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      memberId,
      projectId,
      employeeId,
    }: {
      memberId: string;
      projectId: string;
      employeeId: string | null;
    }) => {
      return projectService.updateMember(memberId, { employee_id: employeeId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar funcionário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await projectService.removeMember(id);
      return { id, projectId };
    },
    // Optimistic update - remove immediately from UI
    onMutate: async ({ id, projectId }) => {
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });
      await queryClient.cancelQueries({ queryKey: ['project-members', projectId] });

      const previousProject = queryClient.getQueryData(['project', projectId]);
      const previousMembers = queryClient.getQueryData(['project-members', projectId]);

      // Update project cache
      queryClient.setQueryData(['project', projectId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members?.filter((m: any) => m.id !== id) || [],
        };
      });

      // Update members cache
      queryClient.setQueryData(['project-members', projectId], (old: any) => {
        if (!old) return old;
        return Array.isArray(old) ? old.filter((m: any) => m.id !== id) : old;
      });

      return { previousProject, previousMembers, projectId };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(['project', context.projectId], context.previousProject);
      }
      if (context?.previousMembers) {
        queryClient.setQueryData(['project-members', context.projectId], context.previousMembers);
      }
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (data) => {
      if (data?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['project-members', data.projectId] });
        queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      }
    },
  });
};

// Project Installments hooks
export const useProjectInstallments = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-installments', projectId],
    queryFn: () => projectService.getInstallments(projectId!),
    enabled: !!projectId,
  });
};

export const useUpdateInstallment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: UpdateInstallmentInput;
    }) => {
      return projectService.updateInstallment(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-installments', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({
        title: 'Parcela atualizada',
        description: 'Os dados da parcela foram atualizados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar parcela',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useCreateInstallment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateInstallmentInput) => {
      return projectService.createInstallment(input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-installments', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({
        title: 'Parcela criada',
        description: 'A nova parcela foi cadastrada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar parcela',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteInstallment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await projectService.deleteInstallment(id);
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-installments', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      toast({
        title: 'Parcela excluída',
        description: 'A parcela foi excluída com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir parcela',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
