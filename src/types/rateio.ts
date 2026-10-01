export enum AllocationLineKind {
  /** Horas lançadas em item de um centro (projeto pelo serviço, atividade pelo cadastro). */
  Center = 'centro',
  /** Horas lançadas em item sem centro no momento do lançamento. */
  NoCenter = 'sem_centro',
  /** Jornada que não virou lançamento. Não vai para centro nenhum (PUL-182): fica para decidir. */
  NotLogged = 'nao_lancado',
}

export interface AllocationItem {
  key: string;
  name: string;
  kind: 'projeto' | 'atividade';
  hours: number;
}

export interface AllocationLine {
  key: string;
  kind: AllocationLineKind;
  centerId: string | null;
  label: string;
  hours: number;
  /** Fatia do Total Mensal, de 0 a 1. */
  share: number;
  value: number;
  items: AllocationItem[];
}

export interface PersonAllocation {
  employeeId: string;
  nome: string;
  total: number;
  /** "Horas no Mês" da Custo x Hora: o divisor do custo-hora da própria tela. */
  jornada: number;
  lancado: number;
  /** `false` = não lança hora: 100% no centro de lotação (ADR-0031). */
  logsHours: boolean;
  lines: AllocationLine[];
}

/** Lotação de quem não lança hora (`employees.cost_center_id`, PUL-218). */
export interface PersonLotacao {
  logsHours: boolean;
  costCenterId: string | null;
}

export interface CenterHours {
  hours: number;
  items: Map<string, AllocationItem>;
}

export interface PersonHours {
  total: number;
  /** Chave = id do centro, ou `NO_CENTER_KEY`. */
  byCenter: Map<string, CenterHours>;
}

/** Uma pessoa dentro de um centro, na visão por centro do consolidado. */
export interface CenterPerson {
  employeeId: string;
  nome: string;
  hours: number;
  value: number;
  /** Fatia do Total Mensal da pessoa que caiu neste centro, de 0 a 1. */
  shareOfPerson: number;
  /** Não lança hora: está aqui pela lotação, não por lançamento. */
  byLotacao: boolean;
}

export interface CenterGroup {
  key: string;
  label: string;
  kind: AllocationLineKind;
  hours: number;
  value: number;
  people: CenterPerson[];
}
