import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollProfileService } from '@/services/payrollProfileService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CreatePayrollProfileInput, DEFAULT_PAYROLL_PROFILE, PayrollProfile } from '@/types/payrollProfile';

export const usePayrollProfile = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['payroll-profile', tenantId],
    queryFn: async (): Promise<PayrollProfile> => {
      if (!tenantId) throw new Error('No tenant');
      
      const profile = await payrollProfileService.getByTenantId(tenantId);
      
      // Return existing profile or default values
      if (profile) {
        return profile;
      }
      
      // Return default profile structure (not persisted yet)
      return {
        id: '',
        tenantId,
        ...DEFAULT_PAYROLL_PROFILE,
        createdAt: '',
        updatedAt: '',
      };
    },
    enabled: !!tenantId,
  });
};

export const useUpsertPayrollProfile = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: Partial<Omit<CreatePayrollProfileInput, 'tenantId'>>) => {
      if (!tenantId) throw new Error('No tenant');
      
      return payrollProfileService.upsert({
        tenantId,
        ...input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-profile', tenantId] });
      toast({
        title: 'Configurações salvas',
        description: 'O perfil de encargos foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
