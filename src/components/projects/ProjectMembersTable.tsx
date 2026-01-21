import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectMemberDB, SENIORITY_OPTIONS } from '@/types/project';
import {
  useAddProjectMember,
  useUpdateProjectMember,
  useRemoveProjectMember,
} from '@/hooks/useProjects';
import { useEmployees } from '@/hooks/useEmployees';
import { Pencil, Trash2, Plus, Check, X, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/formatters';

interface ProjectMembersTableProps {
  members: (ProjectMemberDB & {
    employee?: {
      id: string;
      nome: string;
      cargo: string;
    };
  })[];
  projectId: string;
}

const seniorityLabels: Record<string, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
};

const HOURS_PER_MONTH = 176; // Standard working hours

// Uses employee data from useEmployees which includes totalToolsCost
function getEmployeeHourlyCost(
  employeeId: string,
  employees: { id: string; salarioMensal: number; beneficios: number; encargos: number; totalToolsCost: number }[]
): number {
  const employee = employees.find((e) => e.id === employeeId);
  if (!employee) return 0;
  const totalCost =
    employee.salarioMensal +
    employee.beneficios +
    employee.encargos +
    (employee.totalToolsCost || 0);
  return totalCost / HOURS_PER_MONTH;
}

export function ProjectMembersTable({ members, projectId }: ProjectMembersTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    role: string;
    seniority: string;
    hoursPerMonth: number;
  }>({
    role: '',
    seniority: 'pleno',
    hoursPerMonth: 0,
  });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    employeeId: '',
    role: '',
    seniority: 'pleno',
    hoursPerMonth: 40,
  });

  const { data: employees = [] } = useEmployees();
  const addMember = useAddProjectMember();
  const updateMember = useUpdateProjectMember();
  const removeMember = useRemoveProjectMember();

  // Filter out employees already in the project
  const availableEmployees = employees.filter(
    (e) => !members.some((m) => m.employee_id === e.id)
  );

  // Calculate total project cost using employee data with tools
  const totalMonthlyCost = useMemo(() => {
    return members.reduce((acc, member) => {
      const hourlyCost = getEmployeeHourlyCost(member.employee_id, employees);
      return acc + hourlyCost * Number(member.hours_per_month || 0);
    }, 0);
  }, [members, employees]);

  const startEdit = (member: ProjectMemberDB) => {
    setEditingId(member.id);
    setEditData({
      role: member.role,
      seniority: member.seniority,
      hoursPerMonth: Number(member.hours_per_month) || 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ role: '', seniority: 'pleno', hoursPerMonth: 0 });
  };

  const saveEdit = (id: string) => {
    updateMember.mutate(
      {
        id,
        projectId,
        updates: {
          role: editData.role,
          seniority: editData.seniority,
          hours_per_month: editData.hoursPerMonth,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
        },
      }
    );
  };

  const handleAddMember = () => {
    if (!newMember.employeeId || !newMember.role) return;

    addMember.mutate(
      {
        projectId,
        employeeId: newMember.employeeId,
        role: newMember.role,
        seniority: newMember.seniority,
        hoursPerMonth: newMember.hoursPerMonth,
      },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setNewMember({ employeeId: '', role: '', seniority: 'pleno', hoursPerMonth: 40 });
        },
      }
    );
  };

  const handleRemoveMember = (id: string) => {
    removeMember.mutate({ id, projectId });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Membros do Time ({members.length})</h3>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

      {/* Cost Summary Card */}
      {members.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Custo Mensal da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalMonthlyCost)}
            </p>
            <p className="text-sm text-muted-foreground">
              Baseado nas horas alocadas e custo/hora de cada membro
            </p>
          </CardContent>
        </Card>
      )}

      {members.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          Nenhum membro adicionado ao projeto ainda.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Papel no Projeto</TableHead>
                <TableHead>Senioridade</TableHead>
                <TableHead className="text-right">Horas/Mês</TableHead>
                <TableHead className="text-right">Custo/Hora</TableHead>
                <TableHead className="text-right">Custo/Mês</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {members.map((member) => {
                const hourlyCost = getEmployeeHourlyCost(member.employee_id, employees);
                const monthlyCost = hourlyCost * Number(member.hours_per_month || 0);

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {member.employee ? getInitials(member.employee.nome) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.employee?.nome || 'Desconhecido'}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.employee?.cargo || ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === member.id ? (
                        <Input
                          value={editData.role}
                          onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                          placeholder="Ex: Desenvolvedor"
                          className="w-[180px]"
                        />
                      ) : (
                        member.role
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === member.id ? (
                        <Select
                          value={editData.seniority}
                          onValueChange={(value) =>
                            setEditData({ ...editData, seniority: value })
                          }
                        >
                          <SelectTrigger className="w-[120px]">
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
                      ) : (
                        <Badge variant="secondary">
                          {seniorityLabels[member.seniority] || member.seniority}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === member.id ? (
                        <Input
                          type="number"
                          value={editData.hoursPerMonth}
                          onChange={(e) =>
                            setEditData({ ...editData, hoursPerMonth: Number(e.target.value) })
                          }
                          className="w-[80px] text-right"
                          min="0"
                        />
                      ) : (
                        <span className="font-medium">{member.hours_per_month || 0}h</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(hourlyCost)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(monthlyCost)}
                    </TableCell>
                    <TableCell>
                      {editingId === member.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => saveEdit(member.id)}
                            disabled={updateMember.isPending}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={cancelEdit}
                            disabled={updateMember.isPending}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removeMember.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro ao Projeto</DialogTitle>
            <DialogDescription>
              Selecione um funcionário e defina seu papel e alocação no projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Funcionário</label>
              <Select
                value={newMember.employeeId}
                onValueChange={(value) =>
                  setNewMember({ ...newMember, employeeId: value })
                }
              >
                <SelectTrigger className="mt-1">
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

            <div>
              <label className="text-sm font-medium">Papel no Projeto</label>
              <Input
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                placeholder="Ex: Desenvolvedor Frontend, Designer UI..."
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Senioridade</label>
                <Select
                  value={newMember.seniority}
                  onValueChange={(value) =>
                    setNewMember({ ...newMember, seniority: value })
                  }
                >
                  <SelectTrigger className="mt-1">
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

              <div>
                <label className="text-sm font-medium">Horas/Mês</label>
                <Input
                  type="number"
                  value={newMember.hoursPerMonth}
                  onChange={(e) =>
                    setNewMember({ ...newMember, hoursPerMonth: Number(e.target.value) })
                  }
                  min="0"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
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
    </div>
  );
}
