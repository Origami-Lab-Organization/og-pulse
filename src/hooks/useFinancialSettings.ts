import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialSettingsService } from '@/services/financialSettingsService';
import { FinancialSettingsFormData } from '@/types/financialSettings';
import { versaoVigenteEm } from '@/lib/financialSettingsVigencia';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { todayLocalDateString } from '@/lib/formatters';

const CHAVE = 'financial-settings';

/**
 * Todas as versões da configuração financeira do tenant (PUL-260).
 *
 * É a consulta base: quem precisa de uma data resolve com `versaoVigenteEm`, e quem precisa
 * de várias datas — a evolução mensal — resolve as doze com esta mesma lista.
 */
export function useFinancialSettingsVersions() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: [CHAVE, 'versions', tenantId],
    queryFn: () => {
      if (!tenantId) throw new Error('No tenant ID');
      return financialSettingsService.listVersions(tenantId);
    },
    enabled: !!tenantId,
  });
}

/** O histórico da tela de configuração: vigência, valores, autor e data/hora. */
export function useFinancialSettingsHistory() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: [CHAVE, 'history', tenantId],
    queryFn: () => {
      if (!tenantId) throw new Error('No tenant ID');
      return financialSettingsService.listVersionsWithAuthor(tenantId);
    },
    enabled: !!tenantId,
  });
}

/**
 * A configuração que valia numa data. Sem data, a de hoje.
 *
 * Substitui o antigo `useFinancialSettings()`, que lia "a linha do tenant" — leitura que
 * deixou de existir quando a configuração passou a ter vigência.
 */
export function useFinancialSettings(referenceDate?: string) {
  const versions = useFinancialSettingsVersions();
  const data = referenceDate ?? todayLocalDateString();

  return {
    ...versions,
    data: versions.data ? versaoVigenteEm(versions.data, data) : undefined,
  };
}

export function useSaveFinancialSettings() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: (formData: FinancialSettingsFormData) => {
      if (!tenantId) throw new Error('No tenant ID');
      return financialSettingsService.saveVersion(tenantId, formData, employee?.id ?? null);
    },
    onSuccess: (versao) => {
      queryClient.invalidateQueries({ queryKey: [CHAVE] });
      // As telas de projeto e as análises leem a meta de margem por data; sem isto elas
      // continuariam mostrando o número da versão anterior até o cache expirar.
      for (const chave of ['project-financials', 'project-health', 'financial-evolution', 'analytics']) {
        queryClient.invalidateQueries({ queryKey: [chave] });
      }
      toast({
        title: 'Configuração salva',
        description: `Vale a partir de ${formatarVigencia(versao.effective_from)}.`,
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

function formatarVigencia(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}/${ano}`;
}
