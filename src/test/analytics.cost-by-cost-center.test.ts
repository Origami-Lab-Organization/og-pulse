import { describe, it, expect } from 'vitest';
import { aggregateCostByCostCenter } from '@/hooks/useCostByCostCenter';
import type {
  CostInputs,
  ProjectHourRow,
  ActivityHourRow,
} from '@/services/costCenterCostService';

/**
 * De onde vem o centro de custo de cada hora (PUL-246, ADR-0031).
 *
 * A regra que estes testes protegem: o centro é o do MOMENTO do lançamento, gravado na
 * própria hora, e não resolvido na leitura pelo cadastro de hoje. Antes de 17/09 a hora de
 * projeto derivava o centro por `projects.service_line` -> `services.cost_center_id`, então
 * mover um serviço de centro reescrevia o custo histórico e um mês fechado deixava de fechar
 * com o mesmo número.
 */

const STUDIO = 'cc-studio';
const VENTURES = 'cc-ventures';
const PROJECT = 'proj-1';
const MEMBER = 'member-1';
const EMPLOYEE = 'emp-1';

function projectHour(overrides: Partial<ProjectHourRow> = {}): ProjectHourRow {
  return {
    project_id: PROJECT,
    project_member_id: MEMBER,
    hours: 10,
    // Snapshot explícito: o custo da hora não é o que está sob teste aqui, e fixá-lo mantém
    // as asserções independentes de feriado, jornada e data de admissão.
    cost_per_hour: 100,
    work_date: '2026-08-10',
    cost_center_id: STUDIO,
    ...overrides,
  };
}

function activityHour(overrides: Partial<ActivityHourRow> = {}): ActivityHourRow {
  return {
    cost_center_id: VENTURES,
    activity_type_id: 'act-1',
    employee_id: EMPLOYEE,
    hours: 4,
    work_date: '2026-08-10',
    ...overrides,
  };
}

function inputs(overrides: Partial<CostInputs> = {}): CostInputs {
  return {
    centers: [
      { id: STUDIO, name: 'SL02 Studio de Produto', is_active: true },
      { id: VENTURES, name: 'SL03 Ventures', is_active: true },
    ],
    employees: [
      {
        id: EMPLOYEE,
        nome: 'Pessoa Um',
        total_monthly_cost_estimated: 0,
        jornada_diaria: 8,
        data_admissao: '2020-01-01',
      },
    ],
    holidays: [],
    projects: [{ id: PROJECT, name: 'Projeto Um' }],
    members: [{ id: MEMBER, employee_id: EMPLOYEE }],
    activities: [{ id: 'act-1', name: 'Marketing' }],
    activityHours: [],
    projectHours: [],
    ...overrides,
  };
}

const rowFor = (data: ReturnType<typeof aggregateCostByCostCenter>, centerId: string | null) =>
  data.rows.find((r) => r.costCenterId === centerId);

describe('custo por centro de custo — de onde vem o centro de cada hora', () => {
  it('põe a hora de projeto no centro gravado na própria hora', () => {
    const data = aggregateCostByCostCenter(
      inputs({ projectHours: [projectHour({ hours: 10, cost_center_id: STUDIO })] }),
    );

    expect(rowFor(data, STUDIO)?.projectHours).toBe(10);
    expect(rowFor(data, STUDIO)?.projectCost).toBe(1000);
    expect(rowFor(data, VENTURES)).toBeUndefined();
  });

  it('mantém o mesmo projeto em dois centros quando o serviço mudou de centro no meio', () => {
    // O caso que motivou a história: o projeto foi de Ventures para Studio em setembro. As
    // horas de agosto têm de continuar em Ventures — quem deriva o centro na leitura joga
    // as duas em Studio e reescreve o passado.
    const data = aggregateCostByCostCenter(
      inputs({
        projectHours: [
          projectHour({ work_date: '2026-08-10', hours: 10, cost_center_id: VENTURES }),
          projectHour({ work_date: '2026-09-10', hours: 6, cost_center_id: STUDIO }),
        ],
      }),
    );

    expect(rowFor(data, VENTURES)?.projectHours).toBe(10);
    expect(rowFor(data, STUDIO)?.projectHours).toBe(6);
    expect(data.totalHours).toBe(16);
  });

  it('não inventa centro para hora de projeto sem centro: vira lacuna de cobertura', () => {
    const data = aggregateCostByCostCenter(
      inputs({
        projectHours: [
          projectHour({ hours: 10, cost_center_id: STUDIO }),
          projectHour({ hours: 3, cost_center_id: null }),
        ],
      }),
    );

    expect(data.unclassified.projectHours).toBe(3);
    expect(data.unclassified.projectCost).toBe(300);

    const semCentro = rowFor(data, null);
    expect(semCentro?.costCenterName).toBe('Sem centro de custo');
    // Pendência fica por último na tela, mesmo que o custo dela seja maior que o de um centro.
    expect(data.rows[data.rows.length - 1]).toBe(semCentro);
  });

  it('separa hora de projeto de hora de atividade dentro do mesmo centro', () => {
    const data = aggregateCostByCostCenter(
      inputs({
        projectHours: [projectHour({ hours: 10, cost_center_id: VENTURES })],
        activityHours: [activityHour({ hours: 4, cost_center_id: VENTURES })],
      }),
    );

    const ventures = rowFor(data, VENTURES);
    expect(ventures?.projectHours).toBe(10);
    expect(ventures?.internalHours).toBe(4);
    expect(ventures?.totalHours).toBe(14);
  });

  it('ignora lançamento de zero hora, que só sujaria a composição do centro', () => {
    const data = aggregateCostByCostCenter(
      inputs({
        projectHours: [
          projectHour({ hours: 10, cost_center_id: STUDIO }),
          projectHour({ hours: 0, cost_center_id: STUDIO }),
        ],
      }),
    );

    expect(rowFor(data, STUDIO)?.projectHours).toBe(10);
    expect(rowFor(data, STUDIO)?.details).toHaveLength(1);
  });

  it('não deixa o centro de uma hora de atividade vazar para a de projeto', () => {
    // Guarda contra a regressão mais provável: unificar as duas origens num só caminho e
    // passar a resolver as duas pela mesma fonte.
    const data = aggregateCostByCostCenter(
      inputs({
        projectHours: [projectHour({ hours: 10, cost_center_id: STUDIO })],
        activityHours: [activityHour({ hours: 4, cost_center_id: VENTURES })],
      }),
    );

    expect(rowFor(data, STUDIO)?.internalHours).toBe(0);
    expect(rowFor(data, VENTURES)?.projectHours).toBe(0);
  });
});
