import { useBudget } from '@/hooks/useBudgets';
import { useCloseBusinessDeal } from '@/hooks/useCloseBusinessDeal';
import { useProspectBudget } from '@/hooks/useProspectDeal';
import type { CloseBusinessInstallment } from '@/lib/closeBusinessFinancials';
import { resolveProspectValue } from '@/lib/prospecting/value';
import type { BudgetWithDetails } from '@/types/budget';
import { opportunityName, type ProspectWithCompany } from '@/types/prospect';
import {
  CloseBusinessDialog,
  type CloseBusinessFormValues,
  type CloseBusinessOrigin,
} from './CloseBusinessDialog';

interface ProspectProjectDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Ganho → Projeto (29/09/2026): o "Fechar negócio" das antigas Oportunidades, agora a partir
 * do contato em Ganho. Com orçamento vinculado, o projeto herda equipe, fornecedores e
 * materiais dele; sem orçamento, nasce dos dados que a pessoa preenche.
 */
export function ProspectProjectDialog(props: ProspectProjectDialogProps) {
  const { prospect, open, onOpenChange } = props;
  const { data: vinculado } = useProspectBudget(open ? prospect?.id ?? null : null);
  const { data: orcamento = null } = useBudget(vinculado?.id ?? null);
  const fechar = useCloseBusinessDeal();

  if (!prospect) return null;

  return (
    <CloseBusinessDialog
      open={open}
      onOpenChange={onOpenChange}
      budget={orcamento}
      origem={origemDe(prospect)}
      onConfirm={(values) => fechar.mutateAsync(fechamentoDe(prospect, orcamento, values))}
      isSubmitting={fechar.isPending}
    />
  );
}

function origemDe(prospect: ProspectWithCompany): CloseBusinessOrigin {
  const empresa = prospect.company?.name ?? null;
  return {
    title: `Projeto ${opportunityName(prospect)}`,
    companyName: empresa,
    clientId: prospect.company?.client_id ?? null,
    responsibleId: prospect.owner_id,
    estimatedValue: prospect.estimated_value,
    wonValue: prospect.won_value,
  };
}

function fechamentoDe(
  prospect: ProspectWithCompany,
  orcamento: BudgetWithDetails | null,
  values: CloseBusinessFormValues,
) {
  return {
    prospectId: prospect.id,
    // Ganho sem valor recebe o total do projeto (useCloseBusinessDeal).
    wonOnWithoutValue: prospect.won_value == null ? prospect.won_on : null,
    budget: orcamento,
    managerId: values.managerId,
    paymentMethod: values.paymentMethod,
    installmentsCount: values.installmentsCount,
    dueDay: values.dueDay,
    firstInvoiceDate: values.firstInvoiceDate || undefined,
    startDate: values.startDate,
    endDate: values.endDate,
    projectType: values.projectType,
    renewalDate: values.renewalDate || undefined,
    successFeePercent: values.successFeePercent,
    monthlyValue: values.monthlyValue,
    // Parcelas só em escopo fechado: nos outros tipos o cronograma sai do valor mensal.
    customInstallments:
      values.projectType === 'fixed_scope'
        ? (values.installments as CloseBusinessInstallment[])
        : undefined,
    projectName: values.projectName,
    clientId: values.clientId,
    totalValue: values.totalValue || resolveProspectValue({ ...prospect, budget: orcamento }),
  };
}
