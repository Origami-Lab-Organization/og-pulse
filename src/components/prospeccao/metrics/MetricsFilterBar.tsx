import { parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  GRAIN_OPTIONS,
  PERIOD_PRESETS,
  PERIOD_PRESET_OPTIONS,
  formatRange,
  isCustomPreset,
} from '@/lib/prospecting/periods';
import { PROSPECT_LEVERS, toISODate } from '@/types/prospect';
import type {
  Grain,
  MetricFilter,
  PeriodPreset,
  PeriodSelection,
  ResolvedPeriod,
} from '@/types/prospectMetrics';

/** O Select do Radix não aceita valor vazio: "todos" é a ausência de filtro. */
const TODOS = '__todos__';

interface MetricsFilterBarProps {
  selection: PeriodSelection;
  onSelectionChange: (selection: PeriodSelection) => void;
  period: ResolvedPeriod;
  filter: MetricFilter;
  onFilterChange: (filter: MetricFilter) => void;
  owners: ReadonlyArray<{ id: string; nome: string }>;
}

/**
 * Uma linha só, acima de tudo, e vale para tudo abaixo dela: período, agrupamento,
 * responsável e alavanca. Filtro por gráfico faria dois números da mesma tela discordarem.
 */
export function MetricsFilterBar(props: MetricsFilterBarProps) {
  const { selection, onSelectionChange, period, filter, onFilterChange, owners } = props;
  const trocarPeriodo = (preset: PeriodPreset) =>
    onSelectionChange({ preset, grain: PERIOD_PRESETS[preset].grain, custom: period.range });
  const filtrando = !!filter.ownerId || !!filter.lever;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selection.preset} onValueChange={(v) => trocarPeriodo(v as PeriodPreset)}>
          <SelectTrigger className="w-44" aria-label="Período"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_PRESET_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {isCustomPreset(selection.preset) && (
          <IntervaloPersonalizado selection={selection} onSelectionChange={onSelectionChange} period={period} />
        )}

        <span className="ml-1 text-sm text-muted-foreground" id="agrupar-evolucao">Evolução por</span>
        <ToggleGroup
          type="single"
          variant="outline"
          value={selection.grain}
          onValueChange={(v) => v && onSelectionChange({ ...selection, grain: v as Grain })}
          aria-labelledby="agrupar-evolucao"
        >
          {GRAIN_OPTIONS.map((g) => (
            <ToggleGroupItem key={g.value} value={g.value} className="px-3">{g.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Select
          value={filter.ownerId ?? TODOS}
          onValueChange={(v) => onFilterChange({ ...filter, ownerId: v === TODOS ? undefined : v })}
        >
          <SelectTrigger className="w-52" aria-label="Responsável"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os responsáveis</SelectItem>
            {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filter.lever ?? TODOS}
          onValueChange={(v) => onFilterChange({ ...filter, lever: v === TODOS ? undefined : v })}
        >
          <SelectTrigger className="w-48" aria-label="Alavanca"><SelectValue /></SelectTrigger>
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
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{formatRange(period.elapsed)}</span>
        {' · comparando com '}
        {formatRange(period.previous)} ({period.comparisonLabel.replace(/^vs /, '')})
      </p>
    </div>
  );
}

interface IntervaloPersonalizadoProps {
  selection: PeriodSelection;
  onSelectionChange: (selection: PeriodSelection) => void;
  period: ResolvedPeriod;
}

function IntervaloPersonalizado(props: IntervaloPersonalizadoProps) {
  const { selection, onSelectionChange, period } = props;
  const atual = selection.custom ?? period.range;
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
