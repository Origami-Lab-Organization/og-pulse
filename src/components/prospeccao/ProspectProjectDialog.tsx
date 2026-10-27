import { useBudget } from '@/hooks/useBudgets';
import { useCloseBusinessDeal } from '@/hooks/useCloseBusinessDeal';
import { useLinkProspectCompanyToClient } from '@/hooks/useProspectCompanies';
import { useProspectBudget } from '@/hooks/useProspectDeal';
import type { CloseBusinessInstallment } from '@/lib/closeBusinessFinancials';
import { resolveProspectValue } from '@/lib/prospecting/value';
import type { BudgetWithDetails } from '@/types/budget';
import type { ClientPrefill } from '@/types/client';
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
  const ligarCliente = useLinkProspectCompanyToClient();

  if (!prospect) return null;
  const empresaId = prospect.company?.id ?? prospect.company_id ?? null;

  return (
    <CloseBusinessDialog
      open={open}
      onOpenChange={onOpenChange}
      budget={orcamento}
      origem={origemDe(prospect)}
      onConfirm={(values) => fechar.mutateAsync(fechamentoDe(prospect, orcamento, values))}
      onClientCreated={(clientId) => empresaId && ligarCliente.mutate({ companyId: empresaId, clientId })}
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
    clientPrefill: clientePreenchidoDe(prospect),
  };
}

const soDigitos = (valor: string | null | undefined) => valor?.replace(/\D/g, '') || undefined;

/**
 * A empresa que fechou e ainda não é cliente: o cadastro de cliente abre com o que a
 * Prospecção já sabe dela — nome, CNPJ, segmento, site e o endereço da Receita.
 */
function clientePreenchidoDe(prospect: ProspectWithCompany): ClientPrefill | null {
  const empresa = prospect.company;
  if (!empresa || empresa.client_id) return null;
  const endereco = empresa.receita?.endereco;
  return {
    companyName: empresa.razao_social || empresa.name,
    tradingName: empresa.nome_fantasia || (empresa.razao_social ? empresa.name : undefined),
    cnpj: soDigitos(empresa.cnpj),
    segment: empresa.segment || undefined,
    website: empresa.website || undefined,
    cep: soDigitos(endereco?.cep),
    logradouro: endereco?.logradouro || undefined,
    numero: endereco?.numero || undefined,
    complemento: endereco?.complemento || undefined,
    bairro: endereco?.bairro || undefined,
    cidade: endereco?.municipio || undefined,
    estado: endereco?.uf || undefined,
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
