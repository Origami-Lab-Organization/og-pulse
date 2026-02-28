import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAllMyReimbursements, ReimbursementRequest } from '@/hooks/useReimbursements';
import { ReimbursementFormDialog } from '@/components/reimbursements/ReimbursementFormDialog';
import { ReimbursementDetailDialog } from '@/components/reimbursements/ReimbursementDetailDialog';
import { useAuth } from '@/contexts/AuthContext';
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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'secondary', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
};

export default function Reimbursements() {
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReimbursement, setSelectedReimbursement] = useState<(ReimbursementRequest & { requester_name?: string; reviewer_name?: string; project_name?: string; client_name?: string }) | null>(null);
  const { employee } = useAuth();
  const { data: reimbursements = [], isLoading } = useAllMyReimbursements();
  const isManager = employee?.is_gerente || employee?.isAdmin;

  const filtered = useMemo(() => {
    let result = reimbursements;
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
    return result;
  }, [reimbursements, statusFilter, searchQuery]);

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
                <TableHead>Data</TableHead>
                {isManager && <TableHead>Solicitante</TableHead>}
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
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
                        {format(new Date(r.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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

      <ReimbursementFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ReimbursementDetailDialog
        open={!!selectedReimbursement}
        onOpenChange={(open) => { if (!open) setSelectedReimbursement(null); }}
        reimbursement={selectedReimbursement}
      />
    </AppLayout>
    </TooltipProvider>
  );
}
