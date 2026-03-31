import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Loader2, Plus, Archive, TrendingDown, BarChart3, CalendarDays,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, ArchiveRestore, Trash2,
  MoreHorizontal, FileText, Eye, Kanban, List,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { LeadKanbanBoard } from '@/components/crm/LeadKanbanBoard';
import { LeadFormDialog } from '@/components/crm/LeadFormDialog';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { useLeads, useArchivedLeads, useUnarchiveLead, useDeleteLead } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';
import CRMStats from '@/components/crm/CRMStats';
import { formatCurrency, formatDate, formatShortDate } from '@/lib/formatters';
import { ARCHIVE_REASONS, CRM_LEAD_COLUMNS, LeadWithBudget, SERVICE_LINE_LABELS, SERVICE_LINE_OPTIONS } from '@/types/lead';
import { BudgetStatusBadge } from '@/components/budgets/BudgetStatusBadge';
import { BudgetStatus } from '@/types/budget';
import { cn } from '@/lib/utils';

type SortKey = 'name' | 'archived_at' | 'estimated_value' | 'created_at';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  ARCHIVE_REASONS.map((r) => [r.value, r.label])
);

function SortableHead({ label, sortKey, currentKey, currentDir, onSort, className }: {
  label: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir; onSort: (k: SortKey) => void; className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className || ''}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          currentDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-foreground" /> : <ArrowDown className="h-3.5 w-3.5 text-foreground" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
}

export default function CRM() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const isManager = employee?.is_gerente || employee?.isAdmin;
  const isAdmin = employee?.isAdmin;

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [displayMode, setDisplayMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  // Active leads
  const { data: activeLeads = [], isLoading: loadingActive } = useLeads();

  // Archived leads
  const { data: archivedLeads = [], isLoading: loadingArchived } = useArchivedLeads();
  const unarchiveMutation = useUnarchiveLead();
  const deleteMutation = useDeleteLead();

  // Archived view state
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('archived_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedArchivedLead, setSelectedArchivedLead] = useState<LeadWithBudget | null>(null);
  const [selectedActiveLead, setSelectedActiveLead] = useState<LeadWithBudget | null>(null);

  // List view sort state
  const [listSortKey, setListSortKey] = useState<SortKey>('name');
  const [listSortDir, setListSortDir] = useState<SortDir>('asc');

  // List view filters
  const [listStageFilter, setListStageFilter] = useState<string>('all');
  const [listServiceFilter, setListServiceFilter] = useState<string>('all');
  const [listBudgetFilter, setListBudgetFilter] = useState<string>('all');

  const isLoading = activeTab === 'archived' ? loadingArchived : loadingActive;

  // Reset search and filters when switching primary tab
  useEffect(() => {
    setSearchTerm('');
    setReasonFilter('all');
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
      setSortDir(key === 'archived_at' ? 'desc' : 'asc');
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

  const filteredArchived = useMemo(() => {
    let result = [...archivedLeads];
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
        case 'archived_at': return dir * (new Date(a.archived_at || 0).getTime() - new Date(b.archived_at || 0).getTime());
        case 'estimated_value': return dir * ((a.budget?.final_total ?? a.estimated_value) - (b.budget?.final_total ?? b.estimated_value));
        default: return 0;
      }
    });
    return result;
  }, [archivedLeads, reasonFilter, searchTerm, sortKey, sortDir]);

  const filteredActiveList = useMemo(() => {
    let result = [...activeLeads];
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
        case 'estimated_value': return dir * ((a.budget?.final_total ?? a.estimated_value) - (b.budget?.final_total ?? b.estimated_value));
        default: return 0;
      }
    });
    return result;
  }, [activeLeads, searchTerm, listStageFilter, listServiceFilter, listBudgetFilter, listSortKey, listSortDir]);

  const archivedStats = useMemo(() => {
    const now = new Date();
    const lostValue = archivedLeads.reduce((s, l) => s + (l.budget?.final_total ?? l.estimated_value), 0);
    const reasonCounts: Record<string, number> = {};
    archivedLeads.forEach(l => {
      if (l.archive_reason) reasonCounts[l.archive_reason] = (reasonCounts[l.archive_reason] || 0) + 1;
    });
    const topEntry = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
    const topReason = topEntry ? `${REASON_LABELS[topEntry[0]] || topEntry[0]} (${topEntry[1]})` : '-';
    const thisMonth = archivedLeads.filter(l => {
      if (!l.archived_at) return false;
      const d = new Date(l.archived_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: archivedLeads.length, lostValue, topReason, thisMonth };
  }, [archivedLeads]);

  const totalPages = Math.ceil(filteredArchived.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredArchived.slice(start, start + pageSize);
  }, [filteredArchived, currentPage, pageSize]);
  const showPagination = filteredArchived.length > 10;

  const stageLabel = (stage: string) => CRM_LEAD_COLUMNS.find(c => c.id === stage)?.label ?? stage;
  const stageColor = (stage: string) => CRM_LEAD_COLUMNS.find(c => c.id === stage)?.color ?? 'bg-muted text-muted-foreground';

  return (
    <TooltipProvider>
      <AppLayout
        title="CRM"
        description="Funil de vendas"
        breadcrumbs={[{ label: 'CRM' }]}
        actions={
          <Button onClick={() => setNewLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        }
      >
        {/* Stats */}
        {activeTab !== 'archived' ? (
          <CRMStats leads={activeLeads} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full p-2 bg-muted">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Arquivados</p>
                  <p className="text-lg font-semibold">{archivedStats.total}</p>
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
                  <p className="text-lg font-semibold">{formatCurrency(archivedStats.lostValue)}</p>
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
                  <p className="text-lg font-semibold truncate max-w-[180px]">{archivedStats.topReason}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/30">
                  <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Arquivados no Mês</p>
                  <p className="text-lg font-semibold">{archivedStats.thisMonth}</p>
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
              placeholder={activeTab === 'archived' ? 'Buscar arquivados...' : 'Buscar leads...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          {/* Primary tab toggle */}
          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 shrink-0">
            <button
              onClick={() => setActiveTab('active')}
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
              onClick={() => setActiveTab('archived')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === 'archived'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Arquivados
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
                  {CRM_LEAD_COLUMNS.map((col) => (
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

          {/* Archived filter */}
          {activeTab === 'archived' && (
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
        ) : activeTab === 'active' && displayMode === 'kanban' ? (
          <LeadKanbanBoard leads={activeLeads} searchTerm={searchTerm} />
        ) : activeTab === 'active' ? (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Nome" sortKey="name" currentKey={listSortKey} currentDir={listSortDir} onSort={handleListSort} />
                  <TableHead>Empresa</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Linha de Serviço</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Nº Orçamento</TableHead>
                  <SortableHead label="Valor" sortKey="estimated_value" currentKey={listSortKey} currentDir={listSortDir} onSort={handleListSort} className="text-right" />
                  <TableHead>Status Orçamento</TableHead>
                  <SortableHead label="Criado em" sortKey="created_at" currentKey={listSortKey} currentDir={listSortDir} onSort={handleListSort} />
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActiveList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum lead encontrado
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
                        <Badge className={stageColor(lead.crm_stage)} variant="secondary">
                          {stageLabel(lead.crm_stage)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <span className="block truncate">{SERVICE_LINE_LABELS[lead.service_line] || lead.service_line || '-'}</span>
                      </TableCell>
                      <TableCell>{lead.responsible?.nome || '-'}</TableCell>
                      <TableCell>{lead.budget?.budget_number ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(lead.budget?.final_total ?? lead.estimated_value)}
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
                    <SortableHead label="Nome" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <TableHead>Empresa</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Motivo</TableHead>
                    <SortableHead label="Data Arquivamento" sortKey="archived_at" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Valor" sortKey="estimated_value" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    {isManager && <TableHead className="w-[100px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchived.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isManager ? 7 : 6} className="text-center text-muted-foreground py-8">
                        Nenhum lead arquivado encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => setSelectedArchivedLead(lead)}
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
                          <Badge className={stageColor(lead.crm_stage)} variant="secondary">
                            {stageLabel(lead.crm_stage)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <span className="block truncate">
                            {REASON_LABELS[lead.archive_reason || ''] || lead.archive_reason || '-'}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(lead.archived_at)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(lead.budget?.final_total ?? lead.estimated_value)}
                        </TableCell>
                        {isManager && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm" variant="ghost" className="h-8 w-8 p-0"
                                    onClick={() => unarchiveMutation.mutate(lead.id)}
                                    disabled={unarchiveMutation.isPending}
                                  >
                                    <ArchiveRestore className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Desarquivar</TooltipContent>
                              </Tooltip>
                              {isAdmin && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      onClick={() => deleteMutation.mutate(lead.id)}
                                      disabled={deleteMutation.isPending}
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filteredArchived.length)} de {filteredArchived.length} lead{filteredArchived.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Por página:</span>
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(0); }}>
                      <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(s => (
                          <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-2">{currentPage + 1} / {totalPages || 1}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <LeadFormDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />

        <LeadDetailDialog
          open={!!selectedActiveLead}
          onOpenChange={(open) => { if (!open) setSelectedActiveLead(null); }}
          lead={selectedActiveLead}
        />

        <LeadDetailDialog
          open={!!selectedArchivedLead}
          onOpenChange={(open) => { if (!open) setSelectedArchivedLead(null); }}
          lead={selectedArchivedLead}
        />
      </AppLayout>
    </TooltipProvider>
  );
}
