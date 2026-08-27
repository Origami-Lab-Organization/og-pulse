import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Loader2, Plus, ThumbsDown, TrendingDown, BarChart3, CalendarDays,
  RotateCcw, Trash2, MoreHorizontal, FileText, Eye, Kanban, List,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SortableTableHead, SortDirection } from '@/components/crm/SortableTableHead';
import { LeadTablePagination } from '@/components/crm/LeadTablePagination';
import {
  StandByStatsCards, StandByTable, useStandByLeads,
  STAND_BY_FILTER_OPTIONS, StandByFilter,
} from '@/components/crm/StandByView';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { LeadKanbanBoard } from '@/components/crm/LeadKanbanBoard';
import { LeadFormDialog } from '@/components/crm/LeadFormDialog';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { RestoreLeadDialog } from '@/components/crm/RestoreLeadDialog';
import { DeleteLeadDialog } from '@/components/crm/DeleteLeadDialog';
import { useLeads, useArchivedLeads } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';
import CRMStats from '@/components/crm/CRMStats';
import { resolveLeadEstimatedValue } from '@/lib/leadValue';
import { formatCurrency, formatDate, formatShortDate } from '@/lib/formatters';
import {
  ARCHIVE_REASONS, CRM_FUNNEL_STAGES, CRM_STAGE_META, LeadWithBudget,
  SERVICE_LINE_LABELS, SERVICE_LINE_OPTIONS,
  getLossReasonLabel, getStageColor, getStageLabel, isInStandBy,
} from '@/types/lead';
import { BudgetStatusBadge } from '@/components/budgets/BudgetStatusBadge';
import { BudgetStatus } from '@/types/budget';
import { cn } from '@/lib/utils';

type SortKey = 'name' | 'lost_at' | 'estimated_value' | 'created_at';
type SortDir = SortDirection;
type PipelineTab = 'active' | 'stand_by' | 'lost';

/**
 * Etapas oferecidas no filtro da Lista. Só o funil: Stand By virou aba própria e
 * não aparece mais entre os Ativos, então oferecê-lo aqui daria sempre vazio.
 */
const LIST_STAGE_OPTIONS = CRM_FUNNEL_STAGES.map((stage) => CRM_STAGE_META[stage]);

const SEARCH_PLACEHOLDERS: Record<PipelineTab, string> = {
  active: 'Buscar oportunidades...',
  stand_by: 'Buscar em Stand By...',
  lost: 'Buscar perdas...',
};

/**
 * Data em que a oportunidade foi perdida. `lost_at` é o carimbo canônico; caímos
 * em `archived_at` para as perdas registradas antes da unificação perda↔arquivo.
 */
function lostAtTime(lead: LeadWithBudget): number {
  const stamp = lead.lost_at ?? lead.archived_at;
  return stamp ? new Date(stamp).getTime() : 0;
}

export default function CRM() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const isManager = employee?.is_gerente || employee?.isAdmin;
  const isAdmin = employee?.isAdmin;

  const [activeTab, setActiveTab] = useState<PipelineTab>('active');
  const [displayMode, setDisplayMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  // Active leads
  const { data: rawActiveLeads = [], isLoading: loadingActive } = useLeads();

  // Oportunidades perdidas — toda perda é arquivamento (ver leadService.closeLeadAsLost)
  const { data: rawLostLeads = [], isLoading: loadingLost } = useArchivedLeads();


  // Fetch lead IDs linked to cancelled projects
  const { data: cancelledLeadIds = [] } = useQuery({
    queryKey: ['cancelled-project-lead-ids', employee?.tenant_id],
    queryFn: async () => {
      if (!employee?.tenant_id) return [];
      const { data } = await (await import('@/integrations/supabase/client')).supabase
        .from('projects')
        .select('lead_id')
        .eq('tenant_id', employee.tenant_id)
        .eq('status', 'cancelled');
      return (data || []).filter((p: any) => p.lead_id).map((p: any) => p.lead_id);
    },
    enabled: !!employee?.tenant_id,
  });

  const cancelledSet = useMemo(() => new Set(cancelledLeadIds), [cancelledLeadIds]);
  const activeLeads = useMemo(() => rawActiveLeads.filter((l: any) => !cancelledSet.has(l.id)), [rawActiveLeads, cancelledSet]);
  const lostLeads = useMemo(() => rawLostLeads.filter((l: any) => !cancelledSet.has(l.id)), [rawLostLeads, cancelledSet]);

  // O Stand By saiu da grade do Kanban e virou aba própria: as duas visões de
  // "Ativos" (Kanban e Lista) passam a mostrar só o funil.
  const funnelLeads = useMemo(() => activeLeads.filter((l) => !isInStandBy(l.crm_stage)), [activeLeads]);
  const standByLeads = useMemo(() => activeLeads.filter((l) => isInStandBy(l.crm_stage)), [activeLeads]);

  // Estado da visão de Stand By
  const [standByFilter, setStandByFilter] = useState<StandByFilter>('all');

  // Estado da visão de Perdas
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('lost_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLostLead, setSelectedLostLead] = useState<LeadWithBudget | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<LeadWithBudget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadWithBudget | null>(null);
  const [selectedActiveLead, setSelectedActiveLead] = useState<LeadWithBudget | null>(null);
  const [selectedActiveLeadInitialTab, setSelectedActiveLeadInitialTab] = useState<string>('qualificacao');

  // Deep-link: /crm?lead=<id>&tab=<tab> → abre o dialog na aba correta
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkLeadId = searchParams.get('lead');
  const deepLinkTab = searchParams.get('tab');
  useEffect(() => {
    if (loadingActive || !deepLinkLeadId) return;
    const lead = activeLeads.find((l) => l.id === deepLinkLeadId);
    if (lead) {
      setSelectedActiveLeadInitialTab(deepLinkTab ?? 'qualificacao');
      setSelectedActiveLead(lead);
      setSearchParams({}, { replace: true });
    }
  }, [loadingActive, deepLinkLeadId, deepLinkTab, activeLeads, setSearchParams]);

  // List view sort state
  const [listSortKey, setListSortKey] = useState<SortKey>('name');
  const [listSortDir, setListSortDir] = useState<SortDir>('asc');

  // List view filters
  const [listStageFilter, setListStageFilter] = useState<string>('all');
  const [listServiceFilter, setListServiceFilter] = useState<string>('all');
  const [listBudgetFilter, setListBudgetFilter] = useState<string>('all');

  const isLoading = activeTab === 'lost' ? loadingLost : loadingActive;

  const standBy = useStandByLeads(standByLeads, searchTerm, standByFilter);

  // Reset search and filters when switching primary tab
  useEffect(() => {
    setSearchTerm('');
    setReasonFilter('all');
    setStandByFilter('all');
    setListStageFilter('all');
    setListServiceFilter('all');
    setListBudgetFilter('all');
    setCurrentPage(0);
  }, [activeTab]);

  useEffect(() => { setCurrentPage(0); }, [reasonFilter, searchTerm]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'lost_at' ? 'desc' : 'asc');
    }
  };

  const handleListSort = (key: SortKey) => {
    if (listSortKey === key) {
      setListSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setListSortKey(key);
      setListSortDir(key === 'created_at' ? 'desc' : 'asc');
    }
  };

  const filteredLost = useMemo(() => {
    let result = [...lostLeads];
    if (reasonFilter !== 'all') {
      result = result.filter(l => l.archive_reason === reasonFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.company_name || '').toLowerCase().includes(q) ||
        (l.contact_name || '').toLowerCase().includes(q)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (sortKey) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'lost_at': return dir * (lostAtTime(a) - lostAtTime(b));
        case 'estimated_value': return dir * (resolveLeadEstimatedValue(a) - resolveLeadEstimatedValue(b));
        default: return 0;
      }
    });
    return result;
  }, [lostLeads, reasonFilter, searchTerm, sortKey, sortDir]);

  const filteredActiveList = useMemo(() => {
    let result = [...funnelLeads];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.company_name || '').toLowerCase().includes(q) ||
        (l.contact_name || '').toLowerCase().includes(q)
      );
    }
    if (listStageFilter !== 'all') {
      result = result.filter(l => l.crm_stage === listStageFilter);
    }
    if (listServiceFilter !== 'all') {
      result = result.filter(l => l.service_line === listServiceFilter);
    }
    if (listBudgetFilter === 'with') {
      result = result.filter(l => l.budget_id !== null);
    } else if (listBudgetFilter === 'without') {
      result = result.filter(l => l.budget_id === null);
    }
    const dir = listSortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (listSortKey) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'created_at': return dir * (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        case 'estimated_value': return dir * (resolveLeadEstimatedValue(a) - resolveLeadEstimatedValue(b));
        default: return 0;
      }
    });
    return result;
  }, [funnelLeads, searchTerm, listStageFilter, listServiceFilter, listBudgetFilter, listSortKey, listSortDir]);

  // Estatísticas de perda: TODA oportunidade em "Perdas" conta como perda.
  const lostStats = useMemo(() => {
    const now = new Date();
    const lostValue = lostLeads.reduce((s, l) => s + resolveLeadEstimatedValue(l), 0);
    const reasonCounts: Record<string, number> = {};
    lostLeads.forEach(l => {
      if (l.archive_reason) reasonCounts[l.archive_reason] = (reasonCounts[l.archive_reason] || 0) + 1;
    });
    const topEntry = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
    const topReason = topEntry ? `${getLossReasonLabel(topEntry[0])} (${topEntry[1]})` : '-';
    const thisMonth = lostLeads.filter(l => {
      const time = lostAtTime(l);
      if (!time) return false;
      const d = new Date(time);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: lostLeads.length, lostValue, topReason, thisMonth };
  }, [lostLeads]);

  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredLost.slice(start, start + pageSize);
  }, [filteredLost, currentPage, pageSize]);
  const showPagination = filteredLost.length > 10;

  return (
    <TooltipProvider>
      <AppLayout
        title="Pipeline"
        description="Pipeline comercial"
        breadcrumbs={[{ label: 'Pipeline' }]}
        actions={
          <Button onClick={() => setNewLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Oportunidade
          </Button>
        }
      >
        {/* Stats */}
        {activeTab === 'active' ? (
          <CRMStats leads={activeLeads} />
        ) : activeTab === 'stand_by' ? (
          <StandByStatsCards stats={standBy.stats} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full p-2 bg-muted">
                  <ThumbsDown className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de Perdas</p>
                  <p className="text-lg font-semibold">{lostStats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full p-2 bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Perdido</p>
                  <p className="text-lg font-semibold">{formatCurrency(lostStats.lostValue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full p-2 bg-amber-100 dark:bg-amber-900/30">
                  <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Principal Motivo</p>
                  <p className="text-lg font-semibold truncate max-w-[180px]">{lostStats.topReason}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/30">
                  <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Perdas no Mês</p>
                  <p className="text-lg font-semibold">{lostStats.thisMonth}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Toggle + Search + Filters */}
        <div className="mt-6 mb-4 flex flex-wrap items-center gap-3">
          {/* Search — first field */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={SEARCH_PLACEHOLDERS[activeTab]}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          {/* Primary tab toggle */}
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 shrink-0">
            <button
              onClick={() => setActiveTab('active')}
              aria-pressed={activeTab === 'active'}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === 'active'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Ativos
            </button>
            <button
              onClick={() => setActiveTab('stand_by')}
              aria-pressed={activeTab === 'stand_by'}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === 'stand_by'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Stand By
            </button>
            <button
              onClick={() => setActiveTab('lost')}
              aria-pressed={activeTab === 'lost'}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === 'lost'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Perdas
            </button>
          </div>

          {/* List-mode filters */}
          {activeTab === 'active' && displayMode === 'list' && (
            <>
              <Select value={listStageFilter} onValueChange={setListStageFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas as etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as etapas</SelectItem>
                  {LIST_STAGE_OPTIONS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={listServiceFilter} onValueChange={setListServiceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas as linhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as linhas</SelectItem>
                  {SERVICE_LINE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={listBudgetFilter} onValueChange={setListBudgetFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Com orçamento</SelectItem>
                  <SelectItem value="without">Sem orçamento</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* Filtro de retorno — visão de Stand By */}
          {activeTab === 'stand_by' && (
            <Select value={standByFilter} onValueChange={(v) => setStandByFilter(v as StandByFilter)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por retorno" />
              </SelectTrigger>
              <SelectContent>
                {STAND_BY_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Filtro de motivo — visão de Perdas */}
          {activeTab === 'lost' && (
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motivos</SelectItem>
                {ARCHIVE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Kanban / Lista icon toggle — only when active */}
          {activeTab === 'active' && (
            <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
              <Button
                variant={displayMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-9 px-3"
                onClick={() => setDisplayMode('kanban')}
              >
                <Kanban className="h-4 w-4" />
              </Button>
              <Button
                variant={displayMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-9 px-3"
                onClick={() => setDisplayMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : activeTab === 'stand_by' ? (
          <StandByTable
            leads={standBy.filtered}
            followUpsByLead={standBy.followUpsByLead}
            onSelectLead={setSelectedActiveLead}
          />
        ) : activeTab === 'active' && displayMode === 'kanban' ? (
          <LeadKanbanBoard leads={funnelLeads} searchTerm={searchTerm} />
        ) : activeTab === 'active' ? (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label="Nome" sortKey="name" currentKey={listSortKey} currentDir={listSortDir} onSort={handleListSort} />
                  <TableHead>Empresa</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Linha de Serviço</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Nº Orçamento</TableHead>
                  <SortableTableHead label="Valor" sortKey="estimated_value" currentKey={listSortKey} currentDir={listSortDir} onSort={handleListSort} className="text-right" />
                  <TableHead>Status Orçamento</TableHead>
                  <SortableTableHead label="Criado em" sortKey="created_at" currentKey={listSortKey} currentDir={listSortDir} onSort={handleListSort} />
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActiveList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhuma oportunidade encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActiveList.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-accent/40 transition-colors"
                      onClick={() => setSelectedActiveLead(lead)}
                    >
                      <TableCell className="font-medium max-w-[200px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">{lead.name}</span>
                          </TooltipTrigger>
                          <TooltipContent>{lead.name}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <span className="block truncate">{lead.company_name || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStageColor(lead.crm_stage)} variant="secondary">
                          {getStageLabel(lead.crm_stage)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <span className="block truncate">{SERVICE_LINE_LABELS[lead.service_line] || lead.service_line || '-'}</span>
                      </TableCell>
                      <TableCell>{lead.responsible?.nome || '-'}</TableCell>
                      <TableCell>{lead.budget?.budget_number ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(resolveLeadEstimatedValue(lead))}
                      </TableCell>
                      <TableCell>
                        {lead.budget
                          ? <BudgetStatusBadge status={lead.budget.status as BudgetStatus} />
                          : <span className="text-sm text-muted-foreground">Sem orçamento</span>
                        }
                      </TableCell>
                      <TableCell>{formatShortDate(lead.created_at)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedActiveLead(lead)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!lead.budget_id ? (
                              <DropdownMenuItem onClick={() => navigate(`/budgets/new?leadId=${lead.id}`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Criar Orçamento
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => navigate(`/budgets/${lead.budget_id}`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Ver Orçamento
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Nome" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <TableHead>Empresa</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Motivo</TableHead>
                    <SortableTableHead label="Data da Perda" sortKey="lost_at" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableTableHead label="Valor" sortKey="estimated_value" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    {isManager && <TableHead className="w-[100px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLost.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isManager ? 7 : 6} className="text-center text-muted-foreground py-8">
                        Nenhuma perda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => setSelectedLostLead(lead)}
                      >
                        <TableCell className="font-medium max-w-[200px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate">{lead.name}</span>
                            </TooltipTrigger>
                            <TooltipContent>{lead.name}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="max-w-[160px]">
                          <span className="block truncate">{lead.company_name || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStageColor(lead.crm_stage)} variant="secondary">
                            {getStageLabel(lead.crm_stage)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <span className="block truncate">
                            {getLossReasonLabel(lead.archive_reason)}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(lead.lost_at ?? lead.archived_at)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(resolveLeadEstimatedValue(lead))}
                        </TableCell>
                        {isManager && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm" variant="ghost" className="h-8 w-8 p-0"
                                    onClick={() => setRestoreTarget(lead)}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reabrir no Pipeline</TooltipContent>
                              </Tooltip>
                              {isAdmin && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteTarget(lead)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {showPagination && (
              <LeadTablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredLost.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(0); }}
              />
            )}
          </div>
        )}

        <LeadFormDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />

        <LeadDetailDialog
          open={!!selectedActiveLead}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedActiveLead(null);
              setSelectedActiveLeadInitialTab('qualificacao');
            }
          }}
          lead={selectedActiveLead}
          initialTab={selectedActiveLeadInitialTab}
        />

        <LeadDetailDialog
          open={!!selectedLostLead}
          onOpenChange={(open) => { if (!open) setSelectedLostLead(null); }}
          lead={selectedLostLead}
        />

        <RestoreLeadDialog
          open={!!restoreTarget}
          onOpenChange={(open) => { if (!open) setRestoreTarget(null); }}
          lead={restoreTarget}
        />

        <DeleteLeadDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          leadId={deleteTarget?.id ?? null}
          leadName={deleteTarget?.name ?? ''}
        />
      </AppLayout>
    </TooltipProvider>
  );
}
