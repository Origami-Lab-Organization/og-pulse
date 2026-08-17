/**
 * Identidade de um colega do tenant, servida pela RPC `get_employee_directory`.
 * Projeção fixa e deliberadamente pobre: nunca carrega remuneração, custo ou
 * dado pessoal sensível (PUL-162 / ADR-0020).
 */
export interface EmployeeDirectoryEntry {
  id: string;
  nome: string;
  cargo: string | null;
  foto_url: string | null;
  email: string | null;
  status: string | null;
}
