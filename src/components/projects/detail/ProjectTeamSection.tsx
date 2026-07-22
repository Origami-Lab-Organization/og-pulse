import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { ProjectMemberDB, SENIORITY_OPTIONS } from '@/types/project';
import { useAddProjectMember } from '@/hooks/useProjects';
import { useEmployees } from '@/hooks/useEmployees';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProjectTeamSectionProps {
  members: (ProjectMemberDB & {
    employee?: {
      id: string;
      nome: string;
      cargo: string;
      foto_url?: string | null;
    };
  })[];
  projectId: string;
  memberMonths?: { project_member_id: string; hours: number }[];
  timesheets?: { project_member_id: string; hours: number }[];
}

export function ProjectTeamSection({ members, projectId, memberMonths = [], timesheets = [] }: ProjectTeamSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    employeeId: '',
    role: '',
    seniority: 'pleno',
    hoursPerMonth: 40,
  });

  const { data: employees = [] } = useEmployees();
  const addMember = useAddProjectMember();

  const availableEmployees = employees.filter(
    (e) => e.alocaEmProjetos && !members.some((m) => m.employee_id === e.id)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Equipe do Projeto
            </CardTitle>
            <CardDescription>{members.length} membro(s) alocado(s)</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum membro alocado</p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => setAddDialogOpen(true)}
            >
              Adicionar primeiro membro
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {members.map((member) => (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-default">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                        {member.employee?.foto_url ? (
                          <AvatarImage src={member.employee.foto_url} />
                        ) : null}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {member.employee ? getInitials(member.employee.nome) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {member.employee?.nome?.split(' ')[0] || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.role}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const planned = memberMonths
                              .filter(mm => mm.project_member_id === member.id)
                              .reduce((s, mm) => s + mm.hours, 0);
                            const actual = timesheets
                              .filter(t => t.project_member_id === member.id)
                              .reduce((s, t) => s + t.hours, 0);
                            return `${Math.round(planned * 10) / 10}h plan. | ${Math.round(actual * 10) / 10}h real.`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{member.employee?.nome}</p>
                      <p className="text-muted-foreground">{member.role} · {member.seniority}</p>
                      <p className="text-muted-foreground">
                        {Math.round(memberMonths.filter(mm => mm.project_member_id === member.id).reduce((s, mm) => s + mm.hours, 0) * 10) / 10}h planejadas · {Math.round(timesheets.filter(t => t.project_member_id === member.id).reduce((s, t) => s + t.hours, 0) * 10) / 10}h realizadas
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
      </CardContent>

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
                onValueChange={(value) => setNewMember({ ...newMember, employeeId: value })}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Senioridade</label>
                <Select
                  value={newMember.seniority}
                  onValueChange={(value) => setNewMember({ ...newMember, seniority: value })}
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
    </Card>
  );
}
