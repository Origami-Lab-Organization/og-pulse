import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { differenceInMonths, parseISO } from 'date-fns';
import { Plus, Trash2, Users, Pencil, Check, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ProjectMemberDB, SENIORITY_OPTIONS } from '@/types/project';
import { BudgetRoleWithMonths } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';
import { useEmployees } from '@/hooks/useEmployees';
import { useAddProjectMember, useRemoveProjectMember, useUpdateProjectMember, useAssignMemberEmployee } from '@/hooks/useProjects';
import { useProjectMemberMonths, useUpsertMemberMonth } from '@/hooks/useProjectMemberMonths';
import { ProjectTimesheetDB } from '@/hooks/useProjectTimesheets';

interface ProjectLaborSectionProps {
  projectId: string;
  members: (ProjectMemberDB & {
    employee?: {
      id: string;
      nome: string;
      cargo: string;
      foto_url?: string | null;
      total_monthly_cost_estimated: number;
      jornada_mensal: number;
    };
  })[];
  durationMonths: number;
  isEditable: boolean;
  budgetRoles: BudgetRoleWithMonths[];
  timesheets?: ProjectTimesheetDB[];
  projectStartDate: string;
}

export function ProjectLaborSection({
  projectId,
  members,
  durationMonths,
  isEditable,
  budgetRoles,
  timesheets = [],
  projectStartDate,
}: ProjectLaborSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [useBudgetRole, setUseBudgetRole] = useState(budgetRoles.length > 0);
  const [newRole, setNewRole] = useState({
    role: '',
    seniority: 'pleno',
    budgetRoleId: '',
    hourlyRate: 0,
  });

  const { data: employees = [] } = useEmployees();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const updateMember = useUpdateProjectMember();
  const assignEmployee = useAssignMemberEmployee();

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const upsertMemberMonth = useUpsertMemberMonth();

  // Local state for debounced hours input
  const [localHours, setLocalHours] = useState<Record<string, number>>({});
  const pendingUpdates = useRef<Record<string, NodeJS.Timeout>>({});
  const hasPendingEdits = useRef(false);

  // Hours edit mode toggle
  const [hoursEditMode, setHoursEditMode] = useState(false);

  // Edit member dialog state
  const [editingMember, setEditingMember] = useState<typeof members[0] | null>(null);
  const [editForm, setEditForm] = useState({ role: '', seniority: '', hourlyRate: 0 });

  // Sync local state when memberMonths change, but only if no pending edits
  useEffect(() => {
    if (hasPendingEdits.current) return;
    
    const initial: Record<string, number> = {};
    memberMonths.forEach((mm) => {
      const key = `${mm.project_member_id}-${mm.month_number}`;
      initial[key] = mm.hours;
    });
    setLocalHours(initial);
  }, [memberMonths]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingUpdates.current).forEach(clearTimeout);
    };
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: durationMonths }, (_, i) => i + 1);
  }, [durationMonths]);

  const availableEmployees = useMemo(() => {
    return employees.filter((e) => e.status === 'ativo' || e.status === 'aguardando_confirmacao');
  }, [employees]);

  // Get budget hourly rate from member's hourly_rate field (price we charge client)
  const getBudgetHourlyRate = useCallback((member: typeof members[0]): number => {
    return Number((member as any).hourly_rate) || 0;
  }, []);

  // Get real hourly cost from employee's total_monthly_cost_estimated / jornada_mensal
  const getRealHourlyCost = useCallback((member: typeof members[0]): number => {
    if (!member.employee) return 0;
    const totalCost = member.employee.total_monthly_cost_estimated || 0;
    const workHours = member.employee.jornada_mensal || 168;
    return workHours > 0 ? totalCost / workHours : 0;
  }, []);

  // Get hours prioritizing local state
  const getHoursForMonth = useCallback(
    (memberId: string, monthNumber: number): number => {
      const key = `${memberId}-${monthNumber}`;
      if (key in localHours) {
        return localHours[key];
      }
      const found = memberMonths.find(
        (mm) => mm.project_member_id === memberId && mm.month_number === monthNumber
      );
      return found?.hours || 0;
    },
    [localHours, memberMonths]
  );

  // Debounced hours change handler
  const handleHoursChange = useCallback(
    (memberId: string, monthNumber: number, hours: number) => {
      const key = `${memberId}-${monthNumber}`;
      hasPendingEdits.current = true;

      // Update local state immediately (no lag)
      setLocalHours((prev) => ({ ...prev, [key]: hours }));

      // Cancel previous timeout if exists
      if (pendingUpdates.current[key]) {
        clearTimeout(pendingUpdates.current[key]);
      }

      // Schedule save with 500ms debounce
      pendingUpdates.current[key] = setTimeout(() => {
        upsertMemberMonth.mutate(
          {
            projectMemberId: memberId,
            monthNumber,
            hours: hours || 0,
          },
          {
            onSettled: () => {
              delete pendingUpdates.current[key];
              if (Object.keys(pendingUpdates.current).length === 0) {
                hasPendingEdits.current = false;
              }
            },
          }
        );
      }, 500);
    },
    [upsertMemberMonth]
  );

  // Save hours and exit edit mode
  const handleSaveHours = useCallback(() => {
    // Clear all pending timeouts and trigger immediate saves
    Object.keys(pendingUpdates.current).forEach((key) => {
      clearTimeout(pendingUpdates.current[key]);
    });
    pendingUpdates.current = {};
    hasPendingEdits.current = false;
    setHoursEditMode(false);
  }, []);

  // Open edit member dialog
  const openEditDialog = useCallback((member: typeof members[0]) => {
    setEditingMember(member);
    setEditForm({
      role: member.role,
      seniority: member.seniority,
      hourlyRate: Number((member as any).hourly_rate) || 0,
    });
  }, []);

  // Update member handler
  const handleUpdateMember = useCallback(() => {
    if (!editingMember) return;
    updateMember.mutate(
      {
        id: editingMember.id,
        projectId,
        updates: {
          role: editForm.role,
          seniority: editForm.seniority,
          hourly_rate: editForm.hourlyRate,
        },
      },
      {
        onSuccess: () => setEditingMember(null),
      }
    );
  }, [editingMember, editForm, projectId, updateMember]);

  // Handle employee assignment inline
  const handleAssignEmployee = useCallback(
    (memberId: string, employeeId: string | null) => {
      assignEmployee.mutate({
        memberId,
        projectId,
        employeeId,
      });
    },
    [assignEmployee, projectId]
  );

  // When selecting a budget role, auto-fill role name, seniority and hourly rate
  const handleBudgetRoleChange = (roleId: string) => {
    const role = budgetRoles.find((r) => r.id === roleId);
    if (role) {
      setNewRole({
        ...newRole,
        budgetRoleId: roleId,
        role: role.role_name,
        seniority: role.seniority,
        hourlyRate: role.hourly_rate,
      });
    }
  };

  const handleAddRole = () => {
    if (!newRole.role) return;

    // Get monthly hours from budget role if selected
    const budgetRole = useBudgetRole && newRole.budgetRoleId
      ? budgetRoles.find((r) => r.id === newRole.budgetRoleId)
      : undefined;
    const monthlyHours = budgetRole?.months?.map((m) => ({
      monthNumber: m.month_number,
      hours: m.hours,
    })) || [];

    addMember.mutate(
      {
        projectId,
        // No employee assigned initially
        role: newRole.role,
        seniority: newRole.seniority,
        hoursPerMonth: 0,
        budgetRoleId: useBudgetRole && newRole.budgetRoleId ? newRole.budgetRoleId : undefined,
        hourlyRate: newRole.hourlyRate,
        monthlyHours,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setNewRole({ role: '', seniority: 'pleno', budgetRoleId: '', hourlyRate: 0 });
          setUseBudgetRole(budgetRoles.length > 0);
        },
      }
    );
  };

  const handleRemoveMember = (memberId: string) => {
    removeMember.mutate({ id: memberId, projectId });
  };

  // Calculate ACTUAL hours from timesheets per member
  const actualHoursByMember = useMemo(() => {
    const result: Record<string, number> = {};
    timesheets.forEach((ts) => {
      if (!result[ts.project_member_id]) {
        result[ts.project_member_id] = 0;
      }
      result[ts.project_member_id] += Number(ts.hours);
    });
    return result;
  }, [timesheets]);

  // Calculate ACTUAL hours from timesheets per member AND per month
  const actualHoursByMemberAndMonth = useMemo(() => {
    const result: Record<string, Record<number, number>> = {};
    const startDate = parseISO(projectStartDate);
    
    timesheets.forEach((ts) => {
      const workDate = parseISO(ts.work_date);
      const monthNumber = differenceInMonths(workDate, startDate) + 1;
      
      if (monthNumber < 1 || monthNumber > durationMonths) return; // Skip if outside project duration
      
      if (!result[ts.project_member_id]) {
        result[ts.project_member_id] = {};
      }
      if (!result[ts.project_member_id][monthNumber]) {
        result[ts.project_member_id][monthNumber] = 0;
      }
      result[ts.project_member_id][monthNumber] += Number(ts.hours);
    });
    
    return result;
  }, [timesheets, projectStartDate, durationMonths]);

  // Get actual hours for a specific member and month
  const getActualHoursForMonth = useCallback(
    (memberId: string, monthNumber: number): number => {
      return actualHoursByMemberAndMonth[memberId]?.[monthNumber] || 0;
    },
    [actualHoursByMemberAndMonth]
  );

  // Calculate totals using real employee cost (PLANNED + ACTUAL by month)
  const totals = useMemo(() => {
    const byMonth: Record<number, { plannedHours: number; plannedValue: number; actualHours: number; actualValue: number }> = {};
    let totalHours = 0;
    let totalValue = 0;
    let totalActualHours = 0;
    let totalActualValue = 0;

    months.forEach((m) => {
      byMonth[m] = { plannedHours: 0, plannedValue: 0, actualHours: 0, actualValue: 0 };
    });

    members.forEach((member) => {
      const realCost = getRealHourlyCost(member);
      months.forEach((monthNum) => {
        const plannedHours = getHoursForMonth(member.id, monthNum);
        const actualHours = getActualHoursForMonth(member.id, monthNum);
        
        byMonth[monthNum].plannedHours += plannedHours;
        byMonth[monthNum].plannedValue += plannedHours * realCost;
        byMonth[monthNum].actualHours += actualHours;
        byMonth[monthNum].actualValue += actualHours * realCost;
        
        totalHours += plannedHours;
        totalValue += plannedHours * realCost;
        totalActualHours += actualHours;
        totalActualValue += actualHours * realCost;
      });
    });

    return { byMonth, totalHours, totalValue, totalActualHours, totalActualValue };
  }, [members, months, getRealHourlyCost, getHoursForMonth, getActualHoursForMonth]);

  // Calculate budget summary for comparison card
  const budgetSummary = useMemo(() => {
    let budgetHours = 0;
    let budgetValue = 0;
    budgetRoles.forEach(role => {
      const hours = role.months?.reduce((sum, m) => sum + m.hours, 0) || 0;
      budgetHours += hours;
      budgetValue += hours * role.hourly_rate;
    });
    return { hours: budgetHours, value: budgetValue };
  }, [budgetRoles]);

  // Calculate variation between planned and budget
  const budgetVariation = useMemo(() => {
    if (budgetSummary.value === 0) return { percent: 0, isUnderBudget: true };
    const diff = totals.totalValue - budgetSummary.value;
    const percent = (diff / budgetSummary.value) * 100;
    return { percent, isUnderBudget: percent <= 0 };
  }, [totals.totalValue, budgetSummary.value]);

  // Calculate member totals using real employee cost (PLANNED + ACTUAL)
  const memberTotals = useMemo(() => {
    const result: Record<string, { plannedHours: number; plannedValue: number; actualHours: number; actualValue: number }> = {};
    members.forEach((member) => {
      const realCost = getRealHourlyCost(member);
      let plannedHours = 0;
      months.forEach((monthNum) => {
        plannedHours += getHoursForMonth(member.id, monthNum);
      });
      const actualHours = actualHoursByMember[member.id] || 0;
      result[member.id] = { 
        plannedHours, 
        plannedValue: plannedHours * realCost,
        actualHours,
        actualValue: actualHours * realCost,
      };
    });
    return result;
  }, [members, months, getRealHourlyCost, getHoursForMonth, actualHoursByMember]);

  // Detect if we're in planning mode (no actual hours yet)
  const isInPlanningMode = useMemo(() => {
    return totals.totalActualHours === 0;
  }, [totals.totalActualHours]);

  // Get employee hourly cost for display in dropdown
  const getEmployeeHourlyCost = useCallback((emp: typeof availableEmployees[0]): number => {
    const totalCost = emp.totalMonthlyCostEstimated || 0;
    const workHours = emp.jornadaMensal || 168;
    return workHours > 0 ? totalCost / workHours : 0;
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alocação de Equipe
            </CardTitle>
            <CardDescription>
              Defina os papéis do projeto e atribua funcionários
            </CardDescription>
          </div>
          {isEditable && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Papel
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Budget vs Planned Comparison Card */}
          {budgetRoles.length > 0 && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Orçado</p>
                  <p className="font-semibold text-lg">
                    {budgetSummary.hours}h <span className="text-muted-foreground font-normal">•</span> {formatCurrency(budgetSummary.value)}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Planejado</p>
                  <p className="font-semibold text-lg">
                    {totals.totalHours}h <span className="text-muted-foreground font-normal">•</span> {formatCurrency(totals.totalValue)}
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium",
                  budgetVariation.percent === 0 && "bg-muted text-muted-foreground",
                  budgetVariation.isUnderBudget && budgetVariation.percent !== 0 && "bg-green-500/10 text-green-600 dark:text-green-400",
                  !budgetVariation.isUnderBudget && "bg-red-500/10 text-red-600 dark:text-red-400"
                )}>
                  {budgetVariation.percent === 0 ? (
                    <Minus className="h-4 w-4" />
                  ) : budgetVariation.isUnderBudget ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  <span>
                    {budgetVariation.percent === 0 
                      ? 'No orçamento' 
                      : `${Math.abs(budgetVariation.percent).toFixed(1)}% ${budgetVariation.isUnderBudget ? 'abaixo' : 'acima'}`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {members.length > 0 ? (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">
                        Papel
                      </TableHead>
                      <TableHead className="min-w-[80px]">Senioridade</TableHead>
                      <TableHead className="min-w-[220px]">Funcionário</TableHead>
                      <TableHead className="text-right min-w-[90px]">Orç. R$/h</TableHead>
                      <TableHead className="text-right min-w-[90px]">Custo R$/h</TableHead>
                      {months.map((m) => (
                        <TableHead key={m} className="text-center min-w-[90px]">
                          <div className="flex flex-col">
                            <span>Mês {m}</span>
                            {!isInPlanningMode && (
                              <span className="text-xs font-normal text-muted-foreground">Plan | Real</span>
                            )}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[130px]">
                        <div className="flex flex-col">
                          <span>Horas</span>
                          {!isInPlanningMode && (
                            <span className="text-xs font-normal text-muted-foreground">Plan | Real</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-center min-w-[160px]">
                        <div className="flex flex-col">
                          <span>Custo</span>
                          {!isInPlanningMode && (
                            <span className="text-xs font-normal text-muted-foreground">Plan | Real</span>
                          )}
                        </div>
                      </TableHead>
                      {isEditable && (
                        <TableHead className="text-center min-w-[80px]">Ações</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => {
                      const budgetRate = getBudgetHourlyRate(member);
                      const realCost = getRealHourlyCost(member);
                      const memberTotal = memberTotals[member.id] || { plannedHours: 0, plannedValue: 0, actualHours: 0, actualValue: 0 };
                      const seniorityLabel = SENIORITY_OPTIONS.find(s => s.value === member.seniority)?.label || member.seniority;

                      return (
                        <TableRow key={member.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            {member.role}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {seniorityLabel}
                          </TableCell>
                          <TableCell className="p-2">
                            {isEditable ? (
                              <Select
                                value={member.employee_id || ''}
                                onValueChange={(value) => handleAssignEmployee(member.id, value || null)}
                              >
                                <SelectTrigger className="w-full h-9">
                                  <SelectValue placeholder="Selecionar...">
                                    {member.employee?.nome || 'Selecionar...'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="min-w-[360px] bg-popover">
                                  <SelectItem value="none">
                                    <span className="text-muted-foreground italic">Sem funcionário</span>
                                  </SelectItem>
                                  {availableEmployees.map((emp) => {
                                    const hourlyCost = getEmployeeHourlyCost(emp);
                                    return (
                                      <SelectItem key={emp.id} value={emp.id} className="py-2.5">
                                        <div className="flex items-center justify-between w-full gap-3">
                                          <span className="font-medium truncate max-w-[140px]">{emp.nome}</span>
                                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                            {emp.cargo}
                                          </span>
                                          <span className="text-xs font-semibold text-primary whitespace-nowrap flex-shrink-0">
                                            {formatCurrency(hourlyCost)}/h
                                          </span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div>
                                {member.employee ? (
                                  <p className="font-medium">{member.employee.nome}</p>
                                ) : (
                                  <span className="text-muted-foreground italic">Não atribuído</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs">
                            {budgetRate > 0 ? formatCurrency(budgetRate) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {member.employee ? formatCurrency(realCost) : '-'}
                          </TableCell>
                          {months.map((monthNum) => {
                            const plannedHours = getHoursForMonth(member.id, monthNum);
                            const actualHours = getActualHoursForMonth(member.id, monthNum);
                            
                            return (
                              <TableCell key={monthNum} className="text-center p-1">
                                {isInPlanningMode ? (
                                  // Planning mode: only show planned hours
                                  hoursEditMode ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-16 h-8 text-center mx-auto"
                                      value={plannedHours || ''}
                                      onChange={(e) =>
                                        handleHoursChange(
                                          member.id,
                                          monthNum,
                                          Number(e.target.value)
                                        )
                                      }
                                    />
                                  ) : (
                                    <span className="text-sm">
                                      {plannedHours > 0 ? plannedHours : '-'}
                                    </span>
                                  )
                                ) : (
                                  // Execution mode: show Plan | Real
                                  hoursEditMode ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <Input
                                        type="number"
                                        min="0"
                                        className="w-16 h-8 text-center mx-auto"
                                        value={plannedHours || ''}
                                        onChange={(e) =>
                                          handleHoursChange(
                                            member.id,
                                            monthNum,
                                            Number(e.target.value)
                                          )
                                        }
                                      />
                                      {actualHours > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          Real: {actualHours}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1 text-sm">
                                      <span className="text-muted-foreground">
                                        {plannedHours > 0 ? plannedHours : '-'}
                                      </span>
                                      <span className="text-muted-foreground">|</span>
                                      <span className="font-medium">
                                        {actualHours > 0 ? actualHours : '-'}
                                      </span>
                                    </div>
                                  )
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            {isInPlanningMode ? (
                              <span>{memberTotal.plannedHours}h</span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-muted-foreground">{memberTotal.plannedHours}h</span>
                                <span className="text-muted-foreground">|</span>
                                <span className="font-medium">{memberTotal.actualHours}h</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isInPlanningMode ? (
                              <span>{formatCurrency(memberTotal.plannedValue)}</span>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <span className="text-muted-foreground">{formatCurrency(memberTotal.plannedValue)}</span>
                                <span className="text-muted-foreground">|</span>
                                <span className="font-medium">{formatCurrency(memberTotal.actualValue)}</span>
                              </div>
                            )}
                          </TableCell>
                          {isEditable && (
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(member)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-muted z-10 font-semibold">
                        Total
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      {months.map((monthNum) => {
                        const monthTotals = totals.byMonth[monthNum];
                        return (
                          <TableCell key={monthNum} className="text-center">
                            {isInPlanningMode ? (
                              <span className="font-medium">{monthTotals?.plannedHours || 0}</span>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <span className="text-muted-foreground">
                                  {monthTotals?.plannedHours || 0}
                                </span>
                                <span className="text-muted-foreground">|</span>
                                <span className="font-medium">
                                  {monthTotals?.actualHours || 0}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {isInPlanningMode ? (
                          <span className="font-semibold">{totals.totalHours}h</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-muted-foreground">{totals.totalHours}h</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="font-semibold">{totals.totalActualHours}h</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isInPlanningMode ? (
                          <span className="font-semibold">{formatCurrency(totals.totalValue)}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <span className="text-muted-foreground">{formatCurrency(totals.totalValue)}</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="font-semibold">{formatCurrency(totals.totalActualValue)}</span>
                          </div>
                        )}
                      </TableCell>
                      {isEditable && <TableCell />}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground italic text-center py-8">
              Nenhum papel definido. Adicione papéis para planejar a equipe do projeto.
            </p>
          )}
        </CardContent>

        {/* Footer with edit/save buttons */}
        {isEditable && members.length > 0 && (
          <CardFooter className="justify-end border-t pt-4">
            {hoursEditMode ? (
              <Button onClick={handleSaveHours}>
                <Check className="mr-2 h-4 w-4" />
                Salvar Horas
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setHoursEditMode(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar Horas
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Papel</DialogTitle>
            <DialogDescription>
              Defina um papel para o projeto. Você poderá atribuir um funcionário depois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {budgetRoles.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useBudgetRole"
                  checked={useBudgetRole}
                  onCheckedChange={(checked) => {
                    setUseBudgetRole(checked === true);
                    if (!checked) {
                      setNewRole({ ...newRole, budgetRoleId: '', hourlyRate: 0 });
                    }
                  }}
                />
                <Label htmlFor="useBudgetRole" className="text-sm font-normal">
                  Herdar de papel do orçamento
                </Label>
              </div>
            )}

            {useBudgetRole && budgetRoles.length > 0 ? (
              <div className="space-y-2">
                <Label>Papel do Orçamento</Label>
                <Select
                  value={newRole.budgetRoleId}
                  onValueChange={handleBudgetRoleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {budgetRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.role_name} ({role.seniority}) - {formatCurrency(role.hourly_rate)}/h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Papel no Projeto</Label>
                  <Input
                    value={newRole.role}
                    onChange={(e) => setNewRole({ ...newRole, role: e.target.value })}
                    placeholder="Ex: Desenvolvedor Frontend"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Senioridade</Label>
                    <Select
                      value={newRole.seniority}
                      onValueChange={(value) =>
                        setNewRole({ ...newRole, seniority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {SENIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor/Hora (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newRole.hourlyRate || ''}
                      onChange={(e) =>
                        setNewRole({ ...newRole, hourlyRate: Number(e.target.value) })
                      }
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddRole}
              disabled={!newRole.role || addMember.isPending}
            >
              {addMember.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Papel</DialogTitle>
            <DialogDescription>
              Altere os dados do papel no projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingMember?.employee && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{editingMember.employee.nome}</p>
                <p className="text-sm text-muted-foreground">{editingMember.employee.cargo}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Papel no Projeto</Label>
              <Input
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                placeholder="Ex: Desenvolvedor Frontend"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Senioridade</Label>
                <Select
                  value={editForm.seniority}
                  onValueChange={(value) => setEditForm({ ...editForm, seniority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {SENIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor/Hora (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.hourlyRate || ''}
                  onChange={(e) => setEditForm({ ...editForm, hourlyRate: Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateMember}
              disabled={!editForm.role || updateMember.isPending}
            >
              {updateMember.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
