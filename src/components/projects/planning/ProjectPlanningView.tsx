import { useCallback, useState } from 'react';
import { Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useProjectAllocations } from '@/hooks/useProjectRoles';
import { useCancelStaleApproval, usePlanningJustDone } from '@/hooks/usePlanningFeedback';
import { planningApprovalKey, useProjectPlanning } from '@/hooks/useProjectPlanning';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { planningCta, returnedReason } from '@/lib/projectPlanning';
import { PLANNING_APPROVAL_STATUS, PLANNING_TABS } from '@/lib/projectPlanning.constants';
import {
  concludePlanning,
  decidePlanningApproval,
  notifyPlanning,
  requestPlanningApproval,
} from '@/services/projectPlanningService';
import type { ProjectWithRelations } from '@/types/project';
import type { PlanningItemKey } from '@/types/projectPlanning';
import { PlanningChecklistPanel } from './PlanningChecklistPanel';
import { PlanningCostsPanel } from './PlanningCostsPanel';
import { PlanningFinishDialog, PlanningReturnDialog } from './PlanningDialogs';
import { PlanningOkrsPanel } from './PlanningOkrsPanel';
import { PlanningChecklistWidget } from './PlanningChecklistWidget';
import { PlanningRoadmapPanel } from './PlanningRoadmapPanel';
import { PlanningStakeholdersPanel } from './PlanningStakeholdersPanel';
import { PlanningTeamPanel } from './PlanningTeamPanel';

interface ProjectPlanningViewProps {
  project: ProjectWithRelations;
  /** GP do projeto ou quem gere qualquer projeto, com `projeto:editar` (mesma regra da RLS). */
  canEdit: boolean;
}

const tabClass =
  'relative gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-1 py-3 text-base font-normal text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-primary data-[state=active]:shadow-none';

/** Ações do planejamento: pedir, aprovar, devolver e concluir, com os avisos no sino. */
function usePlanningActions(project: ProjectWithRelations) {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allocations = [] } = useProjectAllocations(project.id, false);
  const [isBusy, setIsBusy] = useState(false);
  const tenantId = employee?.tenant_id ?? '';

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: planningApprovalKey(project.id) });
    queryClient.invalidateQueries({ queryKey: ['planning-readiness'] });
  }, [queryClient, project.id]);

  const run = async (action: () => Promise<void>, failure: string) => {
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      toast({ title: failure, description: mensagemParaUsuario(error), variant: 'destructive' });
    } finally {
      setIsBusy(false);
      refresh();
    }
  };

  const notifyGp = (type: string, title: string, message: string) =>
    notifyPlanning({ tenantId, recipientIds: project.manager_id ? [project.manager_id] : [], projectId: project.id, type, title, message });

  const conclude = async () => {
    await concludePlanning(project.id);
    const team = allocations.filter((allocation) => allocation.totalHours > 0).map((allocation) => allocation.employeeId);
    await notifyPlanning({
      tenantId,
      recipientIds: team,
      projectId: project.id,
      type: 'project_execution_started',
      title: `Projeto ${project.name} iniciou a execução`,
      message: `${employee?.nome ?? 'O GP'} concluiu o planejamento. Você já pode lançar horas no projeto.`,
    });
    queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-projects'] });
    toast({ title: `${project.name} está em Entrega de Valor`, description: 'A equipe foi avisada.' });
  };

  return { isBusy, refresh, run, conclude, notifyGp, tenantId };
}

/**
 * Projeto em planejamento (US-0039): só as cinco abas que se planejam, na largura toda, e o
 * checklist num widget no canto, com o resultado planejado contra o orçado e a conclusão.
 * Os dados que vieram da venda ficam no cabeçalho (`PlanningHeaderMeta`).
 */
export function ProjectPlanningView(props: ProjectPlanningViewProps) {
  const { project, canEdit } = props;
  const { employee, can } = useAuth();
  const planning = useProjectPlanning(project);
  const actions = usePlanningActions(project);
  const [tab, setTab] = useState<PlanningItemKey>(PLANNING_TABS[0].key);
  const [finish, setFinish] = useState<{ open: boolean; asApproval: boolean }>({ open: false, asApproval: false });
  const [returnOpen, setReturnOpen] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const { checklist, comparison, approval } = planning;
  const ready = !planning.isLoading;

  const justDone = usePlanningJustDone(checklist, ready);
  useCancelStaleApproval({ approval, plannedResult: comparison.planned.result, employeeId: employee?.id, ready, onCancelled: actions.refresh });

  const cta = planningCta({
    canEdit,
    canApprove: can('planejamento:aprovar-abaixo-do-orcado'),
    allRequiredDone: checklist.allRequiredDone,
    shortfall: comparison.shortfall,
    approval,
  });
  const openApproval = approval?.status === PLANNING_APPROVAL_STATUS.REQUESTED ? approval : null;
  const doneByKey = new Map(checklist.items.map((item) => [item.key, item.done] as const));

  const requestApproval = () =>
    actions.run(async () => {
      await requestPlanningApproval({
        projectId: project.id,
        tenantId: actions.tenantId,
        plannedResult: comparison.planned.result,
        budgetedResult: comparison.budgeted?.result ?? 0,
      });
    }, 'Não deu para pedir a aprovação');

  const confirmFinish = () =>
    actions.run(async () => {
      if (finish.asApproval) {
        // Admin sem pedido aberto: registra o pedido já aprovado, para ficar o histórico.
        const approvalId =
          openApproval?.id ??
          (await requestPlanningApproval({
            projectId: project.id,
            tenantId: actions.tenantId,
            plannedResult: comparison.planned.result,
            budgetedResult: comparison.budgeted?.result ?? 0,
          }));
        await decidePlanningApproval({ approvalId, status: PLANNING_APPROVAL_STATUS.APPROVED });
        if (openApproval) {
          await actions.notifyGp('project_planning_approved', `Planejamento de ${project.name} aprovado`, 'O admin aprovou o planejamento abaixo do orçado e o projeto foi para Entrega de Valor.');
        }
      }
      await actions.conclude();
      setFinish({ open: false, asApproval: false });
    }, 'Não deu para concluir o planejamento');

  const confirmReturn = (reason: string) =>
    actions.run(async () => {
      if (!openApproval) return;
      await decidePlanningApproval({ approvalId: openApproval.id, status: PLANNING_APPROVAL_STATUS.RETURNED, returnReason: reason });
      await actions.notifyGp('project_planning_returned', `Planejamento de ${project.name} devolvido`, reason);
      setReturnOpen(false);
    }, 'Não deu para devolver ao GP');

  const goToTab = (key: PlanningItemKey) => {
    setFinish({ open: false, asApproval: false });
    setWidgetOpen(false);
    setTab(key);
  };
  /** Ações do widget abrem uma janela: o widget fecha para a janela ficar por cima. */
  const fromWidget = (action: () => void) => () => {
    setWidgetOpen(false);
    action();
  };

  return (
    <div className="pb-24">
      <Tabs value={tab} onValueChange={(value) => setTab(value as PlanningItemKey)} className="min-w-0">
        <div className="overflow-x-auto border-b">
          <TabsList aria-label="O que planejar" className="h-auto w-max gap-6 rounded-none bg-transparent p-0">
            {PLANNING_TABS.map((item) => (
              <TabsTrigger key={item.key} value={item.key} className={tabClass}>
                {item.label}
                {doneByKey.get(item.key) && (
                  <span aria-label="preenchido" className="grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="okrs" className="mt-5">
          <PlanningOkrsPanel projectId={project.id} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="roadmap" className="mt-5">
          <PlanningRoadmapPanel project={project} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="team" className="mt-5 min-w-0">
          <PlanningTeamPanel project={project} canEdit={canEdit} counts={planning.counts} comparison={comparison} />
        </TabsContent>
        <TabsContent value="stakeholders" className="mt-5">
          <PlanningStakeholdersPanel project={project} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="costs" className="mt-5">
          <PlanningCostsPanel project={project} canEdit={canEdit} budgetedCosts={comparison.budgeted?.costs ?? null} />
        </TabsContent>
      </Tabs>
      <PlanningChecklistWidget checklist={checklist} justDone={justDone} open={widgetOpen} onOpenChange={setWidgetOpen}>
        <PlanningChecklistPanel
          checklist={checklist}
          comparison={comparison}
          cta={cta}
          activeTab={tab}
          onSelect={goToTab}
          justDone={justDone}
          returnReason={returnedReason(approval)}
          isBusy={actions.isBusy}
          onConclude={fromWidget(() => setFinish({ open: true, asApproval: false }))}
          onRequestApproval={requestApproval}
          onApprove={fromWidget(() => setFinish({ open: true, asApproval: true }))}
          onReturn={fromWidget(() => setReturnOpen(true))}
        />
      </PlanningChecklistWidget>
      <PlanningFinishDialog
        open={finish.open}
        onOpenChange={(open) => setFinish((current) => ({ ...current, open }))}
        checklist={checklist}
        comparison={comparison}
        asApproval={finish.asApproval}
        isPending={actions.isBusy}
        onGoToTab={goToTab}
        onConfirm={confirmFinish}
      />
      <PlanningReturnDialog open={returnOpen} onOpenChange={setReturnOpen} isPending={actions.isBusy} onConfirm={confirmReturn} />
    </div>
  );
}
