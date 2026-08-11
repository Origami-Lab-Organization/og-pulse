import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Check, ChevronRight, Building2, Calendar,
  DollarSign, User, CreditCard, Clock, AlertTriangle, Target,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ProjectWithRelations, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { OKR_STATUS_LABELS } from '@/types/projectOkr';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { useProjectOKRs } from '@/hooks/useProjectOKRs';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useProjectAllocations } from '@/hooks/useProjectRoles';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface ProjectPlanningOverviewTabProps {
  project: ProjectWithRelations;
  canManageProject?: boolean;
  onNavigateToTab?: (tab: string) => void;
}

export function ProjectPlanningOverviewTab({
  project,
  canManageProject = false,
  onNavigateToTab,
}: ProjectPlanningOverviewTabProps) {
  const formatCurrency = useMaskedCurrency();
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [executionDate, setExecutionDate] = useState(todayStr);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { data: okrs = [] } = useProjectOKRs(project.id);
  const { data: milestones = [] } = useProjectMilestones(project.id);
  // Fonte canônica de equipe é project_role_allocations (ADR-0006), não project.members.
  const { data: allocations = [] } = useProjectAllocations(project.id, false);

  const installments = project.installments || [];
  const isPlanning = project.portfolio_stage === 'planning';
  const isVentures =
    project.service_line === 'ventures' ||
    project.service?.name?.toLowerCase().includes('ventures') === true;

  const clientName =
    project.client?.trading_name || project.client?.company_name || '';
  const gpName = project.manager?.nome || '';
  const membersCount = allocations.filter((a) => a.totalHours > 0).length;
  // useProjectOKRs já ordena por created_at asc — o principal é o primeiro criado.
  const primaryOkr = okrs[0];
  const primaryKeyResults = primaryOkr?.key_results ?? [];

  const checks = [
    !!project.client_id && !!project.manager_id,
    okrs.some((o) => (o.key_results?.length || 0) > 0),
    membersCount > 0,
    milestones.length > 0,
    installments.length > 0,
  ];
  const completedCount = checks.filter(Boolean).length;
  const totalItems = 5;
  const allDone = completedCount === totalItems;
  const progressPct = (completedCount / totalItems) * 100;

  const checklistItems = [
    {
      label: 'Cliente e GP definidos',
      subtitle: checks[0]
        ? `${clientName} · ${gpName}`
        : 'Defina o cliente e o gerente do projeto',
      completed: checks[0],
      tab: 'overview',
    },
    {
      label: 'Pelo menos 1 objetivo com 1 KR',
      subtitle: `${okrs.length} objetivo${okrs.length !== 1 ? 's' : ''}`,
      completed: checks[1],
      tab: 'okrs',
    },
    {
      label: 'Pelo menos 1 membro com horas alocadas',
      subtitle: `${membersCount} pessoa${membersCount !== 1 ? 's' : ''}`,
      completed: checks[2],
      tab: 'team',
    },
    {
      label: 'Pelo menos 1 marco no roadmap',
      subtitle: `${milestones.length} marco${milestones.length !== 1 ? 's' : ''}`,
      completed: checks[3],
      tab: 'roadmap',
    },
    {
      label: 'Pelo menos 1 parcela com data de emissão',
      subtitle: `${installments.length} parcela${installments.length !== 1 ? 's' : ''}`,
      completed: checks[4],
      tab: 'financial',
    },
  ];

  const missingItems = checklistItems
    .filter((i) => !i.completed)
    .map((i) => i.label);

  const handleItemClick = (tab: string) => {
    if (!isPlanning || !onNavigateToTab) return;
    onNavigateToTab(tab);
  };

  const handleConfirmExecution = async () => {
    if (!employee?.tenant_id) return;
    setIsTransitioning(true);

    try {
      // TD-0004: portfolio_stage e notifications não têm tipos gerados — ver tech-debt/log.md
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { error } = await supabase
        .from('projects')
        .update({
          portfolio_stage: 'value_delivery',
          status: 'active',
          start_date: executionDate,
        } as any)
        .eq('id', project.id);
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (error) throw error;

      const memberIds = allocations
        .filter((a) => a.totalHours > 0)
        .map((a) => a.employeeId)
        .filter(Boolean);

      if (memberIds.length > 0) {
        const notifications = memberIds.map((recipientId) => ({
          tenant_id: employee.tenant_id!,
          recipient_id: recipientId,
          type: 'project_execution_started',
          category: 'project',
          priority: 'normal',
          title: `Projeto ${project.name} iniciou a execução`,
          message: `O projeto foi movido para execução por ${employee.nome}. Timesheets já podem ser registrados.`,
          reference_id: project.id,
          action_url: `/portfolio/${project.id}`,
          metadata: {
            project_name: project.name,
            manager_name: employee.nome,
            start_date: executionDate,
          },
        }));

        // TD-0004: notifications sem tipo gerado
        /* eslint-disable @typescript-eslint/no-explicit-any */
        await (supabase.from('notifications' as any) as any).insert(notifications);
        /* eslint-enable @typescript-eslint/no-explicit-any */
      }

      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });

      setDialogOpen(false);
      toast({
        title: 'Execução iniciada',
        description: 'O projeto foi movido para execução e a equipe foi notificada.',
      });
    } catch {
      toast({
        title: 'Erro ao iniciar execução',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const found = PAYMENT_METHOD_OPTIONS.find((m) => m.value === method);
    return found?.label || method;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      {/* ── Checklist card ── */}
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Checklist de Início
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                Pronto para começar?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cinco verificações antes de habilitar timesheets, alocações reais e cobrança.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-3xl font-extrabold leading-none text-foreground">
                {completedCount}/{totalItems}
              </span>
              <span className="block mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Concluído
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-deep transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-border">
          {checklistItems.map((item) => {
            const clickable = isPlanning && !!onNavigateToTab;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleItemClick(item.tab)}
                disabled={!clickable}
                className={cn(
                  'w-full flex items-center gap-4 px-6 py-4 text-left',
                  'border-b border-border last:border-b-0',
                  'transition-colors',
                  clickable ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'shrink-0 h-5 w-5 rounded-full flex items-center justify-center',
                    item.completed
                      ? 'bg-primary-deep text-primary-deep-foreground'
                      : 'border-2 border-muted-foreground/40',
                  )}
                  aria-hidden
                >
                  {item.completed && <Check className="h-3 w-3" />}
                </span>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      item.completed ? 'line-through text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.subtitle}
                  </p>
                </div>

                {clickable && (
                  <ChevronRight className="shrink-0 h-4 w-4 text-muted-foreground" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        {isPlanning && canManageProject ? (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4 flex-wrap">
            {allDone && (
              <p className="text-sm text-muted-foreground">
                Tudo pronto. Iniciar execução habilita o timesheet de toda a equipe.
              </p>
            )}
            <div className={cn(!allDone && 'ml-auto')}>
              <Button onClick={() => setDialogOpen(true)}>
                Iniciar Execução
              </Button>
            </div>
          </div>
        ) : !isPlanning ? (
          <div className="px-6 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Planejamento concluído — visualização somente leitura.
            </p>
          </div>
        ) : null}
      </Card>

      {/* ── Right side info cards ── */}
      <div className="space-y-4">
        {/* Informações do Projeto */}
        <Card>
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Informações do Projeto</h3>
          </div>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente
                </p>
                <p className="text-sm font-medium">{clientName || 'Não definido'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gerente do Projeto
                </p>
                <p className="text-sm font-medium">{gpName || 'Não definido'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Período
                </p>
                <p className="text-sm font-medium">
                  {format(parseISO(project.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  {project.end_date && (
                    <> a {format(parseISO(project.end_date), 'dd/MM/yyyy', { locale: ptBR })}</>
                  )}
                  {project.is_continuous && (
                    <Badge variant="outline" className="ml-2 text-xs">Contínuo</Badge>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações Financeiras */}
        <Card>
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Informações Financeiras</h3>
          </div>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor Total do Contrato
                </p>
                <p className="text-lg font-bold">{formatCurrency(project.total_value)}</p>
              </div>
            </div>
            {project.service_line === 'financiamento_inovacao' ? (
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Prazo de Pagamento
                  </p>
                  <p className="text-sm font-medium">
                    Pagamento em {project.due_day} dias após NF
                  </p>
                </div>
              </div>
            ) : !isVentures ? (
              <>
                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Forma de Pagamento
                    </p>
                    <p className="text-sm font-medium">
                      {getPaymentMethodLabel(project.payment_method)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.installments_count} parcela(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Dia de Vencimento
                    </p>
                    <p className="text-sm font-medium">Dia {project.due_day}</p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Objetivo Principal */}
        <Card>
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Objetivo Principal</h3>
          </div>
          <CardContent className="pt-4">
            {!primaryOkr ? (
              <div className="flex items-start gap-3">
                <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Nenhum objetivo definido</p>
                  {onNavigateToTab && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-sm"
                      onClick={() => onNavigateToTab('okrs')}
                    >
                      Definir na aba Objetivos
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{primaryOkr.objective}</p>
                    {primaryOkr.target_date && (
                      <p className="text-xs text-muted-foreground">
                        Alvo em {format(parseISO(primaryOkr.target_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline">{OKR_STATUS_LABELS[primaryOkr.status]}</Badge>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {Math.round(primaryOkr.progress_percent)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-deep transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, primaryOkr.progress_percent))}%` }}
                    />
                  </div>
                </div>

                {primaryKeyResults.length > 0 && (
                  <ul className="space-y-1.5 border-t border-border pt-3">
                    {primaryKeyResults.map((kr) => (
                      <li key={kr.id} className="flex items-start gap-2 text-xs">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                        <span className="text-muted-foreground">{kr.description}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {okrs.length > 1 && onNavigateToTab && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => onNavigateToTab('okrs')}
                  >
                    Ver os outros {okrs.length - 1} objetivo{okrs.length - 1 !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Transition dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Execução</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!allDone && (
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {missingItems.length}{' '}
                    {missingItems.length === 1 ? 'item pendente' : 'itens pendentes'}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {missingItems.map((item) => (
                      <li key={item} className="text-xs text-amber-700 dark:text-amber-300">
                        • {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Deseja iniciar a execução mesmo assim?
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="execution-date">Data de início</Label>
              <input
                id="execution-date"
                type="date"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              O timesheet será habilitado para a equipe. Eles serão notificados por email e no
              sistema. Confirmar?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isTransitioning}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmExecution} disabled={isTransitioning}>
              {isTransitioning ? 'Aguarde...' : allDone ? 'Confirmar' : 'Iniciar mesmo assim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
