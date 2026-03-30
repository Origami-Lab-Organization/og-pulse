import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, MinusCircle, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { YearNavigator } from '@/components/timesheets/YearNavigator';
import {
  AllocationTopKpis,
  AllocationOverview,
  PlannerFilterOptions,
  PlannerFilters,
} from '@/components/timesheets/AllocationOverview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const EMPTY_TOP_KPIS: AllocationTopKpis = {
  referenceMonth: new Date().getMonth() + 1,
  capacityMonthHours: 0,
  plannedProjectHours: 0,
  actualProjectHours: 0,
  plannedInternalHours: 0,
  actualInternalHours: 0,
  plannedTotalHours: 0,
  actualTotalHours: 0,
  unallocatedHours: 0,
  planUtilPct: null,
  realUtilPct: null,
  planProductivePct: null,
  planAdminPct: null,
  realProductivePct: null,
  realAdminPct: null,
  gapHours: 0,
};

const EMPTY_OPTIONS: PlannerFilterOptions = {
  managers: [],
  projects: [],
};

const formatHours = (value: number) => `${Math.round(value * 10) / 10}h`;
const formatPct = (value: number | null) => (value == null ? '—' : `${Math.round(value * 1000) / 10}%`);

export default function Timesheets() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [topKpis, setTopKpis] = useState<AllocationTopKpis>(EMPTY_TOP_KPIS);
  const [options, setOptions] = useState<PlannerFilterOptions>(EMPTY_OPTIONS);

  const [filters, setFilters] = useState<PlannerFilters>({
    managerId: 'all',
    projectId: 'all',
  });

  const updateFilter = <K extends keyof PlannerFilters>(key: K, value: PlannerFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const referenceMonthLabel = MONTH_LABELS[topKpis.referenceMonth - 1] || `M${topKpis.referenceMonth}`;
  const gapLabel = topKpis.gapHours > 0
    ? 'Horas ainda não realizadas'
    : topKpis.gapHours < 0
      ? 'Realizado acima do planejado'
      : 'Planejado e realizado alinhados';
  const gapValueLabel = `${topKpis.gapHours > 0 ? '+' : ''}${Math.round(topKpis.gapHours * 10) / 10}h`;

  return (
    <AppLayout
      title="Alocação"
      description="Planeje e ajuste a alocação anual da equipe sem abrir cada projeto"
      breadcrumbs={[{ label: 'Alocação' }]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="animate-scale-in">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                <MinusCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold text-foreground">{formatHours(topKpis.unallocatedHours)}</p>
                <p className="text-xs text-muted-foreground">Horas desalocadas ({referenceMonthLabel})</p>
                <p className="text-[11px] text-muted-foreground">
                  Cap: {formatHours(topKpis.capacityMonthHours)} | Plan: {formatHours(topKpis.plannedTotalHours)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-scale-in">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold text-foreground">{formatPct(topKpis.planUtilPct)}</p>
                <p className="text-xs text-muted-foreground">Utilização ({referenceMonthLabel})</p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Plan:</span> {formatPct(topKpis.planUtilPct)}
                  <span className="mx-2">|</span>
                  <span className="font-medium text-foreground">Real:</span> {formatPct(topKpis.realUtilPct)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-scale-in">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold text-foreground">{formatPct(topKpis.planProductivePct)}</p>
                <p className="text-xs text-muted-foreground">Produtivo vs ADM ({referenceMonthLabel})</p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Plan:</span> Prod {formatPct(topKpis.planProductivePct)} | ADM {formatPct(topKpis.planAdminPct)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Real:</span> Prod {formatPct(topKpis.realProductivePct)} | ADM {formatPct(topKpis.realAdminPct)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-scale-in">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                <TrendingDown className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold text-foreground">{gapValueLabel}</p>
                <p className="text-xs text-muted-foreground">Gap Plan-Real ({referenceMonthLabel})</p>
                <p className="text-[11px] text-muted-foreground">{gapLabel}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">
            <YearNavigator selectedYear={selectedYear} onYearChange={setSelectedYear} />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pessoa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full lg:w-[260px]"
              />
            </div>

            <Select value={filters.managerId} onValueChange={(value) => updateFilter('managerId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Gerente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gerentes</SelectItem>
                {options.managers.map((manager) => (
                  <SelectItem key={manager.value} value={manager.value}>{manager.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.projectId} onValueChange={(value) => updateFilter('projectId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {options.projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>{project.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AllocationOverview
          searchQuery={searchQuery}
          selectedYear={selectedYear}
          filters={filters}
          onTopKpisChange={setTopKpis}
          onFilterOptionsChange={setOptions}
        />
      </div>
    </AppLayout>
  );
}
