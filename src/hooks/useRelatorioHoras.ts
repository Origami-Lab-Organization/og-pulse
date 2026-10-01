import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { relatorioHorasService } from '@/services/relatorioHorasService';

export function useProjectPersonHours(from: string, to: string) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['relatorio-horas-projeto-pessoa', tenantId, from, to],
    queryFn: () => relatorioHorasService.getProjectPersonHours(tenantId as string, from, to),
    enabled: Boolean(tenantId) && from <= to,
  });
}
