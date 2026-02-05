import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TimesheetWeekRow } from './TimesheetWeekRow';
import { EmployeeWithProjects, WeekDay, TimesheetEntry } from '@/hooks/useTimesheetData';
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
  isLocked?: boolean;
  isAdmin?: boolean;
}

export function TimesheetByEmployee({ 
  employees, 
  weekDays, 
  timesheetEntries, 
  holidays = [],
  isLocked = false,
  isAdmin = false,
}: TimesheetByEmployeeProps) {
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

  // Calculate total hours per employee
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
              <div className="grid grid-cols-[1fr_repeat(5,60px)_80px] gap-2 items-center py-2 px-3 border-b text-xs font-medium text-muted-foreground">
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
              </div>
              
              {/* Project Rows */}
              {employee.projects.map((project) => (
                <TimesheetWeekRow
                  key={project.memberId}
                  label={project.projectName}
                  subLabel={project.clientName}
                  projectId={project.projectId}
                  memberId={project.memberId}
                  weekDays={weekDays}
                  existingEntries={timesheetEntries}
                  holidays={holidays}
                  isLocked={isLocked}
                  isAdmin={isAdmin}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
