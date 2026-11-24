import { format, parseISO } from 'date-fns';
import { FileSignature, Handshake, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { useBudgetVersions } from '@/hooks/useBudgetVersions';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectWonOn } from '@/hooks/useProjectPlanning';
import type { ProjectWithRelations } from '@/types/project';

/**
 * O que veio da venda, na linha de metadados do cabeçalho do projeto em planejamento
 * (US-0039, cenário 1, ajuste de 24/11/2026): contrato, parcelas e origem, ao lado de cliente,
 * serviço, gerente e período. Valores somem com "Ocultar valores" (cenário 16).
 */

const toBR = (iso: string) => format(parseISO(iso), 'dd/MM/yyyy');

function MetaItem(props: { icon: LucideIcon; children: React.ReactNode }) {
  const Icon = props.icon;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {props.children}
    </span>
  );
}

/** "N parcelas · 1ª em dd/mm/aaaa", com cada parcela no tooltip. */
function Installments({ project }: { project: ProjectWithRelations }) {
  const money = useMaskedCurrency();
  const installments = [...(project.installments || [])].sort((a, b) => a.due_date.localeCompare(b.due_date));
  if (!installments.length) return <MetaItem icon={Receipt}>Sem parcelas</MetaItem>;
  const label = installments.length === 1 ? '1 parcela' : `${installments.length} parcelas`;
  return (
    <MetaItem icon={Receipt}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="cursor-help rounded-sm underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs leading-relaxed">
          {installments.map((installment) => (
            <div key={installment.id}>
              {toBR(installment.due_date)} · {money(installment.value)}
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
      <span>· 1ª em {toBR(installments[0].due_date)}</span>
    </MetaItem>
  );
}

/** Origem: dia em que a Oportunidade foi ganha e o orçamento vendido, com a versão. */
function Origin({ project }: { project: ProjectWithRelations }) {
  const { data: wonOn } = useProjectWonOn(project.prospect_id);
  const { data: budget } = useBudget(project.budget_id);
  const { data: versions = [] } = useBudgetVersions(project.budget_id);
  const lastVersion = versions.reduce((max, version) => Math.max(max, version.version_number), 0);
  const parts = [
    wonOn ? `Ganha em ${toBR(wonOn)}` : null,
    budget ? `${budget.budget_number}${lastVersion ? ` · versão ${lastVersion}` : ''}` : 'Sem orçamento vinculado',
  ].filter(Boolean);
  return <MetaItem icon={Handshake}>{parts.join(' · ')}</MetaItem>;
}

export function PlanningHeaderMeta({ project }: { project: ProjectWithRelations }) {
  const money = useMaskedCurrency();
  return (
    <>
      <MetaItem icon={FileSignature}>
        <span className="font-mono font-medium tabular-nums text-foreground">{money(project.total_value)}</span>
      </MetaItem>
      <Installments project={project} />
      <Origin project={project} />
    </>
  );
}
