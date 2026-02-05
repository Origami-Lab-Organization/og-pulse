import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { TimesheetWeekRow } from './TimesheetWeekRow';
import { ProjectWithMembers, WeekDay, TimesheetEntry } from '@/hooks/useTimesheetData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimesheetByProjectProps {
  projects: ProjectWithMembers[];
  weekDays: WeekDay[];
  timesheetEntries: TimesheetEntry[];
}

export function TimesheetByProject({ projects, weekDays, timesheetEntries }: TimesheetByProjectProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum projeto ativo encontrado.</p>
        <p className="text-sm">Projetos ativos ou em execução aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.projectId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{project.clientName}</span>
              <span>/</span>
              <span>{project.projectName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Header Row */}
            <div className="grid grid-cols-[1fr_repeat(5,60px)_80px] gap-2 items-center py-2 px-3 border-b text-xs font-medium text-muted-foreground">
              <div>Funcionário</div>
              {weekDays.map((day) => (
                <div key={day.date} className="text-center">
                  {format(new Date(day.date + 'T12:00:00'), 'EEE', { locale: ptBR })}
                  <br />
                  <span className="text-[10px]">
                    {format(new Date(day.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                  </span>
                </div>
              ))}
              <div className="text-right pr-2">Total</div>
            </div>
            
            {/* Member Rows */}
            {project.members.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Nenhum funcionário alocado neste projeto.
              </div>
            ) : (
              project.members.map((member) => (
                <TimesheetWeekRow
                  key={member.memberId}
                  label={member.employeeName}
                  subLabel={member.role}
                  avatarUrl={member.employeePhoto}
                  projectId={project.projectId}
                  memberId={member.memberId}
                  weekDays={weekDays}
                  existingEntries={timesheetEntries}
                />
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
