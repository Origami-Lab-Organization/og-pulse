import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2, Clock, XCircle, CalendarDays } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAllMyReimbursements, ReimbursementRequest } from '@/hooks/useReimbursements';
import { ReimbursementFormDialog, CorrectionData } from '@/components/reimbursements/ReimbursementFormDialog';
import { ReimbursementDetailDialog } from '@/components/reimbursements/ReimbursementDetailDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; priority: number }> = {
  pending: { label: 'Pendente', variant: 'outline', priority: 0 },
  rejected: { label: 'Rejeitado', variant: 'destructive', priority: 1 },
  approved: { label: 'Aprovado', variant: 'secondary', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', priority: 2 },
};

type SortKey = 'date' | 'amount' | 'status';
type SortDir = 'asc' | 'desc';

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

export default function Reimbursements() {
  const [formOpen, setFormOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState<CorrectionData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReimbursement, setSelectedReimbursement] = useState<(ReimbursementRequest & { requester_name?: string; reviewer_name?: string; project_name?: string; client_name?: string }) | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { employee } = useAuth();
  const { data: reimbursements = [], isLoading } = useAllMyReimbursements();
  const isManager = employee?.is_gerente || employee?.isAdmin;

  const handleCorrectAndResend = async (r: ReimbursementRequest) => {
    // Fetch expense items from the rejected reimbursement
    const { data: itemsData } = await supabase
      .from('reimbursement_items' as any)
      .select('*')
      .eq('reimbursement_id', r.id)
      .order('expense_date', { ascending: true });

    const expItems = ((itemsData || []) as any[]).map((it: any) => ({
      date: new Date(it.expense_date + 'T12:00:00'),
      description: it.description as string,
      amount: it.amount as number,
    }));

    setCorrectionData({
      correctedFromId: r.id,
      rejectedAt: r.reviewed_at || r.created_at,
      rejectionReason: r.rejection_reason || '',
      type: r.is_internal ? 'internal' : 'project',
      clientId: r.client_id || '',
      projectId: r.project_id || '',
      items: expItems,
    });
    setFormOpen(true);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...reimbursements];
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        const cfg = statusConfig[r.status] || statusConfig.pending;
        return (
          r.description?.toLowerCase().includes(q) ||
          r.requester_name?.toLowerCase().includes(q) ||
          r.project_name?.toLowerCase().includes(q) ||
          r.client_name?.toLowerCase().includes(q) ||
          cfg.label.toLowerCase().includes(q) ||
          r.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).toLowerCase().includes(q)
        );
      });
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (sortKey) {
        case 'date': {
          const dateA = (a as any).earliest_expense_date || a.created_at;
          const dateB = (b as any).earliest_expense_date || b.created_at;
          return dir * (new Date(dateA).getTime() - new Date(dateB).getTime());
        }
        case 'amount':
          return dir * (a.total_amount - b.total_amount);
        case 'status': {
          const pa = (statusConfig[a.status]?.priority ?? 9);
          const pb = (statusConfig[b.status]?.priority ?? 9);
          return dir * (pa - pb);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [reimbursements, statusFilter, searchQuery, sortKey, sortDir]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const source = filtered;
    const approved = source.filter(r => r.status === 'approved');
    const pending = source.filter(r => r.status === 'pending');
    const rejected = source.filter(r => r.status === 'rejected');
    const thisMonth = source.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return {
      approvedTotal: approved.reduce((s, r) => s + r.total_amount, 0),
      pendingCount: pending.length,
      pendingTotal: pending.reduce((s, r) => s + r.total_amount, 0),
      rejectedCount: rejected.length,
      monthTotal: thisMonth.reduce((s, r) => s + r.total_amount, 0),
    };
  }, [filtered]);

  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <TooltipProvider>
    <AppLayout
      title="Reembolsos"
      description="Solicite e acompanhe seus pedidos de reembolso"
      breadcrumbs={[{ label: 'Reembolsos' }]}
      actions={
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full p-2 bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Aprovado</p>
                <p className="text-lg font-semibold">{fmtCurrency(stats.approvedTotal)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full p-2 bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-lg font-semibold">{stats.pendingCount} — {fmtCurrency(stats.pendingTotal)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full p-2 bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rejeitados</p>
                <p className="text-lg font-semibold">{stats.rejectedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/30">
                <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total do Mês</p>
                <p className="text-lg font-semibold">{fmtCurrency(stats.monthTotal)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar reembolsos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Data da Despesa" sortKey="date" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                {isManager && <TableHead>Solicitante</TableHead>}
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Projeto</TableHead>
                <SortableHead label="Valor" sortKey="amount" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                <SortableHead label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
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
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const cfg = statusConfig[r.status] || statusConfig.pending;
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-accent/40 hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-150 ease-in-out"
                      onClick={() => setSelectedReimbursement(r)}
                    >
                      <TableCell>
                        {(r as any).earliest_expense_date
                          ? format(new Date((r as any).earliest_expense_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                          : format(new Date(r.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      {isManager && (
                        <TableCell className="max-w-[160px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate">{r.requester_name || 'Desconhecido'}</span>
                            </TooltipTrigger>
                            <TooltipContent>{r.requester_name || 'Desconhecido'}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      )}
                      <TableCell className="max-w-[300px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">{r.description}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[400px] whitespace-pre-wrap">{r.description}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {r.is_internal ? 'Interno' : 'Projeto'}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">{r.is_internal ? ((r as any).tenant_name || 'Empresa') : r.project_name || '-'}</span>
                          </TooltipTrigger>
                          <TooltipContent>{r.is_internal ? ((r as any).tenant_name || 'Empresa') : r.project_name || '-'}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ReimbursementFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setCorrectionData(null);
        }}
        correctionData={correctionData}
      />
      <ReimbursementDetailDialog
        open={!!selectedReimbursement}
        onOpenChange={(open) => { if (!open) setSelectedReimbursement(null); }}
        reimbursement={selectedReimbursement}
        onCorrectAndResend={handleCorrectAndResend}
      />
    </AppLayout>
    </TooltipProvider>
  );
}
