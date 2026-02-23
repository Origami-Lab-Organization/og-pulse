import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, CheckCircle2, Pencil, X, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TimesheetWeekRow } from './TimesheetWeekRow';
import { EmployeeWithProjects, WeekDay, TimesheetEntry } from '@/hooks/useTimesheetData';
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

interface TimesheetByEmployeeProps {
  employees: EmployeeWithProjects[];
  weekDays: WeekDay[];
  timesheetEntries: TimesheetEntry[];
  holidays?: Holiday[];
  submissions: Map<string, ProjectTimesheetSubmission>;
  isAdmin?: boolean;
  canEdit?: boolean;
  onAdminSaveEdit?: (changes: AdminEditChange[], justification: string) => void;
  isSavingEdit?: boolean;
}

export interface AdminEditChange {
  timesheetId: string;
  projectId: string;
  projectMemberId: string;
  workDate: string;
  previousHours: number;
  newHours: number;
}

export function TimesheetByEmployee({ 
  employees, 
  weekDays, 
  timesheetEntries, 
  holidays = [],
  submissions,
  isAdmin = false,
  canEdit = false,
  onAdminSaveEdit,
  isSavingEdit = false,
}: TimesheetByEmployeeProps) {
  const [editingProjectKey, setEditingProjectKey] = useState<string | null>(null);
  const [editHours, setEditHours] = useState<Record<string, number>>({});
  const [justification, setJustification] = useState('');

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum funcionário alocado em projetos ativos.</p>
        <p className="text-sm">Funcionários alocados em projetos aparecerão aqui.</p>
      </div>
    );
  }

  const getHolidayForDate = (dateStr: string): Holiday | null => {
    const date = parseISO(dateStr);
    return isHoliday(date, holidays);
  };

  const getEmployeeTotalHours = (employeeProjects: EmployeeWithProjects['projects']) => {
    let total = 0;
    employeeProjects.forEach((project) => {
      weekDays.forEach((day) => {
        const entry = timesheetEntries.find(
          (e) => e.projectMemberId === project.memberId && e.workDate === day.date
        );
        total += entry?.hours ?? 0;
      });
    });
    return total;
  };

  const isProjectLocked = (projectId: string): boolean => {
    const submission = submissions.get(projectId);
    return submission?.status === 'submitted';
  };

  const startEditing = (memberId: string, projectId: string) => {
    const key = `${memberId}__${projectId}`;
    // Initialize edit hours from existing entries
    const initialHours: Record<string, number> = {};
    weekDays.forEach((day) => {
      const entry = timesheetEntries.find(
        (e) => e.projectMemberId === memberId && e.workDate === day.date
      );
      initialHours[day.date] = entry?.hours ?? 0;
    });
    setEditHours(initialHours);
    setJustification('');
    setEditingProjectKey(key);
  };

  const cancelEditing = () => {
    setEditingProjectKey(null);
    setEditHours({});
    setJustification('');
  };

  const handleEditHoursChange = (date: string, value: string) => {
    const raw = value === '' ? 0 : parseFloat(value);
    if (isNaN(raw) || raw < 0 || raw > 24) return;
    const numValue = Math.round(raw * 10) / 10;
    setEditHours((prev) => ({ ...prev, [date]: numValue }));
  };

  const handleSaveEdit = (memberId: string, projectId: string) => {
    if (!onAdminSaveEdit || justification.length < 10) return;

    const changes: AdminEditChange[] = [];
    weekDays.forEach((day) => {
      const holiday = getHolidayForDate(day.date);
      if (holiday) return;

      const entry = timesheetEntries.find(
        (e) => e.projectMemberId === memberId && e.workDate === day.date
      );
      const previousHours = entry?.hours ?? 0;
      const newHours = editHours[day.date] ?? 0;

      if (previousHours !== newHours) {
        changes.push({
          timesheetId: entry?.id || '',
          projectId,
          projectMemberId: memberId,
          workDate: day.date,
          previousHours,
          newHours,
        });
      }
    });

    if (changes.length === 0) return;

    onAdminSaveEdit(changes, justification);
    cancelEditing();
  };

  const getEditChangesCount = (memberId: string) => {
    let count = 0;
    weekDays.forEach((day) => {
      const holiday = getHolidayForDate(day.date);
      if (holiday) return;
      const entry = timesheetEntries.find(
        (e) => e.projectMemberId === memberId && e.workDate === day.date
      );
      const previousHours = entry?.hours ?? 0;
      const newHours = editHours[day.date] ?? 0;
      if (previousHours !== newHours) count++;
    });
    return count;
  };

  return (
    <div className="space-y-4">
      {employees.map((employee) => {
        const initials = employee.employeeName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        const totalHours = getEmployeeTotalHours(employee.projects);

        const hasActionSlot = employee.projects.some(p => isProjectLocked(p.projectId));

        return (
          <Card key={employee.employeeId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={employee.employeePhoto || undefined} alt={employee.employeeName} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span>{employee.employeeName}</span>
                </div>
                <span className="text-sm font-normal text-muted-foreground">
                  Total: {totalHours.toFixed(1)}h
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Header Row */}
              <div className={cn(
                "grid gap-2 items-center py-2 px-3 border-b text-xs font-medium text-muted-foreground",
                hasActionSlot ? "grid-cols-[1fr_repeat(5,60px)_80px_90px_50px]" : "grid-cols-[1fr_repeat(5,60px)_80px]"
              )}>
                <div>Cliente / Projeto</div>
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
                {hasActionSlot && <div className="text-center">Status</div>}
                {hasActionSlot && <div className="text-center">Ação</div>}
              </div>
              
              {/* Project Rows */}
              {employee.projects.map((project) => {
                const projectLocked = isProjectLocked(project.projectId);
                const editKey = `${project.memberId}__${project.projectId}`;
                const isEditing = editingProjectKey === editKey;
                
                return (
                  <div key={project.memberId}>
                    {isEditing ? (
                      /* Inline edit mode */
                      <div className="border border-primary/30 rounded-lg my-1 bg-primary/5">
                        <div className={cn(
                          "grid gap-2 items-center py-2 px-3",
                          hasActionSlot ? "grid-cols-[1fr_repeat(5,60px)_80px_90px_50px]" : "grid-cols-[1fr_repeat(5,60px)_80px]"
                        )}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{project.projectName}</p>
                            <p className="text-xs text-muted-foreground truncate">{project.clientName}</p>
                          </div>

                          {weekDays.map((day) => {
                            const holiday = getHolidayForDate(day.date);
                            if (holiday) {
                              return (
                                <div
                                  key={day.date}
                                  className="h-8 flex items-center justify-center text-sm text-muted-foreground bg-destructive/10 rounded-md"
                                >
                                  --
                                </div>
                              );
                            }

                            const entry = timesheetEntries.find(
                              (e) => e.projectMemberId === project.memberId && e.workDate === day.date
                            );
                            const originalValue = entry?.hours ?? 0;
                            const currentValue = editHours[day.date] ?? 0;
                            const hasChange = currentValue !== originalValue;

                            return (
                              <Input
                                key={day.date}
                                type="number"
                                min={0}
                                max={24}
                                step={0.5}
                                value={currentValue || ''}
                                onChange={(e) => handleEditHoursChange(day.date, e.target.value)}
                                className={cn(
                                  "h-8 text-center text-sm px-1",
                                  hasChange && "border-primary ring-1 ring-primary/30"
                                )}
                                placeholder="0"
                              />
                            );
                          })}

                          <div className="text-right font-medium text-sm pr-2">
                            {Object.values(editHours).reduce((s, h) => s + (h || 0), 0).toFixed(1)}h
                          </div>
                          {hasActionSlot && <div />}
                          {hasActionSlot && <div />}
                        </div>

                        {/* Justification + actions bar */}
                        <div className="px-3 pb-3 pt-1 flex items-start gap-3 border-t border-primary/20">
                          <div className="flex-1">
                            <Textarea
                              value={justification}
                              onChange={(e) => setJustification(e.target.value)}
                              placeholder="Justificativa da alteração (mín. 10 caracteres)..."
                              rows={2}
                              className="text-sm resize-none"
                            />
                            {justification.length > 0 && justification.length < 10 && (
                              <p className="text-xs text-destructive mt-1">
                                Mínimo 10 caracteres ({justification.length}/10)
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 pt-1">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(project.memberId, project.projectId)}
                              disabled={isSavingEdit || justification.length < 10 || getEditChangesCount(project.memberId) === 0}
                              className="gap-1"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              disabled={isSavingEdit}
                              className="gap-1"
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Normal display mode */
                      <TimesheetWeekRow
                        label={project.projectName}
                        subLabel={project.clientName}
                        projectId={project.projectId}
                        memberId={project.memberId}
                        weekDays={weekDays}
                        existingEntries={timesheetEntries}
                        holidays={holidays}
                        isLocked={projectLocked}
                        isAdmin={isAdmin}
                        statusSlot={projectLocked ? (
                          <Badge 
                            variant="secondary" 
                            className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] py-0"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                            Enviado
                          </Badge>
                        ) : undefined}
                        actionSlot={projectLocked && canEdit && onAdminSaveEdit ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditing(project.memberId, project.projectId)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
