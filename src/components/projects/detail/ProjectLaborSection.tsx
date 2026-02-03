import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Users, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { useAddProjectMember, useRemoveProjectMember } from '@/hooks/useProjects';
import { useProjectMemberMonths, useUpsertMemberMonth } from '@/hooks/useProjectMemberMonths';

interface ProjectLaborSectionProps {
  projectId: string;
  members: (ProjectMemberDB & {
    employee?: {
      id: string;
      nome: string;
      cargo: string;
      salario_mensal: number;
      beneficios: number;
      encargos: number;
    };
  })[];
  durationMonths: number;
  isEditable: boolean;
  budgetRoles: BudgetRoleWithMonths[];
}

export function ProjectLaborSection({
  projectId,
  members,
  durationMonths,
  isEditable,
  budgetRoles,
}: ProjectLaborSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [useBudgetRole, setUseBudgetRole] = useState(true);
  const [newMember, setNewMember] = useState({
    employeeId: '',
    role: '',
    seniority: 'pleno',
    budgetRoleId: '',
    hourlyRate: 0,
  });

  const { data: employees = [] } = useEmployees();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const upsertMemberMonth = useUpsertMemberMonth();

  const months = useMemo(() => {
    return Array.from({ length: durationMonths }, (_, i) => i + 1);
  }, [durationMonths]);

  const availableEmployees = useMemo(() => {
    return employees.filter((e) => e.status === 'ativo');
  }, [employees]);

  // Get hourly rate from member's own hourly_rate field
  const getHourlyRate = useCallback((member: typeof members[0]): number => {
    return Number((member as any).hourly_rate) || 0;
  }, []);

  const getHoursForMonth = useCallback((memberId: string, monthNumber: number): number => {
    const found = memberMonths.find(
      (mm) => mm.project_member_id === memberId && mm.month_number === monthNumber
    );
    return found?.hours || 0;
  }, [memberMonths]);

  const handleHoursChange = useCallback(
    (memberId: string, monthNumber: number, hours: number) => {
      upsertMemberMonth.mutate({
        projectMemberId: memberId,
        monthNumber,
        hours: hours || 0,
      });
    },
    [upsertMemberMonth]
  );

  // When selecting a budget role, auto-fill role name, seniority and hourly rate
  const handleBudgetRoleChange = (roleId: string) => {
    const role = budgetRoles.find((r) => r.id === roleId);
    if (role) {
      setNewMember({
        ...newMember,
        budgetRoleId: roleId,
        role: role.role_name,
        seniority: role.seniority,
        hourlyRate: role.hourly_rate,
      });
    }
  };

  const handleAddMember = () => {
    if (!newMember.employeeId || !newMember.role) return;
    addMember.mutate(
      {
        projectId,
        employeeId: newMember.employeeId,
        role: newMember.role,
        seniority: newMember.seniority,
        hoursPerMonth: 0,
        budgetRoleId: useBudgetRole && newMember.budgetRoleId ? newMember.budgetRoleId : undefined,
        hourlyRate: newMember.hourlyRate,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setNewMember({ employeeId: '', role: '', seniority: 'pleno', budgetRoleId: '', hourlyRate: 0 });
          setUseBudgetRole(true);
        },
      }
    );
  };

  const handleRemoveMember = (memberId: string) => {
    removeMember.mutate({ id: memberId, projectId });
  };

  // Calculate totals
  const totals = useMemo(() => {
    const byMonth: Record<number, { hours: number; value: number }> = {};
    let totalHours = 0;
    let totalValue = 0;

    months.forEach((m) => {
      byMonth[m] = { hours: 0, value: 0 };
    });

    members.forEach((member) => {
      const hourlyRate = getHourlyRate(member);
      months.forEach((monthNum) => {
        const hours = getHoursForMonth(member.id, monthNum);
        byMonth[monthNum].hours += hours;
        byMonth[monthNum].value += hours * hourlyRate;
        totalHours += hours;
        totalValue += hours * hourlyRate;
      });
    });

    return { byMonth, totalHours, totalValue };
  }, [members, months, getHourlyRate, getHoursForMonth]);

  // Calculate member totals
  const memberTotals = useMemo(() => {
    const result: Record<string, { hours: number; value: number }> = {};
    members.forEach((member) => {
      const hourlyRate = getHourlyRate(member);
      let hours = 0;
      months.forEach((monthNum) => {
        hours += getHoursForMonth(member.id, monthNum);
      });
      result[member.id] = { hours, value: hours * hourlyRate };
    });
    return result;
  }, [members, months, getHourlyRate, getHoursForMonth]);

  // Calculate budget roles summary for reference
  const budgetRolesSummary = useMemo(() => {
    return budgetRoles.map((role) => {
      const totalHours = role.months.reduce((sum, m) => sum + m.hours, 0);
      return {
        ...role,
        totalHours,
        totalValue: totalHours * role.hourly_rate,
      };
    });
  }, [budgetRoles]);

  return (
    <>
      {/* Budget Roles Reference */}
      {budgetRoles.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="h-4 w-4" />
              Papéis do Orçamento (referência)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {budgetRolesSummary.map((role) => (
                <Badge
                  key={role.id}
                  variant="secondary"
                  className="py-1 px-3 text-xs font-normal"
                >
                  {role.role_name} ({role.seniority}) • {formatCurrency(role.hourly_rate)}/h • {role.totalHours}h
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alocação de Equipe
            </CardTitle>
            <CardDescription>
              Defina quem executará cada papel e as horas por mês
            </CardDescription>
          </div>
          {isEditable && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Membro
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
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                        Funcionário
                      </TableHead>
                      <TableHead className="text-right min-w-[100px]">Valor/h</TableHead>
                      {months.map((m) => (
                        <TableHead key={m} className="text-center min-w-[80px]">
                          Mês {m}
                        </TableHead>
                      ))}
                      <TableHead className="text-right min-w-[80px]">Total H</TableHead>
                      <TableHead className="text-right min-w-[120px]">Total R$</TableHead>
                      {isEditable && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => {
                      const hourlyRate = getHourlyRate(member);
                      const memberTotal = memberTotals[member.id] || { hours: 0, value: 0 };

                      return (
                        <TableRow key={member.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            <div>
                              <p>{member.employee?.nome || 'Desconhecido'}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(hourlyRate)}
                          </TableCell>
                          {months.map((monthNum) => (
                            <TableCell key={monthNum} className="text-center p-1">
                              {isEditable ? (
                                <Input
                                  type="number"
                                  min="0"
                                  className="w-16 h-8 text-center mx-auto"
                                  value={getHoursForMonth(member.id, monthNum) || ''}
                                  onChange={(e) =>
                                    handleHoursChange(
                                      member.id,
                                      monthNum,
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              ) : (
                                <span>{getHoursForMonth(member.id, monthNum) || '-'}</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium">
                            {memberTotal.hours}h
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(memberTotal.value)}
                          </TableCell>
                          {isEditable && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={removeMember.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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
                      {months.map((monthNum) => (
                        <TableCell key={monthNum} className="text-center font-medium">
                          {totals.byMonth[monthNum]?.hours || 0}h
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">
                        {totals.totalHours}h
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(totals.totalValue)}
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
              Nenhum membro alocado. {budgetRoles.length > 0 && 'Use os papéis do orçamento como referência.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
            <DialogDescription>
              Selecione um funcionário e defina seu papel no projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Select
                value={newMember.employeeId}
                onValueChange={(value) =>
                  setNewMember({ ...newMember, employeeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome} - {emp.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {budgetRoles.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useBudgetRole"
                  checked={useBudgetRole}
                  onCheckedChange={(checked) => {
                    setUseBudgetRole(checked === true);
                    if (!checked) {
                      setNewMember({ ...newMember, budgetRoleId: '', hourlyRate: 0 });
                    }
                  }}
                />
                <Label htmlFor="useBudgetRole" className="text-sm font-normal">
                  Usar papel do orçamento (herda valor/hora)
                </Label>
              </div>
            )}

            {useBudgetRole && budgetRoles.length > 0 ? (
              <div className="space-y-2">
                <Label>Papel do Orçamento</Label>
                <Select
                  value={newMember.budgetRoleId}
                  onValueChange={handleBudgetRoleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                  <SelectContent>
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
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                    placeholder="Ex: Desenvolvedor Frontend"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Senioridade</Label>
                    <Select
                      value={newMember.seniority}
                      onValueChange={(value) =>
                        setNewMember({ ...newMember, seniority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                      value={newMember.hourlyRate || ''}
                      onChange={(e) =>
                        setNewMember({ ...newMember, hourlyRate: Number(e.target.value) })
                      }
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </>
            )}

            {useBudgetRole && newMember.budgetRoleId && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p><strong>Papel:</strong> {newMember.role}</p>
                <p><strong>Senioridade:</strong> {newMember.seniority}</p>
                <p><strong>Valor/hora:</strong> {formatCurrency(newMember.hourlyRate)}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!newMember.employeeId || !newMember.role || addMember.isPending}
            >
              {addMember.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
