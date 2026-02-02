import { Users, Truck, Package, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProjectMembersTable } from '@/components/projects/ProjectMembersTable';
import { ProjectSuppliersSection } from '@/components/projects/detail/ProjectSuppliersSection';
import { ProjectMaterialsSection } from '@/components/projects/detail/ProjectMaterialsSection';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useMemo } from 'react';

interface ProjectCostsTabProps {
  project: ProjectWithRelations;
  isEditable: boolean;
}

export function ProjectCostsTab({ project, isEditable }: ProjectCostsTabProps) {
  // Calculate labor costs based on members' hours and employee costs
  const laborCosts = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;
    
    return project.members.reduce((total, member) => {
      const employee = member.employee;
      if (!employee) return total;
      
      // Calculate hourly cost based on total employee cost
      const monthlyCost = Number(employee.salario_mensal) + Number(employee.beneficios) + Number(employee.encargos);
      const hourlyRate = monthlyCost / 176; // Assuming 176 hours/month
      const memberMonthlyCost = hourlyRate * Number(member.hours_per_month);
      
      return total + memberMonthlyCost;
    }, 0);
  }, [project.members]);

  // Calculate supplier costs (sum of monthly values)
  const supplierCosts = useMemo(() => {
    if (!project.suppliers || project.suppliers.length === 0) return 0;
    return project.suppliers.reduce((total, s) => total + Number(s.monthly_value), 0);
  }, [project.suppliers]);

  // Calculate material costs
  const materialCosts = useMemo(() => {
    if (!project.materials || project.materials.length === 0) return 0;
    return project.materials.reduce((total, m) => total + Number(m.value), 0);
  }, [project.materials]);

  const totalCosts = laborCosts + supplierCosts + materialCosts;

  return (
    <div className="space-y-6">
      {isEditable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Modo de Planejamento</AlertTitle>
          <AlertDescription>
            Configure os custos planejados antes de iniciar o projeto. Após alterar o status, esses valores ficarão bloqueados para edição.
          </AlertDescription>
        </Alert>
      )}

      {/* Costs Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mão de Obra</p>
                <p className="text-lg font-semibold">{formatCurrency(laborCosts)}</p>
                <p className="text-xs text-muted-foreground">/mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fornecedores</p>
                <p className="text-lg font-semibold">{formatCurrency(supplierCosts)}</p>
                <p className="text-xs text-muted-foreground">/mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Materiais</p>
                <p className="text-lg font-semibold">{formatCurrency(materialCosts)}</p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-lg font-semibold">{formatCurrency(totalCosts)}</p>
                <p className="text-xs text-muted-foreground">mensal estimado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labor Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mão de Obra
          </CardTitle>
          <CardDescription>
            Alocação de horas da equipe interna para este projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectMembersTable 
            projectId={project.id} 
            members={project.members || []} 
          />
        </CardContent>
      </Card>

      {/* Suppliers Section */}
      <ProjectSuppliersSection 
        projectId={project.id} 
        suppliers={project.suppliers || []}
        isEditable={isEditable}
      />

      {/* Materials Section */}
      <ProjectMaterialsSection 
        projectId={project.id}
        materials={project.materials || []}
        isEditable={isEditable}
      />
    </div>
  );
}
