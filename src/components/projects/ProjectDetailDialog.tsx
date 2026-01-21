import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ProjectWithRelations,
  PROJECT_STATUS_LABELS,
  ProjectStatus,
} from '@/types/project';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ProjectMembersTable } from './ProjectMembersTable';
import { ProjectInstallmentsTable } from './ProjectInstallmentsTable';
import {
  Building2,
  User,
  Calendar,
  DollarSign,
  FileText,
  Users,
  CreditCard,
} from 'lucide-react';

interface ProjectDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithRelations | null;
}

const statusColors: Record<ProjectStatus, string> = {
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const paymentMethodLabels: Record<string, string> = {
  mensal: 'Mensal',
  por_entrega: 'Por Entrega',
  unico: 'Pagamento Único',
  personalizado: 'Personalizado',
};

export function ProjectDetailDialog({
  open,
  onOpenChange,
  project,
}: ProjectDetailDialogProps) {
  if (!project) return null;

  const paidInstallments = project.installments?.filter((i) => i.status === 'received') || [];
  const pendingValue =
    (project.installments?.filter((i) => i.status !== 'received') || []).reduce(
      (acc, i) => acc + Number(i.value),
      0
    );
  const paidValue = paidInstallments.reduce((acc, i) => acc + Number(i.value), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{project.name}</DialogTitle>
            <Badge className={statusColors[project.status]} variant="outline">
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="team">
              Time ({project.members?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="financial">
              Financeiro ({project.installments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{project.client?.company_name}</p>
                  {project.client?.trading_name && (
                    <p className="text-sm text-muted-foreground">
                      {project.client.trading_name}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Gerente do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{project.manager?.nome}</p>
                  {project.manager?.cargo && (
                    <p className="text-sm text-muted-foreground">{project.manager.cargo}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {formatDate(project.start_date)} - {project.is_continuous ? 'Contínuo' : formatDate(project.end_date)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Valor Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg">
                    {formatCurrency(Number(project.total_value))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Forma de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {paymentMethodLabels[project.payment_method] || project.payment_method}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.installments_count} parcela(s), venc. dia {project.due_day}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">
                    Valor Recebido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg text-green-600">
                    {formatCurrency(paidValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paidInstallments.length} parcela(s) paga(s)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-600">
                    Valor Pendente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg text-orange-600">
                    {formatCurrency(pendingValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(project.installments?.length || 0) - paidInstallments.length} parcela(s)
                    pendente(s)
                  </p>
                </CardContent>
              </Card>
            </div>

            {project.contract_url && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={project.contract_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Ver Contrato
                  </a>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <ProjectMembersTable
              members={project.members || []}
              projectId={project.id}
            />
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <ProjectInstallmentsTable
              installments={project.installments || []}
              projectId={project.id}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
