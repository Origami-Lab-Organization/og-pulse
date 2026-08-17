import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EmployeeDirectoryEntry } from '@/types/employeeDirectory';

export const EMPLOYEE_DIRECTORY_QUERY_KEY = ['employee-directory'] as const;
export const EMPLOYEE_DIRECTORY_STALE_TIME = 10 * 60 * 1000;

export async function fetchEmployeeDirectory(): Promise<EmployeeDirectoryEntry[]> {
  const { data, error } = await supabase.rpc('get_employee_directory');
  if (error) throw error;
  return data ?? [];
}

/**
 * Diretório indexado por id, compartilhando o cache do `useEmployeeDirectory`.
 * Usado de dentro de `queryFn` para resolver nome/cargo/foto de terceiros: a
 * policy de co-membro em `employees` foi removida (PUL-162), então selects
 * aninhados `employees(...)` não retornam colegas para quem não é admin/gerente.
 */
export async function getEmployeeDirectoryMap(
  queryClient: QueryClient,
): Promise<Map<string, EmployeeDirectoryEntry>> {
  const entries = await queryClient.fetchQuery({
    queryKey: EMPLOYEE_DIRECTORY_QUERY_KEY,
    queryFn: fetchEmployeeDirectory,
    staleTime: EMPLOYEE_DIRECTORY_STALE_TIME,
  });
  return new Map(entries.map((entry) => [entry.id, entry]));
}

/** Diretório indexado por id, sem cache — para uso em services (fora de hooks). */
export async function fetchEmployeeDirectoryMap(): Promise<Map<string, EmployeeDirectoryEntry>> {
  const entries = await fetchEmployeeDirectory();
  return new Map(entries.map((entry) => [entry.id, entry]));
}

/**
 * Preenche a identidade de linhas que embutem `employee`/`manager` quando o
 * embed veio vazio por RLS (funcionário comum não lê employees de terceiros
 * desde PUL-162). Campos já presentes no embed — inclusive financeiros, que só
 * admin/gerente recebe — são preservados como vieram.
 */
export function withDirectoryIdentity<T>(
  rows: T[],
  directory: Map<string, EmployeeDirectoryEntry>,
  options: { idField: string; embedField: string },
): T[] {
  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    if (record[options.embedField]) return row;
    const employeeId = record[options.idField];
    if (typeof employeeId !== 'string') return row;
    const entry = directory.get(employeeId);
    if (!entry) return row;
    return {
      ...record,
      [options.embedField]: {
        id: entry.id,
        nome: entry.nome,
        cargo: entry.cargo,
        foto_url: entry.foto_url,
        email: entry.email,
      },
    } as T;
  });
}
