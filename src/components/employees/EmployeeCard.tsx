import { Employee } from '@/hooks/useEmployees';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, Phone, Mail, Crown, UserMinus, Eye } from 'lucide-react';

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
  onViewTermination?: (employee: Employee) => void;
}

const EmployeeCard = ({ employee, onEdit, onDelete, onTerminate, onViewTermination }: EmployeeCardProps) => {
  const isActive = employee.status === 'ativo';
  const hasTermination = !!employee.terminationId;
  const custoTotal = (() => {
    const estimated = employee.totalMonthlyCostEstimated;
    const benefitsFromQuery = employee.totalBenefitsCost || 0;
    const toolsFromQuery = employee.totalToolsCost || 0;
    
    if (estimated > 0) {
      const breakdown = employee.breakdownJson;
      const storedBenefits = breakdown && typeof breakdown === 'object' && 'benefitsAmount' in breakdown
        ? Number((breakdown as any).benefitsAmount) : 0;
      const storedTools = breakdown && typeof breakdown === 'object' && 'toolsAmount' in breakdown
        ? Number((breakdown as any).toolsAmount) : 0;
      return estimated + (benefitsFromQuery - storedBenefits) + (toolsFromQuery - storedTools);
    }
    
    return employee.salarioMensal + employee.beneficios + employee.encargos + benefitsFromQuery + toolsFromQuery;
  })();
  const custoHora = custoTotal / (employee.jornadaMensal || 176);

  return (
    <Card className="group animate-fade-in transition-colors duration-200 hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold text-lg">
              {employee.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{employee.nome}</h3>
                {employee.isGerente && (
                  <Crown className="h-4 w-4 text-secondary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{employee.cargo}</p>
            </div>
          </div>
          
          <Badge 
            variant={employee.status === 'ativo' ? 'default' : 'secondary'}
            className={employee.status === 'ativo' ? 'bg-success text-success-foreground' : ''}
          >
            {employee.status === 'ativo' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{employee.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{employee.telefone}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-muted p-3">
          <div>
            <p className="text-xs text-muted-foreground">Custo/Hora</p>
            <p className="font-semibold text-foreground">R$ {custoHora}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Custo Mensal</p>
            <p className="font-semibold text-foreground">
              R$ {custoTotal.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(employee)}
            className="gap-1"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(employee)}
            className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3 w-3" />
            Excluir
          </Button>
          {isActive && !hasTermination && onTerminate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTerminate(employee)}
              className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <UserMinus className="h-3 w-3" />
              Desligar
            </Button>
          )}
          {hasTermination && onViewTermination && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewTermination(employee)}
              className="gap-1 text-yellow-600 hover:bg-yellow-100"
            >
              <Eye className="h-3 w-3" />
              Ver Desligamento
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
