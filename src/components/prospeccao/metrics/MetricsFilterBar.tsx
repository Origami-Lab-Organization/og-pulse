import { useMemo, useState, type ReactNode } from 'react';
import { parseISO } from 'date-fns';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { PERIOD_PRESETS, PERIOD_PRESET_OPTIONS, isCustomPreset, resolvePeriod } from '@/lib/prospecting/periods';
import { getLeverLabel, getTipoDeContaLabel, PROSPECT_LEVERS, TIPOS_DE_CONTA, toISODate, type ProspectWithCompany } from '@/types/prospect';
import type { FiltroDeTipoDeConta, MetricFilter, PeriodPreset, PeriodSelection } from '@/types/prospectMetrics';

/** O Select do Radix não aceita valor vazio: "todos" é a ausência de filtro. */
const TODOS = '__todos__';
const SEM_TIPO: FiltroDeTipoDeConta = 'sem_tipo';

interface MetricsFilterBarProps {
  selection: PeriodSelection;
  onSelectionChange: (selection: PeriodSelection) => void;
  filter: MetricFilter;
  onFilterChange: (filter: MetricFilter) => void;
  prospects: ProspectWithCompany[];
  /** O intervalo do período e a comparação, ao lado do seletor. */
  resumo?: ReactNode;
}

/**
 * Barra das Métricas (revista em 23/11/2026): fica no conteúdo, acima das abas, e não no
 * cabeçalho, que cortava a descrição e deixava a linha do período solta embaixo. Alinhada à
 * direita: os filtros ativos como etiquetas removíveis, o resumo do período, o seletor de
 * período e o ícone de filtros, como na tela Empresas. Valem para todas as abas; "Como
 * contamos" fica na linha das abas.
 */
export function MetricsFilterBar(props: MetricsFilterBarProps) {
  const { selection, onSelectionChange, resumo } = props;
  const trocarPeriodo = (preset: PeriodPreset) =>
    onSelectionChange({ preset, grain: PERIOD_PRESETS[preset].grain, custom: resolvePeriod(selection).range });

  return (
    // Tudo à direita, num bloco só (23/11/2026): os filtros ativos, o resumo do período como
    // legenda do seletor, o seletor e o ícone de filtros.
    <div role="toolbar" aria-label="Período e filtros das métricas" className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      <FiltrosAtivos {...props} />
      {resumo}
      <Select value={selection.preset} onValueChange={(v) => trocarPeriodo(v as PeriodPreset)}>
        <SelectTrigger className="h-9 w-auto min-w-40 gap-2" aria-label="Período"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIOD_PRESET_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {isCustomPreset(selection.preset) && <IntervaloPersonalizado selection={selection} onSelectionChange={onSelectionChange} />}
      <PopoverDeFiltros {...props} />
    </div>
  );
}

const contarFiltros = (f: MetricFilter) => [f.ownerId, f.lever, f.tipoConta].filter(Boolean).length;

function PopoverDeFiltros(props: MetricsFilterBarProps) {
  const { filter, onFilterChange, prospects } = props;
  const { byId } = useEmployeeDirectoryMap();
  const responsaveis = useMemo(() => responsaveisDe(prospects, byId), [prospects, byId]);
  const [aberto, setAberto] = useState(false);
  const ativos = contarFiltros(filter);
  const rotulo = ativos ? `Filtros, ${ativos} ativo${ativos > 1 ? 's' : ''}` : 'Filtros';
  // Só o ícone, com a contagem num selo — o mesmo botão da tela Empresas (18/11/2026).
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant={aberto ? 'secondary' : 'outline'} size="icon" className="relative h-9 w-9 shrink-0" aria-label={rotulo} title={rotulo}>
          <Filter className="h-4 w-4" aria-hidden="true" />
          {ativos > 0 && (
            <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-primary px-1 font-mono text-[11px] leading-[18px] text-primary-foreground" aria-hidden="true">
              {ativos}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <CampoDoFiltro rotulo="Responsável" valor={filter.ownerId} onChange={(v) => onFilterChange({ ...filter, ownerId: v })} todos="Todos os responsáveis">
          {responsaveis.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
        </CampoDoFiltro>
        <CampoDoFiltro rotulo="Alavanca" valor={filter.lever} onChange={(v) => onFilterChange({ ...filter, lever: v })} todos="Todas as alavancas">
          {PROSPECT_LEVERS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
        </CampoDoFiltro>
        <CampoDoFiltro
          rotulo="Tipo de conta"
          valor={filter.tipoConta}
          onChange={(v) => onFilterChange({ ...filter, tipoConta: v as FiltroDeTipoDeConta | undefined })}
          todos="Todos os tipos de conta"
        >
          {TIPOS_DE_CONTA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          <SelectItem value={SEM_TIPO}>Sem tipo de conta</SelectItem>
        </CampoDoFiltro>
        {ativos > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onFilterChange({})}>
            Limpar filtros
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface CampoDoFiltroProps {
  rotulo: string;
  valor: string | undefined;
  onChange: (valor: string | undefined) => void;
  todos: string;
  children: ReactNode;
}

function CampoDoFiltro(props: CampoDoFiltroProps) {
  const { rotulo, valor, onChange, todos, children } = props;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      <Select value={valor ?? TODOS} onValueChange={(v) => onChange(v === TODOS ? undefined : v)}>
        <SelectTrigger className="h-9" aria-label={rotulo}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>{todos}</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Os filtros ativos à vista, cada um com o "x" que tira só ele. */
function FiltrosAtivos(props: MetricsFilterBarProps) {
  const { filter, onFilterChange } = props;
  const { byId } = useEmployeeDirectoryMap();
  const etiquetas = [
    filter.ownerId && { chave: 'ownerId', texto: byId.get(filter.ownerId)?.nome ?? 'Responsável' },
    filter.lever && { chave: 'lever', texto: getLeverLabel(filter.lever) ?? filter.lever },
    filter.tipoConta && { chave: 'tipoConta', texto: getTipoDeContaLabel(filter.tipoConta) ?? 'Sem tipo de conta' },
  ].filter((e): e is { chave: keyof MetricFilter; texto: string } => !!e);
  return (
    <>
      {etiquetas.map((e) => (
        <span key={e.chave} className="inline-flex h-7 items-center gap-1 rounded-full border bg-muted/50 pl-2.5 pr-1 text-xs">
          {e.texto}
          <button
            type="button"
            onClick={() => onFilterChange({ ...filter, [e.chave]: undefined })}
            aria-label={`Tirar o filtro ${e.texto}`}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
    </>
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
