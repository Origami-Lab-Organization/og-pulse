import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  CreateProjectInput,
  CreateProjectMemberInput,
  UpdateInstallmentInput,
} from '@/types/project';

export const useProjects = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['projects', tenantId],
    queryFn: () => projectService.getAll(tenantId!),
    enabled: !!tenantId,
  });
};

export const useProject = (id: string | undefined) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getById(id!),
    enabled: !!id,
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateProjectInput>;
    }) => {
      return projectService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
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
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await projectService.delete(id);
      return { name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
      updates: { role?: string; seniority?: string; hours_per_month?: number };
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

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await projectService.removeMember(id);
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido do projeto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
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
