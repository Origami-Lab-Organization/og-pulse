import { Fragment, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { PeriodSelect } from '@/components/conciliacao/period';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useProjectPersonHours } from '@/hooks/useRelatorioHoras';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { PeriodPreset, periodRange } from '@/lib/financeiroPeriodo';
import { CSV_HEADERS, csvRows, executedPct, formatHours, groupHours, totalsOf } from '@/lib/relatorioHoras';
import { downloadCsv } from '@/lib/timeTrackingCsvExport';
import { HoursGrouping } from '@/types/relatorioHoras';
import type { HoursGroup, HoursLine, ProjectPersonHoursRow } from '@/types/relatorioHoras';

const ALL = '__todos__';

const monthOf = (iso: string) => iso.slice(0, 7);
const lastDayOf = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

interface Filters {
  from: string;
  to: string;
  project: string;
  person: string;
}

/** Período: preset do Financeiro ou meses escolhidos. O planejado é mensal, então o intervalo é sempre de meses cheios. */
function PeriodFilter(props: { onChange: (range: { from: string; to: string }) => void }) {
  const today = new Date();
  const initial = periodRange(PeriodPreset.ThisMonth, today);
  const [preset, setPreset] = useState<PeriodPreset>(PeriodPreset.ThisMonth);
  const [custom, setCustom] = useState(false);
  const [fromMonth, setFromMonth] = useState(monthOf(initial.from));
  const [toMonth, setToMonth] = useState(monthOf(initial.to));

  const applyPreset = (value: PeriodPreset) => {
    setPreset(value);
    const range = periodRange(value, new Date());
    props.onChange({ from: range.from, to: range.to });
  };
  const applyMonths = (from: string, to: string) => {
    setFromMonth(from);
    setToMonth(to);
    if (from && to) props.onChange({ from: `${from}-01`, to: lastDayOf(to) });
  };
  const toggleCustom = (on: boolean) => {
    setCustom(on);
    if (on) applyMonths(fromMonth, toMonth);
    else applyPreset(preset);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {custom ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="horas-de">De</Label>
            <Input id="horas-de" type="month" value={fromMonth} onChange={(e) => applyMonths(e.target.value, toMonth)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="horas-ate">Até</Label>
            <Input id="horas-ate" type="month" value={toMonth} onChange={(e) => applyMonths(fromMonth, e.target.value)} className="w-40" />
          </div>
        </>
      ) : (
        <PeriodSelect value={preset} onChange={applyPreset} />
      )}
      <div className="flex items-center gap-2 pb-2">
        <Switch id="horas-personalizado" checked={custom} onCheckedChange={toggleCustom} />
        <Label htmlFor="horas-personalizado" className="text-sm text-muted-foreground">
          Escolher os meses
        </Label>
      </div>
    </div>
  );
}

function OptionFilter(props: { id: string; label: string; all: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const { id, label, all, value, options, onChange } = props;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{all}</SelectItem>
          {options.map(([key, name]) => (
            <SelectItem key={key} value={key}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function optionsOf(rows: readonly ProjectPersonHoursRow[], pick: (r: ProjectPersonHoursRow) => [string, string]): [string, string][] {
  const map = new Map(rows.map(pick));
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
}

function Executed({ planned, logged }: { planned: number; logged: number }) {
  const pct = executedPct(planned, logged);
  if (pct == null) return <Badge variant="warning">Sem planejamento</Badge>;
  if (logged === 0) return <Badge variant="neutral">Sem lançamento</Badge>;
  return <span className="tabular-nums">{Math.round(pct)}%</span>;
}

function HoursCells({ line }: { line: HoursLine }) {
  return (
    <>
      <TableCell className="text-right tabular-nums">{formatHours(line.planned)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatHours(line.logged)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatHours(line.logged - line.planned)}</TableCell>
      <TableCell className="text-right">
        <Executed planned={line.planned} logged={line.logged} />
      </TableCell>
    </>
  );
}

function GroupRows({ group }: { group: HoursGroup }) {
  return (
    <Fragment>
      <TableRow className="bg-muted/50">
        <TableCell>
          <span className="font-semibold text-foreground">{group.label}</span>
          {group.sublabel && <span className="ml-2 text-sm text-muted-foreground">{group.sublabel}</span>}
        </TableCell>
        <HoursCells line={group} />
      </TableRow>
      {group.lines.map((line) => (
        <TableRow key={`${group.key}-${line.key}`}>
          <TableCell className="pl-8 text-foreground">
            {line.label}
            {line.sublabel && <span className="ml-2 text-sm text-muted-foreground">{line.sublabel}</span>}
          </TableCell>
          <HoursCells line={line} />
        </TableRow>
      ))}
    </Fragment>
  );
}

function HoursTable({ rows, grouping }: { rows: ProjectPersonHoursRow[]; grouping: HoursGrouping }) {
  const groups = useMemo(() => groupHours(rows, grouping), [rows, grouping]);
  const total = totalsOf(rows);
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma hora planejada ou lançada nesta seleção.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{grouping === HoursGrouping.ByProject ? 'Projeto · pessoa' : 'Pessoa · projeto'}</TableHead>
            <TableHead className="text-right">Planejado</TableHead>
            <TableHead className="text-right">Lançado</TableHead>
            <TableHead className="text-right">Diferença</TableHead>
            <TableHead className="text-right">Executado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <GroupRows key={group.key} group={group} />
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <HoursCells line={{ key: 'total', label: 'Total', sublabel: null, ...total }} />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function applyFilters(rows: ProjectPersonHoursRow[], filters: Filters): ProjectPersonHoursRow[] {
  return rows.filter(
    (r) =>
      (filters.project === ALL || r.project_id === filters.project) &&
      (filters.person === ALL || (r.employee_id ?? 'sem-pessoa') === filters.person),
  );
}

function Report() {
  const initial = periodRange(PeriodPreset.ThisMonth, new Date());
  const [filters, setFilters] = useState<Filters>({ from: initial.from, to: initial.to, project: ALL, person: ALL });
  const [grouping, setGrouping] = useState<HoursGrouping>(HoursGrouping.ByProject);
  const { data: rows = [], isLoading, isError, error, refetch } = useProjectPersonHours(filters.from, filters.to);
  const visible = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const projects = useMemo(() => optionsOf(rows, (r) => [r.project_id, r.project_name]), [rows]);
  const people = useMemo(() => optionsOf(rows, (r) => [r.employee_id ?? 'sem-pessoa', r.employee_name ?? 'Sem pessoa']), [rows]);
  const exportCsv = () =>
    downloadCsv(`horas-por-projeto-${monthOf(filters.from)}_${monthOf(filters.to)}.csv`, CSV_HEADERS, csvRows(visible));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <PeriodFilter onChange={(range) => setFilters((f) => ({ ...f, ...range }))} />
          <OptionFilter id="horas-projeto" label="Projeto" all="Todos os projetos" value={filters.project} options={projects} onChange={(project) => setFilters((f) => ({ ...f, project }))} />
          <OptionFilter id="horas-pessoa" label="Pessoa" all="Todas as pessoas" value={filters.person} options={people} onChange={(person) => setFilters((f) => ({ ...f, person }))} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" value={grouping} onValueChange={(v) => v && setGrouping(v as HoursGrouping)} aria-label="Agrupar">
            <ToggleGroupItem value={HoursGrouping.ByProject}>Por projeto</ToggleGroupItem>
            <ToggleGroupItem value={HoursGrouping.ByPerson}>Por pessoa</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" onClick={exportCsv} disabled={visible.length === 0}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Exportar CSV
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0 sm:p-2">
          {isLoading ? (
            <Skeleton className="m-4 h-64" />
          ) : isError ? (
            <div role="alert" className="m-4 flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
              <p>{mensagemParaUsuario(error, 'Não foi possível carregar as horas.')}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tentar de novo
              </Button>
            </div>
          ) : (
            <HoursTable rows={visible} grouping={grouping} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Análises › Horas por projeto: planejado (alocação) × lançado (timesheet), por projeto e pessoa. */
export default function AnaliseHorasPorProjeto() {
  return (
    <AppLayout
      title="Horas por projeto"
      description="Horas planejadas na alocação e lançadas no timesheet, por projeto e por pessoa, no período. Só horas — custo não aparece aqui."
      breadcrumbs={[{ label: 'Análises', href: '/analises/meu-time' }, { label: 'Horas por projeto' }]}
    >
      <Report />
    </AppLayout>
  );
}
