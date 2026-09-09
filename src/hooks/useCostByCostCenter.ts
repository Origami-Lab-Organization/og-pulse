import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCostInputs, type CostInputs } from '@/services/costCenterCostService';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import type { Holiday } from '@/lib/workingDays';
import type { AnalyticsFilters } from '@/hooks/useAnalyticsData';
import type { CostByCostCenterData, CostCenterCostRow, CostCenterDetailRow } from '@/types/costCenter';
import { CostOrigin } from '@/types/costCenter';

/**
 * Custo por centro de custo no período, com a composição de cada centro (PUL-215, ADR-0031).
 *
 * De onde vem o centro de cada hora:
 *  - **atividade interna**: `activity_timesheets.cost_center_id`, gravado no lançamento pelo
 *    trigger a partir do item. É o centro do MOMENTO, então trocar o item de centro depois
 *    não reescreve o passado;
 *  - **projeto de cliente**: `projects.service_line` guarda o `service_id` (o nome da coluna
 *    mente, ver ADR-0031) e o serviço aponta para o centro. Derivado em leitura porque a
 *    hora de projeto ainda não persiste centro — é a pergunta P4 de PUL-216.
 *
 * Custo da hora: `project_timesheets.cost_per_hour` quando existe (snapshot gravado no
 * lançamento); senão, o custo hora da pessoa no mês (`getFallbackHourlyCost`), mesma regra
 * de `useProjectHealthData`.
 *
 * Só o período filtra. Cliente, gerente e projeto não entram: custo interno não pertence a
 * um projeto, e aplicar esses filtros daria um total que não fecha com o da empresa.
 *
 * Três níveis: o centro, as origens dentro dele (projeto de cliente ou atividade interna) e
 * quem apontou cada uma. A fatia de cada nível é sempre relativa ao nível de cima.
 *
 * A busca crua fica em `costCenterCostService.ts`; aqui só a agregação.
 */

const NO_CENTER = '__sem_centro__';
const NO_PERSON = '__sem_pessoa__';
const UNKNOWN_PERSON = 'Pessoa não identificada';

interface EmployeeCost {
  totalMonthlyCost: number;
  jornadaDiaria: number;
  dataAdmissao: string | null;
}

interface PersonAcc {
  id: string;
  name: string;
  hours: number;
  cost: number;
}

/** Origem de custo em acumulação; vira `CostCenterDetailRow` com as fatias no fim. */
interface DetailAcc {
  origin: CostOrigin;
  id: string;
  name: string;
  hours: number;
  cost: number;
  people: Map<string, PersonAcc>;
}

interface Bucket {
  projectHours: number;
  projectCost: number;
  internalHours: number;
  internalCost: number;
  details: Map<string, DetailAcc>;
}

/** Uma hora apontada, já valorizada, pronta para entrar nos acumuladores. */
interface Entry {
  origin: CostOrigin;
  id: string;
  name: string;
  hours: number;
  cost: number;
  personId: string;
  personName: string;
}

function emptyBucket(): Bucket {
  return { projectHours: 0, projectCost: 0, internalHours: 0, internalCost: 0, details: new Map() };
}

function hourlyCostOf(employee: EmployeeCost | undefined, workDate: string, holidays: Holiday[]): number {
  if (!employee) return 0;
  const date = new Date(`${workDate}T00:00:00`);
  return getFallbackHourlyCost(
    employee.totalMonthlyCost,
    employee.jornadaDiaria,
    date.getFullYear(),
    date.getMonth(),
    holidays,
    employee.dataAdmissao,
  );
}

/** Nome de quem apontou; sem pessoa resolvida, a hora fica visível como não identificada. */
function personOf(id: string | null | undefined, names: Map<string, string>): Pick<Entry, 'personId' | 'personName'> {
  if (!id) return { personId: NO_PERSON, personName: UNKNOWN_PERSON };
  return { personId: id, personName: names.get(id) ?? UNKNOWN_PERSON };
}

function addPerson(detail: DetailAcc, entry: Entry): void {
  const current = detail.people.get(entry.personId);
  if (current) {
    current.hours += entry.hours;
    current.cost += entry.cost;
    return;
  }
  detail.people.set(entry.personId, {
    id: entry.personId,
    name: entry.personName,
    hours: entry.hours,
    cost: entry.cost,
  });
}

function addEntry(bucket: Bucket, entry: Entry): void {
  const key = `${entry.origin}:${entry.id}`;
  let detail = bucket.details.get(key);
  if (!detail) {
    detail = { origin: entry.origin, id: entry.id, name: entry.name, hours: 0, cost: 0, people: new Map() };
    bucket.details.set(key, detail);
  }
  detail.hours += entry.hours;
  detail.cost += entry.cost;
  addPerson(detail, entry);
}

/** Fecha as origens de um centro: fatia de cada uma no centro, e de cada pessoa na origem. */
function toDetailRows(bucket: Bucket, bucketCost: number): CostCenterDetailRow[] {
  return [...bucket.details.values()]
    .map((detail) => ({
      origin: detail.origin,
      id: detail.id,
      name: detail.name,
      hours: detail.hours,
      cost: detail.cost,
      sharePct: bucketCost > 0 ? (detail.cost / bucketCost) * 100 : 0,
      people: [...detail.people.values()]
        .map((person) => ({
          ...person,
          sharePct: detail.cost > 0 ? (person.cost / detail.cost) * 100 : 0,
        }))
        .sort((a, b) => b.cost - a.cost),
    }))
    .sort((a, b) => b.cost - a.cost);
}

function buildRows(
  buckets: Map<string, Bucket>,
  centers: CostInputs['centers'],
  totalCost: number,
): CostCenterCostRow[] {
  const meta = new Map(centers.map((c) => [c.id, { name: c.name, isActive: c.is_active }]));
  const rows = [...buckets.entries()].map(([key, bucket]) => {
    const info = meta.get(key);
    const rowCost = bucket.projectCost + bucket.internalCost;
    return {
      costCenterId: key === NO_CENTER ? null : key,
      costCenterName: info?.name ?? 'Sem centro de custo',
      isActive: info?.isActive ?? false,
      projectHours: bucket.projectHours,
      projectCost: bucket.projectCost,
      internalHours: bucket.internalHours,
      internalCost: bucket.internalCost,
      totalHours: bucket.projectHours + bucket.internalHours,
      totalCost: rowCost,
      sharePct: totalCost > 0 ? (rowCost / totalCost) * 100 : 0,
      // Composição do centro, do maior custo para o menor.
      details: toDetailRows(bucket, rowCost),
    };
  });
  // Maior custo primeiro; "sem centro" por último, porque é pendência, não leitura.
  return rows.sort((a, b) => {
    if (a.costCenterId === null) return 1;
    if (b.costCenterId === null) return -1;
    return b.totalCost - a.totalCost;
  });
}

function aggregate(input: CostInputs): CostByCostCenterData {
  const employeeCost = new Map<string, EmployeeCost>(
    input.employees.map((e) => [
      e.id,
      {
        totalMonthlyCost: Number(e.total_monthly_cost_estimated) || 0,
        jornadaDiaria: Number(e.jornada_diaria) || 8,
        dataAdmissao: e.data_admissao ?? null,
      },
    ]),
  );
  const employeeName = new Map(input.employees.map((e) => [e.id, e.nome ?? UNKNOWN_PERSON]));
  const serviceCenter = new Map(input.services.map((s) => [s.id, s.cost_center_id ?? null]));
  const projectInfo = new Map(
    input.projects.map((p) => [p.id, { name: p.name, center: serviceCenter.get(p.service_line ?? '') ?? null }]),
  );
  const memberEmployee = new Map(input.members.map((m) => [m.id, m.employee_id]));
  const activityName = new Map(input.activities.map((a) => [a.id, a.name]));

  const buckets = new Map<string, Bucket>();
  const bucketFor = (key: string) => {
    const existing = buckets.get(key);
    if (existing) return existing;
    const fresh = emptyBucket();
    buckets.set(key, fresh);
    return fresh;
  };

  for (const row of input.activityHours) {
    const hours = Number(row.hours) || 0;
    if (hours === 0) continue;
    const cost = hours * hourlyCostOf(employeeCost.get(row.employee_id), row.work_date, input.holidays);
    const bucket = bucketFor(row.cost_center_id ?? NO_CENTER);
    bucket.internalHours += hours;
    bucket.internalCost += cost;
    addEntry(bucket, {
      origin: CostOrigin.ACTIVITY,
      id: row.activity_type_id,
      name: activityName.get(row.activity_type_id) ?? 'Atividade interna',
      hours,
      cost,
      ...personOf(row.employee_id, employeeName),
    });
  }

  for (const row of input.projectHours) {
    const hours = Number(row.hours) || 0;
    if (hours === 0) continue;
    const employeeId = memberEmployee.get(row.project_member_id ?? '');
    const snapshot = row.cost_per_hour != null ? Number(row.cost_per_hour) : null;
    const rate = snapshot ?? hourlyCostOf(employeeCost.get(employeeId ?? ''), row.work_date, input.holidays);
    const cost = hours * rate;
    const project = projectInfo.get(row.project_id);
    const bucket = bucketFor(project?.center ?? NO_CENTER);
    bucket.projectHours += hours;
    bucket.projectCost += cost;
    addEntry(bucket, {
      origin: CostOrigin.PROJECT,
      id: row.project_id,
      name: project?.name ?? 'Projeto',
      hours,
      cost,
      ...personOf(employeeId, employeeName),
    });
  }

  const totals = [...buckets.values()].reduce(
    (acc, b) => ({
      cost: acc.cost + b.projectCost + b.internalCost,
      hours: acc.hours + b.projectHours + b.internalHours,
    }),
    { cost: 0, hours: 0 },
  );
  const unclassified = buckets.get(NO_CENTER);

  return {
    rows: buildRows(buckets, input.centers, totals.cost),
    totalCost: totals.cost,
    totalHours: totals.hours,
    unclassifiedHours: (unclassified?.projectHours ?? 0) + (unclassified?.internalHours ?? 0),
    unclassifiedCost: (unclassified?.projectCost ?? 0) + (unclassified?.internalCost ?? 0),
  };
}

export function useCostByCostCenter(filters: AnalyticsFilters, options?: { enabled?: boolean }) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const startStr = format(filters.startDate, 'yyyy-MM-dd');
  const endStr = format(filters.endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['cost-by-cost-center', tenantId, startStr, endStr],
    enabled: !!tenantId && (options?.enabled ?? true),
    queryFn: async (): Promise<CostByCostCenterData> => {
      if (!tenantId) throw new Error('Empresa não identificada na sessão.');
      return aggregate(await fetchCostInputs(tenantId, startStr, endStr));
    },
  });
}
