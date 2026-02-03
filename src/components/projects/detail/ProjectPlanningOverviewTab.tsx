import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, PROJECT_STATUS_LABELS, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  User, 
  FileText,
  Clock,
  CreditCard
} from 'lucide-react';

interface ProjectPlanningOverviewTabProps {
  project: ProjectWithRelations;
}

export function ProjectPlanningOverviewTab({ project }: ProjectPlanningOverviewTabProps) {
  const getPaymentMethodLabel = (method: string) => {
    const found = PAYMENT_METHOD_OPTIONS.find((m) => m.value === method);
    return found?.label || method;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">
                  {project.client?.trading_name || project.client?.company_name || 'Não definido'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Gerente do Projeto</p>
                <p className="font-medium">{project.manager?.nome || 'Não definido'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium">
                  {format(new Date(project.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  {project.end_date && (
                    <> a {format(new Date(project.end_date), 'dd/MM/yyyy', { locale: ptBR })}</>
                  )}
                  {project.is_continuous && <Badge variant="outline" className="ml-2">Contínuo</Badge>}
                </p>
              </div>
            </div>

            {project.description && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="text-sm">{project.description}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Financeiras */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações Financeiras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total do Contrato</p>
                <p className="text-2xl font-bold">{formatCurrency(project.total_value)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                <p className="font-medium">{getPaymentMethodLabel(project.payment_method)}</p>
                <p className="text-sm text-muted-foreground">
                  {project.installments_count} parcela(s)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Dia de Vencimento</p>
                <p className="font-medium">Dia {project.due_day}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status do Planejamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <p className="text-sm text-muted-foreground">
              O projeto está em fase de planejamento. Complete os OKRs, stakeholders, custos e cronograma antes de iniciar a execução.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Checklist de Planejamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist de Preparação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <ChecklistItem 
              label="Informações básicas" 
              completed={!!project.client_id && !!project.manager_id} 
            />
            <ChecklistItem 
              label="OKRs definidos" 
              completed={false}
              hint="Vá para a aba OKRs" 
            />
            <ChecklistItem 
              label="Stakeholders mapeados" 
              completed={false}
              hint="Vá para a aba Stakeholders" 
            />
            <ChecklistItem 
              label="Equipe alocada" 
              completed={(project.members?.length || 0) > 0} 
            />
            <ChecklistItem 
              label="Custos planejados" 
              completed={false}
              hint="Vá para a aba Custos" 
            />
            <ChecklistItem 
              label="Cronograma definido" 
              completed={false}
              hint="Vá para a aba Cronograma" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, completed, hint }: { label: string; completed: boolean; hint?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
        completed ? 'bg-green-500 text-white' : 'border-2 border-muted-foreground'
      }`}>
        {completed && <span className="text-xs">✓</span>}
      </div>
      <div>
        <p className={`text-sm ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </p>
        {hint && !completed && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}
