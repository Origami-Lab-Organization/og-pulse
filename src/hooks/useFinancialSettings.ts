import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialSettingsService } from '@/services/financialSettingsService';
import { FinancialSettingsFormData } from '@/types/financialSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useFinancialSettings() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['financial-settings', tenantId],
    queryFn: () => {
      if (!tenantId) throw new Error('No tenant ID');
      return financialSettingsService.getSettings(tenantId);
    },
    enabled: !!tenantId,
  });
}

export function useUpsertFinancialSettings() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: (formData: FinancialSettingsFormData) => {
      if (!tenantId) throw new Error('No tenant ID');
      return financialSettingsService.upsertSettings(tenantId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-settings', tenantId] });
      toast({
        title: 'Sucesso',
        description: 'Configurações financeiras salvas com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error saving financial settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações financeiras.',
        variant: 'destructive',
      });
    },
  });
}
