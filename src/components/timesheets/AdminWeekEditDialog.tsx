import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';
import { ProjectWithMembers, WeekDay, TimesheetEntry } from '@/hooks/useTimesheetData';
import { Holiday } from '@/types/holiday';
import { isHoliday } from '@/hooks/useHolidays';
import { cn } from '@/lib/utils';

interface HoursChange {
  timesheetId: string;
  projectId: string;
  projectMemberId: string;
  workDate: string;
  previousHours: number;
  newHours: number;
}

interface AdminWeekEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  weekEnd: Date;
  projects: ProjectWithMembers[];
  weekDays: WeekDay[];
  timesheetEntries: TimesheetEntry[];
  holidays: Holiday[];
  onSave: (changes: HoursChange[], justification: string) => void;
  isSaving: boolean;
}

export function AdminWeekEditDialog({
  open,
  onOpenChange,
  weekStart,
  weekEnd,
  projects,
  weekDays,
  timesheetEntries,
  holidays,
  onSave,
  isSaving,
}: AdminWeekEditDialogProps) {
  const [justification, setJustification] = useState('');
  
  // Initialize hours state from existing entries
  const initialHours = useMemo(() => {
    const hours: Record<string, Record<string, number>> = {};
    
    projects.forEach((project) => {
      project.members.forEach((member) => {
        weekDays.forEach((day) => {
          const entry = timesheetEntries.find(
            (e) => e.projectMemberId === member.memberId && e.workDate === day.date
          );
          const key = `${member.memberId}`;
          if (!hours[key]) hours[key] = {};
          hours[key][day.date] = entry?.hours ?? 0;
        });
      });
    });
    
    return hours;
  }, [projects, weekDays, timesheetEntries]);

  const [hours, setHours] = useState<Record<string, Record<string, number>>>(initialHours);

  // Reset state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setHours(initialHours);
      setJustification('');
    }
    onOpenChange(isOpen);
  };

  const handleHoursChange = (memberId: string, date: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 24) return;
    
    setHours((prev) => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [date]: numValue,
      },
    }));
  };

  // Calculate changes
  const changes = useMemo(() => {
    const result: HoursChange[] = [];
    
    projects.forEach((project) => {
      project.members.forEach((member) => {
        weekDays.forEach((day) => {
          const holidayDay = isHoliday(parseISO(day.date), holidays);
          if (holidayDay) return;
          
          const entry = timesheetEntries.find(
            (e) => e.projectMemberId === member.memberId && e.workDate === day.date
          );
          
          const previousHours = entry?.hours ?? 0;
          const newHours = hours[member.memberId]?.[day.date] ?? 0;
          
          if (previousHours !== newHours) {
            result.push({
              timesheetId: entry?.id || '',
              projectId: project.projectId,
              projectMemberId: member.memberId,
              workDate: day.date,
              previousHours,
              newHours,
            });
          }
        });
      });
    });
    
    return result;
  }, [projects, weekDays, timesheetEntries, hours, holidays]);

  const hasChanges = changes.length > 0;
  const isValid = hasChanges && justification.length >= 10;

  const handleSave = () => {
    if (!isValid) return;
    onSave(changes, justification);
  };

  const getHolidayForDate = (dateStr: string): Holiday | null => {
    const date = parseISO(dateStr);
    return isHoliday(date, holidays);
  };

  const formatWeekRange = () => {
    return `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Editar Semana Enviada
          </DialogTitle>
          <DialogDescription>
            Semana: {formatWeekRange()} — Toda alteração será registrada com a justificativa fornecida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.projectId}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{project.clientName}</span>
                  <span>/</span>
                  <span>{project.projectName}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Header */}
                <div className="grid grid-cols-[1fr_repeat(5,60px)_80px] gap-2 items-center py-2 border-b text-xs font-medium text-muted-foreground">
                  <div>Funcionário</div>
                  {weekDays.map((day) => {
                    const holiday = getHolidayForDate(day.date);
                    return (
                      <div
                        key={day.date}
                        className={cn(
                          "text-center rounded-md py-1",
                          holiday && "bg-destructive/10 text-destructive"
                        )}
                      >
                        {format(new Date(day.date + 'T12:00:00'), 'EEE', { locale: ptBR })}
                        <br />
                        <span className="text-[10px]">
                          {format(new Date(day.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                        </span>
                      </div>
                    );
                  })}
                  <div className="text-right pr-2">Total</div>
                </div>

                {/* Member Rows */}
                {project.members.map((member) => {
                  const memberHours = hours[member.memberId] || {};
                  const totalHours = Object.values(memberHours).reduce((sum, h) => sum + (h || 0), 0);
                  const initials = member.employeeName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={member.memberId}
                      className="grid grid-cols-[1fr_repeat(5,60px)_80px] gap-2 items-center py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={member.employeePhoto || undefined} alt={member.employeeName} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{member.employeeName}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                        </div>
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
                          (e) => e.projectMemberId === member.memberId && e.workDate === day.date
                        );
                        const currentValue = memberHours[day.date] ?? 0;
                        const originalValue = entry?.hours ?? 0;
                        const hasChange = currentValue !== originalValue;

                        return (
                          <Input
                            key={day.date}
                            type="number"
                            min={0}
                            max={24}
                            step={0.5}
                            value={currentValue || ''}
                            onChange={(e) => handleHoursChange(member.memberId, day.date, e.target.value)}
                            className={cn(
                              "h-8 text-center text-sm px-1",
                              hasChange && "border-primary bg-primary/5"
                            )}
                            placeholder="0"
                          />
                        );
                      })}

                      <div className="text-right font-medium text-sm pr-2">
                        {totalHours.toFixed(1)}h
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {/* Justification */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="justification">
              Justificativa * <span className="text-xs text-muted-foreground">(mínimo 10 caracteres, aplicada a todas as alterações)</span>
            </Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Descreva o motivo da alteração..."
              rows={3}
            />
            {justification.length > 0 && justification.length < 10 && (
              <p className="text-xs text-destructive">
                A justificativa deve ter no mínimo 10 caracteres ({justification.length}/10)
              </p>
            )}
          </div>

          {/* Summary */}
          {hasChanges && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">
                {changes.length} alteração{changes.length > 1 ? 'ões' : ''} pendente{changes.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
