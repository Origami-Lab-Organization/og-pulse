import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useHolidays } from '@/hooks/useHolidays';
import { useTeamAllocationRows } from '@/hooks/useProjectRoles';
import { countWorkingDays } from '@/lib/workingDays';
import { GPO_HEALTHY_MIN } from '@/lib/gpoAllocation.constants';
import { initialsOf } from '@/lib/meetingTranscription';
import type { ProjectWithRelations } from '@/types/project';
import type { EmployeeDirectoryEntry } from '@/types/employeeDirectory';
import type { TeamAllocationRow, TeamAllocationRowKind } from '@/types/equipe.types';

interface ProjectTeamThisMonthProps {
  project: ProjectWithRelations;
  onOpenTeam?: () => void;
}

interface MemberLineProps {
  row: TeamAllocationRow;
  /** Nome, cargo e foto do diretório: o embed de `employees` vem vazio para quem não é admin/gerente (PUL-162). */
  person: EmployeeDirectoryEntry | undefined;
  monthKey: string;
  /** Fração de dias úteis já passados no mês (0 a 1): base do "abaixo do esperado". */
  elapsedShare: number;
  showHours: boolean;
  isMe: boolean;
}

const MEMBER: TeamAllocationRowKind = 'member';

/** Horas do mês e se a pessoa está abaixo do esperado até hoje. */
function monthProgress(cell: TeamAllocationRow['months'][string] | undefined, elapsedShare: number) {
  const planned = cell?.plannedHours ?? 0;
  const realized = cell?.realizedHours ?? 0;
  const expected = planned * elapsedShare;
  return {
    planned,
    realized,
    // Mesma faixa da Alocação GPO da aba Equipe (ADR-0018): abaixo de 90% do esperado até hoje.
    behind: expected > 0 && (realized / expected) * 100 < GPO_HEALTHY_MIN,
    share: planned > 0 ? Math.min(100, (realized / planned) * 100) : 0,
  };
}

type MonthProgress = ReturnType<typeof monthProgress>;

/** Linha discreta das horas do mês: "8h de 16h no mês" e, se for o caso, "abaixo do esperado". */
function HoursLine(props: { progress: MonthProgress }) {
  const { planned, realized, behind } = props.progress;
  return (
    <p className="truncate text-xs text-muted-foreground">
      <span className="font-mono tabular-nums">
        {Math.round(realized)}h de {Math.round(planned)}h
      </span>{' '}
      no mês
      {behind && <span className="font-medium text-warning-emphasis"> · abaixo do esperado</span>}
    </p>
  );
}

/** Uma pessoa: foto, nome, cargo e — quando pode ver — as horas do mês. */
function MemberLine(props: MemberLineProps) {
  const { row, person, monthKey, elapsedShare, showHours, isMe } = props;
  const name = person?.nome ?? row.employee?.nome ?? 'Funcionário';
  const role = person?.cargo || row.employee?.cargo || row.roleName;
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-md border px-3 py-2">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={person?.foto_url ?? row.employee?.foto_url ?? undefined} alt={name} />
        <AvatarFallback className="text-xs">{initialsOf(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {name}
          {isMe && <span className="ml-1.5 text-xs font-normal text-primary">você</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
        {showHours && <HoursLine progress={monthProgress(row.months[monthKey], elapsedShare)} />}
      </div>
    </li>
  );
}

/**
 * Equipe ativa no mês atual, na Visão Geral (US-0037, decisão de 23/11/2026). Mesma fonte da
 * aba Equipe. Quem tem `financeiro:ler` (GP, gerente, admin) vê as horas de todos; o membro vê
 * foto, nome e cargo de todos, e horas só nas próprias. Sem custo nem custo/hora.
 */
export function ProjectTeamThisMonth(props: ProjectTeamThisMonthProps) {
  const { project, onOpenTeam } = props;
  const { can, employee } = useAuth();
  const { data: holidays = [] } = useHolidays();
  const { rows, isLoading } = useTeamAllocationRows(project, false, employee?.id);
  const { byId: directory } = useEmployeeDirectoryMap();
  const seeAllHours = can('financeiro:ler');

  const today = useMemo(() => new Date(), []);
  const monthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
  const { workingDays, elapsed } = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { workingDays: countWorkingDays(start, end, holidays), elapsed: countWorkingDays(start, today, holidays) };
  }, [today, holidays]);

  const members = rows.filter((row) => {
    const cell = row.months[monthKey];
    return row.kind === MEMBER && ((cell?.plannedHours ?? 0) > 0 || (cell?.realizedHours ?? 0) > 0);
  });
  const monthLabel = format(today, 'MMM/yy', { locale: ptBR });

  return (
    <section aria-label="Equipe no mês" className="rounded-lg border bg-card p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4" />
          Equipe em {monthLabel}
          <span className="font-normal text-muted-foreground">· dia útil {elapsed} de {workingDays}</span>
        </h3>
        {onOpenTeam && (
          <Button variant="ghost" size="sm" onClick={onOpenTeam}>
            Ver equipe
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguém alocado neste mês.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((row) => (
            <MemberLine
              key={row.key}
              row={row}
              person={row.employeeId ? directory.get(row.employeeId) : undefined}
              monthKey={monthKey}
              elapsedShare={workingDays > 0 ? elapsed / workingDays : 0}
              showHours={seeAllHours || row.employeeId === employee?.id}
              isMe={row.employeeId === employee?.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
