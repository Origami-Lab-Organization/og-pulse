import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Send, CheckCircle2, Edit2 } from 'lucide-react';
import { TimesheetWeekRow } from './TimesheetWeekRow';
import { ProjectWithMembers, WeekDay, TimesheetEntry } from '@/hooks/useTimesheetData';
import { ProjectTimesheetSubmission } from '@/types/timesheetSubmission';
import { Holiday } from '@/types/holiday';
import { isHoliday } from '@/hooks/useHolidays';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimesheetByProjectProps {
  projects: ProjectWithMembers[];
  weekDays: WeekDay[];
  timesheetEntries: TimesheetEntry[];
  holidays?: Holiday[];
  submissions: Map<string, ProjectTimesheetSubmission>;
  isAdmin?: boolean;
  canSubmit?: boolean;
  onSubmitProject: (projectId: string, projectName: string, totalHours: number) => void;
  onAdminEditProject?: (projectId: string) => void;
  isSubmitting?: boolean;
}

export function TimesheetByProject({ 
  projects, 
  weekDays, 
  timesheetEntries, 
  holidays = [],
  submissions,
  isAdmin = false,
  canSubmit = false,
  onSubmitProject,
  onAdminEditProject,
  isSubmitting = false,
}: TimesheetByProjectProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum projeto ativo encontrado.</p>
        <p className="text-sm">Projetos ativos ou em execução aparecerão aqui.</p>
      </div>
    );
  }

  const getHolidayForDate = (dateStr: string): Holiday | null => {
    const date = parseISO(dateStr);
    return isHoliday(date, holidays);
  };

  const getProjectTotalHours = (projectId: string): number => {
    return timesheetEntries
      .filter(e => e.projectId === projectId)
      .reduce((sum, e) => sum + e.hours, 0);
  };

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const submission = submissions.get(project.projectId);
        const isLocked = submission?.status === 'submitted';
        const projectTotalHours = getProjectTotalHours(project.projectId);

        return (
          <Card 
            key={project.projectId}
            className={cn(
              isLocked && "border-green-200 dark:border-green-800"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{project.clientName}</span>
                  <span>/</span>
                  <span>{project.projectName}</span>
                </CardTitle>
                
                <div className="flex items-center gap-3">
                  {/* Total Hours */}
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Total: </span>
                    <span className="font-semibold">{projectTotalHours.toFixed(1)}h</span>
                  </div>
                  
                  {/* Status Badge and Actions */}
                  {isLocked ? (
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enviado
                      </Badge>
                      {isAdmin && onAdminEditProject && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onAdminEditProject(project.projectId)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar semana deste projeto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Rascunho
                      </Badge>
                      {canSubmit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSubmitProject(project.projectId, project.projectName, projectTotalHours)}
                          disabled={isSubmitting || projectTotalHours === 0}
                          className="gap-1"
                        >
                          <Send className="h-3 w-3" />
                          Enviar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Submission info */}
              {isLocked && submission?.submitted_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enviado em {format(new Date(submission.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {submission.submitted_by_employee?.nome && ` por ${submission.submitted_by_employee.nome}`}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Header Row */}
              <div className="grid grid-cols-[1fr_repeat(5,60px)_80px] gap-2 items-center py-2 px-3 border-b text-xs font-medium text-muted-foreground">
                <div>Funcionário</div>
                {weekDays.map((day) => {
                  const holiday = getHolidayForDate(day.date);
                  const isHolidayDay = !!holiday;

                  return (
                    <TooltipProvider key={day.date}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "text-center rounded-md py-1",
                            isHolidayDay && "bg-destructive/10 text-destructive"
                          )}>
                            {format(new Date(day.date + 'T12:00:00'), 'EEE', { locale: ptBR })}
                            <br />
                            <span className="text-[10px]">
                              {format(new Date(day.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                            </span>
                            {isHolidayDay && <span className="text-[8px] block">*</span>}
                          </div>
                        </TooltipTrigger>
                        {isHolidayDay && (
                          <TooltipContent>
                            <p>{holiday.name}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
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
                    projectName={project.projectName}
                    memberId={member.memberId}
                    weekDays={weekDays}
                    existingEntries={timesheetEntries}
                    holidays={holidays}
                    isLocked={isLocked}
                    isAdmin={isAdmin}
                  />
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
