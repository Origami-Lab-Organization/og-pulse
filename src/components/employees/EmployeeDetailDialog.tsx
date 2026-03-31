import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Employee, useEmployeeTools } from '@/hooks/useEmployees';
import { EmployeeToolsTable } from './EmployeeToolsTable';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { formatPhone, formatCPF } from '@/lib/masks';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  CreditCard,
  DollarSign,
  Clock,
  Wrench,
} from 'lucide-react';

interface EmployeeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeeDetailDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeDetailDialogProps) {
  const { data: tools = [] } = useEmployeeTools(employee?.id);

  const totalToolsCost = useMemo(() => {
    return tools.reduce((sum, tool) => sum + Number(tool.monthly_cost), 0);
  }, [tools]);

  const totalMonthlyCost = useMemo(() => {
    if (!employee) return 0;
    return employee.salarioMensal + employee.beneficios + employee.encargos + totalToolsCost;
  }, [employee, totalToolsCost]);

  const hourlyRate = useMemo(() => {
    // 176 hours = 22 days * 8 hours
    return totalMonthlyCost / 176;
  }, [totalMonthlyCost]);

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-xl">{employee.nome}</span>
              <Badge
                variant="outline"
                className={
                  employee.status === 'ativo'
                    ? 'ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'ml-2 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }
              >
                {employee.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </Badge>
              {employee.isGerente && (
                <Badge variant="secondary" className="ml-2">
                  Administrador
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Ferramentas
              {tools.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tools.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{employee.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">
                        {employee.telefone ? formatPhone(employee.telefone) : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cargo</p>
                      <p className="font-medium">{employee.cargo}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">CPF</p>
                      <p className="font-medium">
                        {employee.cpf ? formatCPF(employee.cpf) : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Admissão</p>
                      <p className="font-medium">{formatDate(employee.dataAdmissao)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Salário Mensal</p>
                      <p className="font-medium text-lg">
                        {formatCurrency(employee.salarioMensal)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Benefícios</p>
                      <p className="font-medium text-lg">
                        {formatCurrency(employee.beneficios)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Encargos</p>
                      <p className="font-medium text-lg">
                        {formatCurrency(employee.encargos)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ferramentas</p>
                      <p className="font-medium text-lg">
                        {formatCurrency(totalToolsCost)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Custo Total Mensal</p>
                      <p className="font-bold text-xl text-primary">
                        {formatCurrency(totalMonthlyCost)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Custo/Hora</p>
                      <p className="font-bold text-xl">{formatCurrency(hourlyRate)}</p>
                      <p className="text-xs text-muted-foreground">Base: 176h/mês</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="mt-4">
            <EmployeeToolsTable employeeId={employee.id} employeeName={employee.nome} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}