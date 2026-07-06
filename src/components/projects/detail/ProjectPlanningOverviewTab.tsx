import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, PROJECT_STATUS_LABELS, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjectOKRs } from '@/hooks/useProjectOKRs';
import { useProjectStakeholders } from '@/hooks/useProjectStakeholders';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { cn } from '@/lib/utils';

interface ProjectPlanningOverviewTabProps {
  project: ProjectWithRelations;
}

export function ProjectPlanningOverviewTab({ project }: ProjectPlanningOverviewTabProps) {
  const formatCurrency = useMaskedCurrency();
  const { data: okrs = [] } = useProjectOKRs(project.id);
  const { data: stakeholders = [] } = useProjectStakeholders(project.id);
  const { data: milestones = [] } = useProjectMilestones(project.id);

  const isVentures = project.service_line === 'ventures'
    || project.service?.name?.toLowerCase().includes('ventures') === true;
  const hasValidOKRs = okrs.some(okr => (okr.key_results?.length || 0) > 0);
  const hasStakeholders = stakeholders.length > 0;
  const hasMilestones = milestones.length > 0;
  const hasCosts =
    (project.members?.length || 0) > 0 ||
    (project.suppliers?.length || 0) > 0 ||
    (project.materials?.length || 0) > 0;

  const getPaymentMethodLabel = (method: string) => {
    const found = PAYMENT_METHOD_OPTIONS.find((m) => m.value === method);
    return found?.label || method;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="ol-label text-muted-foreground mb-0.5">Cliente</p>
              <p className="text-sm font-medium text-foreground">
                {project.client?.trading_name || project.client?.company_name || 'Não definido'}
              </p>
            </div>
            <div>
              <p className="ol-label text-muted-foreground mb-0.5">Gerente</p>
              <p className="text-sm font-medium text-foreground">
                {project.manager?.nome || 'Não definido'}
              </p>
            </div>
            <div>
              <p className="ol-label text-muted-foreground mb-0.5">Período</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(project.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                {project.end_date && (
                  <> a {format(new Date(project.end_date), 'dd/MM/yyyy', { locale: ptBR })}</>
                )}
                {project.is_continuous && (
                  <Badge variant="outline" className="ml-2">Contínuo</Badge>
                )}
              </p>
            </div>
            {project.description && (
              <div>
                <p className="ol-label text-muted-foreground mb-0.5">Descrição</p>
                <p className="text-sm text-foreground">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Financeiras */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Informações Financeiras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="ol-label text-muted-foreground mb-1">Valor do Contrato</p>
              <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
                {formatCurrency(project.total_value)}
              </p>
            </div>
            {project.service_line === 'financiamento_inovacao' ? (
              <>
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Prazo de Pagamento</p>
                  <p className="text-sm font-medium text-foreground">
                    Pagamento em {project.due_day} dias após NF
                  </p>
                </div>
                {(project as any).success_fee_percent != null && (
                  <div>
                    <p className="ol-label text-muted-foreground mb-0.5">Percentual de Sucesso</p>
                    <p className="text-sm font-medium text-foreground">
                      {(project as any).success_fee_percent}%
                    </p>
                  </div>
                )}
              </>
            ) : !isVentures ? (
              <>
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Forma de Pagamento</p>
                  <p className="text-sm font-medium text-foreground">
                    {getPaymentMethodLabel(project.payment_method)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {project.installments_count} parcela(s)
                  </p>
                </div>
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Dia de Vencimento</p>
                  <p className="text-sm font-medium text-foreground">Dia {project.due_day}</p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Checklist de Planejamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Checklist de Preparação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <ChecklistItem
              label="Informações básicas"
              completed={!!project.client_id && !!project.manager_id}
            />
            <ChecklistItem
              label="OKRs definidos"
              completed={hasValidOKRs}
              hint={!hasValidOKRs ? 'Vá para a aba Objetivos' : undefined}
            />
            {!isVentures && (
              <ChecklistItem
                label="Stakeholders mapeados"
                completed={hasStakeholders}
                hint={!hasStakeholders ? 'Vá para a aba Stakeholders' : undefined}
              />
            )}
            <ChecklistItem
              label="Equipe alocada"
              completed={(project.members?.length || 0) > 0}
              hint={(project.members?.length || 0) === 0 ? 'Vá para a aba Equipe' : undefined}
            />
            <ChecklistItem
              label="Custos planejados"
              completed={hasCosts}
              hint={!hasCosts ? 'Vá para a aba Custos' : undefined}
            />
            <ChecklistItem
              label="Cronograma definido"
              completed={hasMilestones}
              hint={!hasMilestones ? 'Vá para a aba Roadmap' : undefined}
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
      <div
        className={cn(
          'h-5 w-5 rounded-full flex items-center justify-center shrink-0',
          completed
            ? 'bg-primary-deep text-primary-deep-foreground'
            : 'border-2 border-muted-foreground',
        )}
      >
        {completed && <span className="text-xs leading-none">✓</span>}
      </div>
      <div>
        <p className={cn('text-sm', completed ? 'text-foreground' : 'text-muted-foreground')}>
          {label}
        </p>
        {hint && !completed && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}
