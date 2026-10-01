import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHolidays } from '@/hooks/useHolidays';
import { buildAudit } from '@/lib/auditoriaHoras';
import { fetchAuditInputs } from '@/services/auditoriaHorasService';

/** Auditoria das horas de uma pessoa no mês ('yyyy-MM'). Recalcula sozinha depois de uma correção. */
export function useAuditoriaHoras(employeeId: string | undefined, monthKey: string | undefined, enabled: boolean) {
  const { data: holidays = [] } = useHolidays();
  const query = useQuery({
    queryKey: ['auditoria-horas', employeeId, monthKey],
    queryFn: () => fetchAuditInputs(employeeId as string, monthKey as string),
    enabled: enabled && Boolean(employeeId && monthKey),
  });
  const audit = useMemo(
    () => (query.data && monthKey ? buildAudit(query.data, monthKey, holidays, new Date()) : null),
    [query.data, monthKey, holidays],
  );
  return { ...query, audit };
}
