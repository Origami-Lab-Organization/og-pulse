import { useMemo, useState } from 'react';
import { Users, Truck, Package, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ProjectLaborSection } from '@/components/projects/detail/ProjectLaborSection';
import { ProjectSuppliersSection } from '@/components/projects/detail/ProjectSuppliersSection';
import { ProjectMaterialsSection } from '@/components/projects/detail/ProjectMaterialsSection';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useUpdateProject } from '@/hooks/useProjects';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';

interface ProjectCostsTabProps {
  project: ProjectWithRelations;
  isEditable: boolean;
}

export function ProjectCostsTab({ project, isEditable }: ProjectCostsTabProps) {
  const updateProject = useUpdateProject();
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationValue, setDurationValue] = useState(project.duration_months || 1);

  const durationMonths = project.duration_months || 1;

  // Get member and supplier IDs for fetching monthly data
  const memberIds = useMemo(() => (project.members || []).map((m) => m.id), [project.members]);
  const supplierIds = useMemo(() => (project.suppliers || []).map((s) => s.id), [project.suppliers]);

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);

  // Calculate labor costs from monthly hours
  const laborCosts = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    let total = 0;
    project.members.forEach((member) => {
      const employee = member.employee;
      if (!employee) return;

      const monthlyCost = Number(employee.salario_mensal) + Number(employee.beneficios) + Number(employee.encargos);
      const hourlyRate = monthlyCost / 176;

      // Sum hours across all months
      const memberHours = memberMonths
        .filter((mm) => mm.project_member_id === member.id)
        .reduce((sum, mm) => sum + Number(mm.hours), 0);

      total += hourlyRate * memberHours;
    });

    return total;
  }, [project.members, memberMonths]);

  // Calculate supplier costs from monthly values
  const supplierCosts = useMemo(() => {
    return supplierMonths.reduce((sum, sm) => sum + Number(sm.value), 0);
  }, [supplierMonths]);

  // Calculate material costs
  const materialCosts = useMemo(() => {
    if (!project.materials || project.materials.length === 0) return 0;
    return project.materials.reduce((total, m) => total + Number(m.value), 0);
  }, [project.materials]);

  const totalCosts = laborCosts + supplierCosts + materialCosts;

  const handleSaveDuration = () => {
    if (durationValue < 1) return;
    updateProject.mutate(
      {
        id: project.id,
        updates: {
          durationMonths: durationValue,
        },
      },
      {
        onSuccess: () => setEditingDuration(false),
      }
    );
  };

  return (
    <div className="space-y-6">
      {isEditable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Modo de Planejamento</AlertTitle>
          <AlertDescription>
            Configure os custos planejados mês a mês antes de iniciar o projeto.
          </AlertDescription>
        </Alert>
      )}

      {/* Duration Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Configuração do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="duration">Duração do Projeto (meses):</Label>
            {editingDuration ? (
              <div className="flex items-center gap-2">
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="60"
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                  className="w-20"
                />
                <Button size="sm" onClick={handleSaveDuration} disabled={updateProject.isPending}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingDuration(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-semibold">{durationMonths} {durationMonths === 1 ? 'mês' : 'meses'}</span>
                {isEditable && (
                  <Button size="sm" variant="outline" onClick={() => setEditingDuration(true)}>
                    Alterar
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                <p className="text-xs text-muted-foreground">total projeto</p>
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
                <p className="text-xs text-muted-foreground">total projeto</p>
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
                <p className="text-xs text-muted-foreground">total projeto</p>
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
                <p className="text-xs text-muted-foreground">todo o projeto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labor Section */}
      <ProjectLaborSection
        projectId={project.id}
        members={project.members || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
      />

      {/* Suppliers Section */}
      <ProjectSuppliersSection
        projectId={project.id}
        suppliers={project.suppliers || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
      />

      {/* Materials Section */}
      <ProjectMaterialsSection
        projectId={project.id}
        materials={project.materials || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
      />
    </div>
  );
}
