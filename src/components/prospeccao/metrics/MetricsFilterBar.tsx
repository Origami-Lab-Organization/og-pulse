import { useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MethodSheet } from '@/components/prospeccao/metrics/MethodSheet';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { PERIOD_PRESETS, PERIOD_PRESET_OPTIONS, isCustomPreset, resolvePeriod } from '@/lib/prospecting/periods';
import { PROSPECT_LEVERS, toISODate, type ProspectWithCompany } from '@/types/prospect';
import type { MetricFilter, PeriodPreset, PeriodSelection } from '@/types/prospectMetrics';

/** O Select do Radix não aceita valor vazio: "todos" é a ausência de filtro. */
const TODOS = '__todos__';

interface MetricsFilterBarProps {
  selection: PeriodSelection;
  onSelectionChange: (selection: PeriodSelection) => void;
  filter: MetricFilter;
  onFilterChange: (filter: MetricFilter) => void;
  prospects: ProspectWithCompany[];
}

/**
 * Período, responsável e alavanca — valem para todas as sub-abas das métricas. Filtro por
 * gráfico faria dois números da mesma tela discordarem. O agrupamento (semana/mês) fica no
 * próprio gráfico da evolução, o único que ele muda.
 */
export function MetricsFilterBar(props: MetricsFilterBarProps) {
  const { selection, onSelectionChange, filter, onFilterChange, prospects } = props;
  const [metodoAberto, setMetodoAberto] = useState(false);
  const { byId } = useEmployeeDirectoryMap();
  const responsaveis = useMemo(() => responsaveisDe(prospects, byId), [prospects, byId]);
  const trocarPeriodo = (preset: PeriodPreset) =>
    onSelectionChange({ preset, grain: PERIOD_PRESETS[preset].grain, custom: resolvePeriod(selection).range });
  const filtrando = !!filter.ownerId || !!filter.lever;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selection.preset} onValueChange={(v) => trocarPeriodo(v as PeriodPreset)}>
        <SelectTrigger className="h-9 w-auto min-w-40 gap-2" aria-label="Período"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIOD_PRESET_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {isCustomPreset(selection.preset) && (
        <IntervaloPersonalizado selection={selection} onSelectionChange={onSelectionChange} />
      )}

      <Select
        value={filter.ownerId ?? TODOS}
        onValueChange={(v) => onFilterChange({ ...filter, ownerId: v === TODOS ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-auto min-w-48 gap-2" aria-label="Responsável"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os responsáveis</SelectItem>
          {responsaveis.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={filter.lever ?? TODOS}
        onValueChange={(v) => onFilterChange({ ...filter, lever: v === TODOS ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-auto min-w-44 gap-2" aria-label="Alavanca"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todas as alavancas</SelectItem>
          {PROSPECT_LEVERS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {filtrando && (
        <Button variant="ghost" size="sm" onClick={() => onFilterChange({})}>
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          Limpar filtros
        </Button>
      )}

      <Button
        variant="link"
        size="sm"
        className="px-1 underline underline-offset-[3px]"
        onClick={() => setMetodoAberto(true)}
      >
        Como contamos
      </Button>
      <MethodSheet open={metodoAberto} onOpenChange={setMetodoAberto} />
    </div>
  );
}

/** Só quem tem contato na Prospecção: o diretório inteiro encheria o filtro de gente que não prospecta. */
function responsaveisDe(prospects: ProspectWithCompany[], byId: Map<string, { nome: string }>) {
  const ids = [...new Set(prospects.map((p) => p.owner_id).filter((id): id is string => !!id))];
  return ids
    .map((id) => ({ id, nome: byId.get(id)?.nome ?? 'Sem nome' }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

interface IntervaloPersonalizadoProps {
  selection: PeriodSelection;
  onSelectionChange: (selection: PeriodSelection) => void;
}

function IntervaloPersonalizado(props: IntervaloPersonalizadoProps) {
  const { selection, onSelectionChange } = props;
  const atual = selection.custom ?? resolvePeriod(selection).range;
  /** A data escolhida e a outra ponta, em ordem: início depois do fim vira o fim. */
  const definir = (outra: string) => (data?: Date) => {
    if (!data) return;
    const [from, to] = [toISODate(data), outra].sort();
    onSelectionChange({ ...selection, custom: { from, to } });
  };
  return (
    <div className="flex items-center gap-2">
      <DatePicker className="w-40" value={parseISO(atual.from)} onChange={definir(atual.to)} placeholder="Início" />
      <span className="text-sm text-muted-foreground">a</span>
      <DatePicker className="w-40" value={parseISO(atual.to)} onChange={definir(atual.from)} placeholder="Fim" />
    </div>
  );
}
