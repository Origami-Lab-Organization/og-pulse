import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { differenceInMonths, parseISO, startOfMonth } from 'date-fns';
import { Plus, Trash2, Users, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
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
import { formatCurrency, getProjectMonthLabel } from '@/lib/formatters';
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
  serviceLine?: string | null;
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
// Note: MONTH_LABELS kept for financiamento mode, getProjectMonthLabel used for project months

export function ProjectLaborSection({
  projectId,
  members,
  durationMonths,
  isEditable,
  budgetRoles,
  timesheets = [],
  projectStartDate,
  serviceLine,
}: ProjectLaborSectionProps) {
  const isFinanciamento = serviceLine === 'financiamento_inovacao';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [useBudgetRole, setUseBudgetRole] = useState(budgetRoles.length > 0);
  const [newRole, setNewRole] = useState({
    role: '',
    seniority: 'pleno',
    budgetRoleId: '',
    hourlyRate: 0,
    employeeId: '',
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

  // Hours edit mode per member - stores the member ID being edited (null = none)
  const [editingHoursMemberId, setEditingHoursMemberId] = useState<string | null>(null);

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
  // If no employee is assigned, use the member's hourly_rate (from budget) as cost
  const getRealHourlyCost = useCallback((member: typeof members[0]): number => {
    if (member.employee) {
      const totalCost = member.employee.total_monthly_cost_estimated || 0;
      const workHours = member.employee.jornada_mensal || 168;
      return workHours > 0 ? totalCost / workHours : 0;
    }
    // No employee: use hourly_rate as cost
    return Number((member as any).hourly_rate) || 0;
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

  // Cancel hours edit for a member
  const handleCancelHoursEdit = useCallback((memberId: string) => {
    // Clear any pending updates for this member
    Object.keys(pendingUpdates.current).forEach((key) => {
      if (key.startsWith(memberId)) {
        clearTimeout(pendingUpdates.current[key]);
        delete pendingUpdates.current[key];
      }
    });
    
    // Restore original values from memberMonths for this member
    const restoredHours: Record<string, number> = {};
    memberMonths.forEach((mm) => {
      if (mm.project_member_id === memberId) {
        const key = `${mm.project_member_id}-${mm.month_number}`;
        restoredHours[key] = mm.hours;
      }
    });
    setLocalHours((prev) => ({ ...prev, ...restoredHours }));
    setEditingHoursMemberId(null);
  }, [memberMonths]);

  // Save hours for a specific member and exit edit mode
  const handleSaveHoursForMember = useCallback((memberId: string) => {
    // Clear pending timeouts for this member
    Object.keys(pendingUpdates.current).forEach((key) => {
      if (key.startsWith(memberId)) {
        clearTimeout(pendingUpdates.current[key]);
        delete pendingUpdates.current[key];
      }
    });
    if (Object.keys(pendingUpdates.current).length === 0) {
      hasPendingEdits.current = false;
    }
    setEditingHoursMemberId(null);
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
    if (isFinanciamento) {
      // Simplified mode: employee is required, role auto-filled from cargo
      if (!newRole.employeeId) return;
      const selectedEmp = availableEmployees.find(e => e.id === newRole.employeeId);
      if (!selectedEmp) return;

      addMember.mutate(
        {
          projectId,
          employeeId: newRole.employeeId,
          role: selectedEmp.cargo || 'Membro',
          seniority: 'pleno',
          hoursPerMonth: 0,
          hourlyRate: 0,
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setNewRole({ role: '', seniority: 'pleno', budgetRoleId: '', hourlyRate: 0, employeeId: '' });
          },
        }
      );
      return;
    }

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
          setNewRole({ role: '', seniority: 'pleno', budgetRoleId: '', hourlyRate: 0, employeeId: '' });
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
      result[ts.project_member_id] = Math.round((result[ts.project_member_id] + Number(ts.hours)) * 10) / 10;
    });
    return result;
  }, [timesheets]);

  // Calculate ACTUAL hours from timesheets per member AND per month
  const actualHoursByMemberAndMonth = useMemo(() => {
    const result: Record<string, Record<number, number>> = {};
    const startDate = parseISO(projectStartDate);
    
    timesheets.forEach((ts) => {
      const workDate = parseISO(ts.work_date);
      const monthNumber = differenceInMonths(startOfMonth(workDate), startOfMonth(startDate)) + 1;
      
      if (monthNumber < 1 || monthNumber > durationMonths) return; // Skip if outside project duration
      
      if (!result[ts.project_member_id]) {
        result[ts.project_member_id] = {};
      }
      if (!result[ts.project_member_id][monthNumber]) {
        result[ts.project_member_id][monthNumber] = 0;
      }
      result[ts.project_member_id][monthNumber] = Math.round((result[ts.project_member_id][monthNumber] + Number(ts.hours)) * 10) / 10;
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
        
        byMonth[monthNum].plannedHours = Math.round((byMonth[monthNum].plannedHours + plannedHours) * 10) / 10;
        byMonth[monthNum].plannedValue += plannedHours * realCost;
        byMonth[monthNum].actualHours = Math.round((byMonth[monthNum].actualHours + actualHours) * 10) / 10;
        byMonth[monthNum].actualValue += actualHours * realCost;
        
        totalHours = Math.round((totalHours + plannedHours) * 10) / 10;
        totalValue += plannedHours * realCost;
        totalActualHours = Math.round((totalActualHours + actualHours) * 10) / 10;
        totalActualValue += actualHours * realCost;
      });
    });

    return { byMonth, totalHours, totalValue, totalActualHours, totalActualValue };
  }, [members, months, getRealHourlyCost, getHoursForMonth, getActualHoursForMonth]);


  // Calculate member totals using real employee cost (PLANNED + ACTUAL)
  const memberTotals = useMemo(() => {
    const result: Record<string, { plannedHours: number; plannedValue: number; actualHours: number; actualValue: number }> = {};
    members.forEach((member) => {
      const realCost = getRealHourlyCost(member);
      let plannedHours = 0;
      months.forEach((monthNum) => {
        plannedHours = Math.round((plannedHours + getHoursForMonth(member.id, monthNum)) * 10) / 10;
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

  // Calculate budget data per member (seniority + hourly rate only, for display)
  const budgetDataByMember = useMemo(() => {
    const result: Record<string, {
      budgetSeniority: string;
      budgetHourlyRate: number;
    }> = {};
    
    members.forEach(member => {
      if (member.budget_role_id) {
        const budgetRole = budgetRoles.find(r => r.id === member.budget_role_id);
        if (budgetRole) {
          result[member.id] = {
            budgetSeniority: budgetRole.seniority,
            budgetHourlyRate: budgetRole.hourly_rate,
          };
        }
      }
      if (!result[member.id]) {
        result[member.id] = {
          budgetSeniority: '',
          budgetHourlyRate: 0,
        };
      }
    });
    
    return result;
  }, [members, budgetRoles]);

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
              {isFinanciamento 
                ? 'Selecione os funcionários e defina as horas por mês'
                : 'Defina os papéis do projeto e atribua funcionários'}
            </CardDescription>
          </div>
          {isEditable && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {isFinanciamento ? 'Adicionar Membro' : 'Adicionar Papel'}
            </Button>
          )}
        </CardHeader>
        <CardContent>

          {members.length > 0 ? (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[220px]">
                        Funcionário
                      </TableHead>
                       
                      {!isFinanciamento && (
                        <TableHead className="text-right min-w-[100px]">R$/h</TableHead>
                      )}
                      {months.map((m) => (
                        <TableHead key={m} className="text-center min-w-[80px]">
                          <div className="flex flex-col">
                            <span>{isFinanciamento ? MONTH_LABELS[(m - 1) % 12] : getProjectMonthLabel(m, projectStartDate)}</span>
                            {!isInPlanningMode && (
                              <span className="text-xs font-normal text-muted-foreground">Plan | Real</span>
                            )}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[100px]">
                        <div className="flex flex-col">
                          <span>Horas</span>
                          {!isInPlanningMode && (
                            <span className="text-xs font-normal text-muted-foreground">Plan | Real</span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-center min-w-[130px]">
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
                      const budgetData = budgetDataByMember[member.id];
                      const realCost = getRealHourlyCost(member);
                      const memberTotal = memberTotals[member.id] || { plannedHours: 0, plannedValue: 0, actualHours: 0, actualValue: 0 };
                      const employeeSeniority = member.employee 
                        ? SENIORITY_OPTIONS.find(s => s.value === member.seniority)?.label 
                        : null;
                      const budgetSeniorityLabel = SENIORITY_OPTIONS.find(
                        s => s.value === budgetData.budgetSeniority
                      )?.label || budgetData.budgetSeniority;

                      return (
                        <TableRow key={member.id}>
                          {/* Column 1: Employee + Role */}
                          <TableCell className="sticky left-0 bg-background z-10 p-2 min-w-[220px]">
                            <div className="flex flex-col gap-1">
                              {isEditable ? (
                                <Select
                                  value={member.employee_id || ''}
                                  onValueChange={(value) => handleAssignEmployee(member.id, value || null)}
                                >
                                  <SelectTrigger className="w-full h-9">
                                    <SelectValue placeholder="Selecionar funcionário">
                                      {member.employee?.nome || 'Selecionar funcionário'}
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
                                <span className="font-medium">
                                  {member.employee?.nome || <span className="text-muted-foreground italic">Não atribuído</span>}
                                </span>
                              )}
                              {!isFinanciamento && (
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {member.role}{budgetSeniorityLabel ? ` ${budgetSeniorityLabel}` : ''}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          
                          
                          {/* Column 3: R$/h */}
                          {!isFinanciamento && (
                            <TableCell className="text-right p-2">
                              <div className="flex flex-col gap-0.5 items-end">
                                <span className="font-medium">
                                  {formatCurrency(realCost)}
                                </span>
                                {!member.employee && (
                                  <span className="text-xs text-muted-foreground italic">
                                    (orçado)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          
                          {/* Month columns */}
                          {months.map((monthNum) => {
                            const plannedHours = getHoursForMonth(member.id, monthNum);
                            const actualHours = getActualHoursForMonth(member.id, monthNum);
                            
                            
                            return (
                              <TableCell key={monthNum} className="text-center p-1">
                                <div className="flex flex-col gap-0.5 items-center">
                                  {isInPlanningMode ? (
                                    // Planning mode: only show planned hours
                                    editingHoursMemberId === member.id ? (
                                      <Input
                                        type="number"
                                        min="0"
                                        step={0.1}
                                        className="w-16 h-8 text-center mx-auto"
                                        value={plannedHours || ''}
                                        onChange={(e) =>
                                          handleHoursChange(
                                            member.id,
                                            monthNum,
                                            Math.round((Number(e.target.value) || 0) * 10) / 10
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
                                    editingHoursMemberId === member.id ? (
                                      <>
                                        <Input
                                          type="number"
                                          min="0"
                                          step={0.1}
                                          className="w-16 h-8 text-center mx-auto"
                                          value={plannedHours || ''}
                                          onChange={(e) =>
                                            handleHoursChange(
                                              member.id,
                                              monthNum,
                                              Math.round((Number(e.target.value) || 0) * 10) / 10
                                            )
                                          }
                                        />
                                        {actualHours > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            Real: {Math.round(actualHours * 10) / 10}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1 text-sm">
                                        <span className="text-muted-foreground">
                                          {plannedHours > 0 ? Math.round(plannedHours * 10) / 10 : '-'}
                                        </span>
                                        <span className="text-muted-foreground">|</span>
                                        <span className="font-medium">
                                          {actualHours > 0 ? Math.round(actualHours * 10) / 10 : '-'}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                          
                          {/* Total Hours column */}
                          <TableCell className="text-center p-2">
                            <div className="flex flex-col gap-0.5 items-center">
                              {isInPlanningMode ? (
                                <span className="font-medium">{Math.round(memberTotal.plannedHours * 10) / 10}h</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-muted-foreground">{Math.round(memberTotal.plannedHours * 10) / 10}h</span>
                                  <span className="text-muted-foreground">|</span>
                                  <span className="font-medium">{Math.round(memberTotal.actualHours * 10) / 10}h</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Total Cost column */}
                          <TableCell className="text-center p-2">
                            <div className="flex flex-col gap-0.5 items-center">
                              {isInPlanningMode ? (
                                <span className="font-medium">{formatCurrency(memberTotal.plannedValue)}</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1 text-sm">
                                  <span className="text-muted-foreground">{formatCurrency(memberTotal.plannedValue)}</span>
                                  <span className="text-muted-foreground">|</span>
                                  <span className="font-medium">{formatCurrency(memberTotal.actualValue)}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Actions column */}
                          {isEditable && (
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {editingHoursMemberId === member.id ? (
                                  // Save/Cancel mode
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleSaveHoursForMember(member.id)}
                                      title="Salvar"
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCancelHoursEdit(member.id)}
                                      title="Cancelar"
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                ) : (
                                  // Edit/Delete mode
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingHoursMemberId(member.id)}
                                      title="Editar Horas"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveMember(member.id)}
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
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
                      {!isFinanciamento && <TableCell />}
                      {months.map((monthNum) => {
                        const monthTotals = totals.byMonth[monthNum];
                        return (
                          <TableCell key={monthNum} className="text-center">
                            <div className="flex flex-col gap-0.5 items-center">
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
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          {isInPlanningMode ? (
                            <span className="font-semibold">{totals.totalHours}h</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-muted-foreground">{totals.totalHours}h</span>
                              <span className="text-muted-foreground">|</span>
                              <span className="font-semibold">{totals.totalActualHours}h</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          {isInPlanningMode ? (
                            <span className="font-semibold">{formatCurrency(totals.totalValue)}</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <span className="text-muted-foreground">{formatCurrency(totals.totalValue)}</span>
                              <span className="text-muted-foreground">|</span>
                              <span className="font-semibold">{formatCurrency(totals.totalActualValue)}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {isEditable && (
                        <TableCell />
                      )}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground italic text-center py-8">
              {isFinanciamento 
                ? 'Nenhum membro alocado. Adicione membros para planejar as horas do projeto.'
                : 'Nenhum papel definido. Adicione papéis para planejar a equipe do projeto.'}
            </p>
          )}
        </CardContent>

      </Card>

      {/* Add Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isFinanciamento ? 'Adicionar Membro' : 'Adicionar Papel'}</DialogTitle>
            <DialogDescription>
              {isFinanciamento 
                ? 'Selecione o funcionário que participará do projeto.'
                : 'Defina um papel para o projeto. Você poderá atribuir um funcionário depois.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isFinanciamento ? (
              <div className="space-y-2">
                <Label>Funcionário</Label>
                <Select
                  value={newRole.employeeId}
                  onValueChange={(value) => setNewRole({ ...newRole, employeeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funcionário" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {availableEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nome} - {emp.cargo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
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
                        <CurrencyInput
                          value={newRole.hourlyRate}
                          onValueChange={(v) => setNewRole({ ...newRole, hourlyRate: v })}
                          showPrefix
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddRole}
              disabled={(isFinanciamento ? !newRole.employeeId : !newRole.role) || addMember.isPending}
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

            {!isFinanciamento && (
              <div className="space-y-2">
                <Label>Papel no Projeto</Label>
                <Input
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  placeholder="Ex: Desenvolvedor Frontend"
                />
              </div>
            )}

            {!isFinanciamento && (
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
                  <CurrencyInput
                    value={editForm.hourlyRate}
                    onValueChange={(v) => setEditForm({ ...editForm, hourlyRate: v })}
                    showPrefix
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateMember}
              disabled={(!isFinanciamento && !editForm.role) || updateMember.isPending}
            >
              {updateMember.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
