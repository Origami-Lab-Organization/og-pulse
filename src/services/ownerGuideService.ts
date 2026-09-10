import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { OwnerGuideCounts } from '@/types/ownerGuide';

/**
 * Os números que o guia do dono usa para saber o que já está montado (PUL-250).
 *
 * Seis contagens, nenhuma linha trazida: `head: true` faz o PostgREST responder só o total.
 * Roda a cada carga do app para quem ainda tem passo pendente, então trazer linha seria
 * pagar caro por um número.
 *
 * As consultas passam por `db` pelo mesmo motivo de `costCenterCostService.ts`: o cliente
 * gerado sobre 118 tabelas estoura o limite de inferência do TypeScript (TS2589) quando
 * várias consultas dividem o escopo. `db` é o MESMO cliente, só sem o genérico do schema.
 * O custo consciente: aqui o compilador não confere nome de coluna ou de tabela.
 */

const db = supabase as unknown as SupabaseClient;

/** Status que não contam como time: quem saiu ou está saindo. */
const INACTIVE_EMPLOYEE_STATUS = '(arquivado,desligado,em_desligamento)';

interface CountResult {
  count: number | null;
  error: { message: string } | null;
}

/**
 * Devolve a contagem, e ESTOURA se a consulta falhou.
 *
 * Cair para zero em silêncio seria pior que falhar: o guia concluiria que nada está
 * cadastrado e mandaria o dono refazer o que já fez. Um erro visível é honesto.
 */
function countOf(label: string) {
  return (result: CountResult): number => {
    // harness-ok: front React sem HttpException; falha de leitura do PostgREST sobe crua para
    // o TanStack Query, que a mostra no estado de erro. Padrao do repo (ver src/hooks/*.ts).
    if (result.error) throw new Error(`Não foi possível contar ${label}: ${result.error.message}`);
    return result.count ?? 0;
  };
}

/**
 * `project_members` e `project_timesheets` não têm `tenant_id` — isolam pelo projeto e pela
 * RLS. Filtrar por uma coluna que não existe faria a consulta falhar; a lição custou um
 * defeito em produção na tela de custo por centro (PUL-245).
 */
export async function fetchOwnerGuideCounts(tenantId: string): Promise<OwnerGuideCounts> {
  const employeesP = db
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('status', 'in', INACTIVE_EMPLOYEE_STATUS)
    .then(countOf('as pessoas'));
  const clientsP = db
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .then(countOf('os clientes'));
  const servicesP = db
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .then(countOf('os serviços'));
  const projectsP = db
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .then(countOf('os projetos'));
  const membersP = db
    .from('project_members')
    .select('id', { count: 'exact', head: true })
    .then(countOf('o time dos projetos'));
  const hoursP = db
    .from('project_timesheets')
    .select('id', { count: 'exact', head: true })
    .then(countOf('as horas lançadas'));

  return {
    employees: await employeesP,
    clients: await clientsP,
    services: await servicesP,
    projects: await projectsP,
    projectMembers: await membersP,
    hours: await hoursP,
  };
}
