import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ProjectMemberDB, SENIORITY_OPTIONS, ProjectMemberMonthDB } from '@/types/project';
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
}

const HOURS_PER_MONTH = 176;

export function ProjectLaborSection({
  projectId,
  members,
  durationMonths,
  isEditable,
}: ProjectLaborSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    employeeId: '',
    role: '',
    seniority: 'pleno',
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
    return employees.filter((e) => !members.some((m) => m.employee_id === e.id));
  }, [employees, members]);

  const getHourlyRate = useCallback((employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return 0;
    const totalCost = emp.salarioMensal + emp.beneficios + emp.encargos + (emp.totalToolsCost || 0);
    return totalCost / HOURS_PER_MONTH;
  }, [employees]);

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

  const handleAddMember = () => {
    if (!newMember.employeeId || !newMember.role) return;
    addMember.mutate(
      {
        projectId,
        employeeId: newMember.employeeId,
        role: newMember.role,
        seniority: newMember.seniority,
        hoursPerMonth: 0,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setNewMember({ employeeId: '', role: '', seniority: 'pleno' });
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
      const hourlyRate = getHourlyRate(member.employee_id);
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
      const hourlyRate = getHourlyRate(member.employee_id);
      let hours = 0;
      months.forEach((monthNum) => {
        hours += getHoursForMonth(member.id, monthNum);
      });
      result[member.id] = { hours, value: hours * hourlyRate };
    });
    return result;
  }, [members, months, getHourlyRate, getHoursForMonth]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mão de Obra
            </CardTitle>
            <CardDescription>
              Alocação mensal de horas da equipe interna
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
                      const hourlyRate = getHourlyRate(member.employee_id);
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
              Nenhum membro alocado.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
            <DialogDescription>
              Selecione um funcionário para alocar no projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Funcionário</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Papel no Projeto</label>
              <Input
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                placeholder="Ex: Desenvolvedor Frontend"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Senioridade</label>
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
