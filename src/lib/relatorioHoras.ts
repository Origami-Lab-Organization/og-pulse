import { HoursGrouping } from '@/types/relatorioHoras';
import type { HoursGroup, HoursLine, ProjectPersonHoursRow } from '@/types/relatorioHoras';

/** Relatório de horas por projeto e pessoa: agrupa, soma e diz quanto do planejado foi lançado. */

const NO_PERSON = 'Sem pessoa (vaga ou lançamento sem membro)';

const personOf = (row: ProjectPersonHoursRow) => row.employee_name ?? NO_PERSON;

function projectLine(row: ProjectPersonHoursRow): HoursLine {
  return { key: row.project_id, label: row.project_name, sublabel: row.client_name, planned: Number(row.planned_hours), logged: Number(row.logged_hours) };
}

function personLine(row: ProjectPersonHoursRow): HoursLine {
  return { key: row.employee_id ?? 'sem-pessoa', label: personOf(row), sublabel: null, planned: Number(row.planned_hours), logged: Number(row.logged_hours) };
}

const byLabel = (a: HoursLine, b: HoursLine) => a.label.localeCompare(b.label, 'pt-BR');

/** Por projeto: projeto → pessoas. Por pessoa: pessoa → projetos. Grupos do maior lançado para o menor. */
export function groupHours(rows: readonly ProjectPersonHoursRow[], grouping: HoursGrouping): HoursGroup[] {
  const byProject = grouping === HoursGrouping.ByProject;
  const groups = new Map<string, HoursGroup>();
  for (const row of rows) {
    const head = byProject ? projectLine(row) : personLine(row);
    const line = byProject ? personLine(row) : projectLine(row);
    const group = groups.get(head.key) ?? { ...head, planned: 0, logged: 0, lines: [] };
    group.planned += line.planned;
    group.logged += line.logged;
    group.lines.push(line);
    groups.set(head.key, group);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, lines: g.lines.sort(byLabel) }))
    .sort((a, b) => b.logged - a.logged);
}

export function totalsOf(rows: readonly ProjectPersonHoursRow[]): { planned: number; logged: number } {
  return rows.reduce((acc, r) => ({ planned: acc.planned + Number(r.planned_hours), logged: acc.logged + Number(r.logged_hours) }), { planned: 0, logged: 0 });
}

/** Quanto do planejado foi lançado. Sem planejado não há percentual: é hora fora do plano. */
export function executedPct(planned: number, logged: number): number | null {
  return planned > 0 ? (logged / planned) * 100 : null;
}

const hours = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function formatHours(value: number): string {
  return `${hours(value)} h`;
}

/** Linhas do CSV (separador `;`, decimal com vírgula), uma por projeto × pessoa. */
export function csvRows(rows: readonly ProjectPersonHoursRow[]): (string | number)[][] {
  return [...rows]
    .sort((a, b) => a.project_name.localeCompare(b.project_name, 'pt-BR') || personOf(a).localeCompare(personOf(b), 'pt-BR'))
    .map((r) => {
      const pct = executedPct(Number(r.planned_hours), Number(r.logged_hours));
      return [
        r.project_name,
        r.client_name ?? '',
        personOf(r),
        hours(Number(r.planned_hours)),
        hours(Number(r.logged_hours)),
        hours(Number(r.logged_hours) - Number(r.planned_hours)),
        pct == null ? '' : hours(Math.round(pct)),
      ];
    });
}

export const CSV_HEADERS = ['Projeto', 'Cliente', 'Pessoa', 'Planejado (h)', 'Lançado (h)', 'Diferença (h)', 'Executado (%)'];
