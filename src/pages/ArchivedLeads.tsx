import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, Archive, TrendingDown, BarChart3, CalendarDays,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, ArchiveRestore, Trash2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useArchivedLeads } from '@/hooks/useLeads';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import { RestoreLeadDialog } from '@/components/crm/RestoreLeadDialog';
import { DeleteLeadDialog } from '@/components/crm/DeleteLeadDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ARCHIVE_REASONS, CRM_LEAD_COLUMNS, LeadWithBudget } from '@/types/lead';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type SortKey = 'name' | 'archived_at' | 'estimated_value';
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

export default function ArchivedLeads() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { data: leads = [], isLoading } = useArchivedLeads();
  const isManager = employee?.is_gerente || employee?.isAdmin;
  const isAdmin = employee?.isAdmin;

  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('archived_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLead, setSelectedLead] = useState<LeadWithBudget | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<LeadWithBudget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadWithBudget | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'archived_at' ? 'desc' : 'asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...leads];
    if (reasonFilter !== 'all') {
      result = result.filter(l => l.archive_reason === reasonFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.company_name || '').toLowerCase().includes(q) ||
        (l.contact_name || '').toLowerCase().includes(q)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'archived_at':
          return dir * (new Date(a.archived_at || 0).getTime() - new Date(b.archived_at || 0).getTime());
        case 'estimated_value':
          return dir * ((a.budget?.final_total ?? a.estimated_value) - (b.budget?.final_total ?? b.estimated_value));
        default:
          return 0;
      }
    });
    return result;
  }, [leads, reasonFilter, searchQuery, sortKey, sortDir]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lostValue = leads.reduce((s, l) => s + (l.budget?.final_total ?? l.estimated_value), 0);

    // Most frequent reason
    const reasonCounts: Record<string, number> = {};
    leads.forEach(l => {
      if (l.archive_reason) {
        reasonCounts[l.archive_reason] = (reasonCounts[l.archive_reason] || 0) + 1;
      }
    });
    const topReasonEntry = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
    const topReason = topReasonEntry
      ? `${REASON_LABELS[topReasonEntry[0]] || topReasonEntry[0]} (${topReasonEntry[1]})`
      : '-';

    const thisMonth = leads.filter(l => {
      if (!l.archived_at) return false;
      const d = new Date(l.archived_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    return { total: leads.length, lostValue, topReason, thisMonth };
  }, [leads]);

  useEffect(() => { setCurrentPage(0); }, [reasonFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  const showPagination = filtered.length > 10;

  const stageLabel = (stage: string) => {
    const col = CRM_LEAD_COLUMNS.find(c => c.id === stage);
    return col ? col.label : stage;
  };

  const stageColor = (stage: string) => {
    const col = CRM_LEAD_COLUMNS.find(c => c.id === stage);
    return col ? col.color : 'bg-muted text-muted-foreground';
  };

  return (
    <TooltipProvider>
      <AppLayout
        title="Leads Arquivados"
        description="Leads removidos do funil de vendas"
        breadcrumbs={[
          { label: 'Pipeline', href: '/pipeline' },
          { label: 'Arquivados' },
        ]}
      >
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full p-2 bg-muted">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Arquivados</p>
                  <p className="text-lg font-semibold">{stats.total}</p>
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
                  <p className="text-lg font-semibold">{formatCurrency(stats.lostValue)}</p>
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
                  <p className="text-lg font-semibold truncate max-w-[180px]">{stats.topReason}</p>
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
                  <p className="text-lg font-semibold">{stats.thisMonth}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads arquivados..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
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
          </div>

          {/* Table */}
          <div className="rounded-md border">
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isManager ? 7 : 6} className="text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isManager ? 7 : 6} className="text-center text-muted-foreground">
                      Nenhum lead arquivado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-accent/40 hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-150 ease-in-out"
                      onClick={() => setSelectedLead(lead)}
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
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setRestoreTarget(lead)}
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Restaurar</TooltipContent>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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

          {/* Pagination */}
          {showPagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Mostrando {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, filtered.length)} de {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Por página:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(0); }}>
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
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

        <LeadDetailDialog
          open={!!selectedLead}
          onOpenChange={(open) => { if (!open) setSelectedLead(null); }}
          lead={selectedLead}
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
