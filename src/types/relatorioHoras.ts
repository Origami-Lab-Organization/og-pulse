/** Linha de `project_hours_by_person`: um projeto × uma pessoa no período. Só horas, nunca custo. */
export interface ProjectPersonHoursRow {
  project_id: string;
  project_name: string;
  client_name: string | null;
  /** `null` quando a hora foi lançada sem membro ou planejada para vaga. */
  employee_id: string | null;
  employee_name: string | null;
  planned_hours: number;
  logged_hours: number;
}

export enum HoursGrouping {
  ByProject = 'projeto',
  ByPerson = 'pessoa',
}

export interface HoursLine {
  key: string;
  label: string;
  sublabel: string | null;
  planned: number;
  logged: number;
}

export interface HoursGroup extends HoursLine {
  lines: HoursLine[];
}
