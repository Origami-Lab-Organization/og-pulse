import { useMemo, useState } from 'react';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { useAddProjectCost, useDeleteProjectCost, useProjectCostItems } from '@/hooks/useProjectCostItems';
import { PLANNING_COST_TYPES } from '@/lib/projectPlanning.constants';
import type { CostCurrency, ProjectCostCategory, ProjectCostDB, ProjectCostStatus, ProjectWithRelations } from '@/types/project';
import {
  PlanningAddForm,
  PlanningCard,
  PlanningEmpty,
  PlanningField,
  PlanningFoot,
  PlanningIntro,
  PlanningReadOnlyNote,
  PlanningRemoveButton,
  PlanningRow,
} from './PlanningPanelParts';

interface PlanningCostsPanelProps {
  project: ProjectWithRelations;
  canEdit: boolean;
  /** Custos previstos no orçamento vendido; `null` = sem orçamento vinculado. */
  budgetedCosts: number | null;
}

const CANCELLED: ProjectCostStatus = 'cancelled';
const BRL: CostCurrency = 'BRL';
const CONTINUOUS_MONTHS = 12;
const TYPE_LABELS = new Map<string, string>(PLANNING_COST_TYPES.map((type) => [type.value, type.label]));
const monthLabel = (iso: string) => format(parseISO(iso), 'MMM/yyyy', { locale: ptBR });

/** Meses do período, `yyyy-MM-01` (contínuo: os 12 primeiros). */
function periodMonthOptions(project: ProjectWithRelations): string[] {
  const start = startOfMonth(parseISO(project.start_date));
  const end = project.is_continuous || !project.end_date ? addMonths(start, CONTINUOUS_MONTHS - 1) : startOfMonth(parseISO(project.end_date));
  const months: string[] = [];
  for (let month = start; month <= end; month = addMonths(month, 1)) months.push(format(month, 'yyyy-MM-dd'));
  return months;
}

/** "1.234,56" ou "1234.56" → 1234.56. */
function parseMoney(text: string): number {
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const value = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

/** Custo sem descrição ou com valor zero não é salvo (cenário 8). */
function validate(description: string, value: number): string | null {
  if (!description.trim()) return 'Descreva o custo.';
  if (value <= 0) return 'Informe um valor maior que zero.';
  return null;
}

/** Custos informados, sem os cancelados, em ordem de mês. */
const activeCosts = (costs: ProjectCostDB[]) =>
  costs
    .filter((cost) => cost.status !== CANCELLED)
    .sort((a, b) => (a.cost_date ?? '').localeCompare(b.cost_date ?? ''));

/** O orçamento previa custos e nenhum foi informado (cenário 8). */
const showsBudgetWarning = (budgetedCosts: number | null, count: number) => (budgetedCosts ?? 0) > 0 && count === 0;

function CostRow(props: { cost: ProjectCostDB; canEdit: boolean; projectId: string }) {
  const { cost, canEdit, projectId } = props;
  const money = useMaskedCurrency();
  const deleteCost = useDeleteProjectCost();
  return (
    <PlanningRow>
      <span className="min-w-[86px] font-mono text-xs text-muted-foreground">{cost.cost_date ? monthLabel(cost.cost_date) : '—'}</span>
      <span className="grid min-w-0 flex-1">
        <span className="break-words text-sm font-medium">{cost.description}</span>
        <small className="text-xs text-muted-foreground">{TYPE_LABELS.get(cost.category) ?? 'Outro'}</small>
      </span>
      <span className="whitespace-nowrap font-mono text-sm tabular-nums">{money(cost.planned_amount_brl)}</span>
      {canEdit && (
        <PlanningRemoveButton label={`Remover custo ${cost.description}`} onClick={() => deleteCost.mutate({ id: cost.id, projectId })} />
      )}
    </PlanningRow>
  );
}

function CostsFoot(props: { costs: ProjectCostDB[]; budgetedCosts: number | null }) {
  const money = useMaskedCurrency();
  const total = props.costs.reduce((acc, cost) => acc + Number(cost.planned_amount_brl || 0), 0);
  return (
    <PlanningFoot>
      <span>{props.costs.length === 1 ? '1 custo' : `${props.costs.length} custos`}</span>
      <span>
        Total <b className="font-mono tabular-nums">{money(total)}</b>
        {props.budgetedCosts !== null && <span className="text-muted-foreground"> · orçado {money(props.budgetedCosts)}</span>}
      </span>
    </PlanningFoot>
  );
}

function CostAddForm({ project }: { project: ProjectWithRelations }) {
  const addCost = useAddProjectCost();
  const months = useMemo(() => periodMonthOptions(project), [project]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProjectCostCategory>(PLANNING_COST_TYPES[0].value);
  const [month, setMonth] = useState(months[0]);
  const [valueText, setValueText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const value = parseMoney(valueText);
    const problem = validate(description, value);
    setError(problem);
    if (problem) return;
    const input = { projectId: project.id, category, description: description.trim(), costDate: month, plannedAmount: value, currency: BRL, exchangeRate: 1 };
    addCost.mutate(input, {
      onSuccess: () => {
        setDescription('');
        setValueText('');
      },
    });
  };

  return (
    <PlanningAddForm label="Novo custo" onSubmit={add} error={error}>
      <PlanningField label="Descrição" width="wide">
        <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Licença do serviço de mapas" />
      </PlanningField>
      <PlanningField label="Tipo">
        <Select value={category} onValueChange={(value) => setCategory(value as ProjectCostCategory)}>
          <SelectTrigger aria-label="Tipo do custo"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PLANNING_COST_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PlanningField>
      <PlanningField label="Mês" width="narrow">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger aria-label="Mês do custo"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((option) => (
              <SelectItem key={option} value={option}>{monthLabel(option)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PlanningField>
      <PlanningField label="Valor (R$)" width="narrow">
        <Input value={valueText} onChange={(event) => setValueText(event.target.value)} inputMode="decimal" placeholder="0,00" />
      </PlanningField>
      <Button type="submit" className="gap-1.5" disabled={addCost.isPending}>
        <Plus className="h-4 w-4" />
        Adicionar custo
      </Button>
    </PlanningAddForm>
  );
}

/** Aba Custos do planejamento: o que o projeto gasta além da equipe (US-0039, cenário 8). */
export function PlanningCostsPanel(props: PlanningCostsPanelProps) {
  const { project, canEdit, budgetedCosts } = props;
  const money = useMaskedCurrency();
  const { data: allCosts = [] } = useProjectCostItems(project.id);
  const costs = activeCosts(allCosts);
  const budgetWarning = showsBudgetWarning(budgetedCosts, costs.length);

  return (
    <div className="grid gap-4">
      <PlanningIntro title="O que o projeto gasta além da equipe.">
        Fornecedores, licenças, viagens e materiais, no mês em que acontecem. É opcional: preencha só se existir.
      </PlanningIntro>
      {!canEdit && <PlanningReadOnlyNote />}
      {budgetWarning && (
        <div className="rounded-md bg-warning-subtle px-4 py-3 text-sm text-warning-emphasis">
          O orçamento vendido previa <b>{money(budgetedCosts)}</b> de custos. Se eles continuam valendo, informe aqui; senão o
          resultado planejado fica melhor do que o real.
        </div>
      )}
      <PlanningCard>
        {costs.length ? (
          costs.map((cost) => <CostRow key={cost.id} cost={cost} canEdit={canEdit} projectId={project.id} />)
        ) : (
          <PlanningEmpty>Nenhum custo informado. Se o projeto não tem custo além da equipe, não precisa fazer nada aqui.</PlanningEmpty>
        )}
        {costs.length > 0 && <CostsFoot costs={costs} budgetedCosts={budgetedCosts} />}
        {canEdit && <CostAddForm project={project} />}
      </PlanningCard>
    </div>
  );
}
