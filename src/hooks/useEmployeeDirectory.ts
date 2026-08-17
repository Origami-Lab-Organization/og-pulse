import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  EMPLOYEE_DIRECTORY_QUERY_KEY,
  EMPLOYEE_DIRECTORY_STALE_TIME,
  fetchEmployeeDirectory,
} from '@/services/employeeDirectoryService';

/**
 * Identidade dos colegas do tenant (nome, cargo, foto, e-mail) via RPC
 * `get_employee_directory`, que tem projeção fixa e não devolve remuneração,
 * custo nem dado pessoal sensível (PUL-162).
 *
 * É a fonte de identidade de TERCEIROS para telas de funcionário comum: a policy
 * de co-membro em `employees` foi removida porque concedia a linha inteira, então
 * `employees(...)` aninhado não retorna colegas para quem não é admin/gerente.
 */
export function useEmployeeDirectory(enabled = true) {
  return useQuery({
    queryKey: EMPLOYEE_DIRECTORY_QUERY_KEY,
    enabled,
    staleTime: EMPLOYEE_DIRECTORY_STALE_TIME,
    queryFn: fetchEmployeeDirectory,
  });
}

/** Mesmo diretório indexado por id, para resolver nome/foto de um employee_id. */
export function useEmployeeDirectoryMap(enabled = true) {
  const query = useEmployeeDirectory(enabled);
  const byId = useMemo(
    () => new Map((query.data ?? []).map((entry) => [entry.id, entry])),
    [query.data],
  );
  return { ...query, byId };
}
