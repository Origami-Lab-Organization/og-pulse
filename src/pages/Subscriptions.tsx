import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SubscriptionFormDialog from '@/components/subscriptions/SubscriptionFormDialog';
import DeleteSubscriptionDialog from '@/components/subscriptions/DeleteSubscriptionDialog';
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useToggleSubscriptionActive,
  useDeleteSubscription,
} from '@/hooks/useSubscriptions';
import {
  Subscription,
  CreateSubscriptionInput,
  SUBSCRIPTION_CATEGORY_LABELS,
  BILLING_CYCLE_LABELS,
  SubscriptionCategory,
  BillingCycle,
} from '@/types/subscription';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// ─── Category badge colors ─────────────────────────────────────────────────────

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  software: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  infrastructure: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  marketing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  analytics: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  communication: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  project_management: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  finance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const Subscriptions = () => {
  const { employee } = useAuth();
  const canManage = employee?.is_gerente ?? false;

  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const toggleActive = useToggleSubscriptionActive();
  const deleteSubscription = useDeleteSubscription();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Subscription | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAdd = () => {
    setSelected(null);
    setFormOpen(true);
  };

  const handleEdit = (sub: Subscription) => {
    setSelected(sub);
    setFormOpen(true);
  };

  const handleDelete = (sub: Subscription) => {
    setSelected(sub);
    setDeleteOpen(true);
  };

  const handleFormSubmit = (data: CreateSubscriptionInput) => {
    if (selected) {
      updateSubscription.mutate(
        { id: selected.id, updates: data },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createSubscription.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleToggleActive = (sub: Subscription) => {
    toggleActive.mutate({ id: sub.id, isActive: !sub.isActive });
  };

  const handleDeleteConfirm = () => {
    if (selected) {
      deleteSubscription.mutate(
        { id: selected.id },
        { onSuccess: () => setDeleteOpen(false) }
      );
    }
  };

  // ─── Filtered list ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchVendor = s.vendor?.toLowerCase().includes(q) ?? false;
        const matchDesc = s.description?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchVendor && !matchDesc) return false;
      }
      return true;
    });
  }, [subscriptions, statusFilter, categoryFilter, searchTerm]);

  // ─── Summary cards data ──────────────────────────────────────────────────────

  const active = useMemo(() => subscriptions.filter((s) => s.isActive), [subscriptions]);

  const totalMonthlyCost = useMemo(
    () => active.reduce((sum, s) => sum + s.monthlyCost, 0),
    [active]
  );

  const totalAnnualCost = useMemo(
    () => active.reduce((sum, s) => sum + (s.annualCost ?? s.monthlyCost * 12), 0),
    [active]
  );

  const topCategory = useMemo(() => {
    if (active.length === 0) return null;
    const costByCategory: Record<string, number> = {};
    active.forEach((s) => {
      const cat = s.category || 'other';
      costByCategory[cat] = (costByCategory[cat] ?? 0) + s.monthlyCost;
    });
    const top = Object.entries(costByCategory).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    return {
      label: SUBSCRIPTION_CATEGORY_LABELS[top[0] as SubscriptionCategory] ?? top[0],
      cost: top[1],
    };
  }, [active]);

  // ─── Categories in use (for filter select) ───────────────────────────────────

  const categoriesInUse = useMemo(() => {
    const seen = new Set<string>();
    subscriptions.forEach((s) => { if (s.category) seen.add(s.category); });
    return Array.from(seen).sort();
  }, [subscriptions]);

  // ─── Totals for table footer ─────────────────────────────────────────────────

  const filteredActiveCount = filtered.filter((s) => s.isActive).length;
  const filteredMonthlyTotal = filtered
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + s.monthlyCost, 0);
  const filteredAnnualTotal = filtered
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + (s.annualCost ?? s.monthlyCost * 12), 0);

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppLayout
        title="Assinaturas"
        description="Catálogo de software e serviços SaaS utilizados pela empresa"
        breadcrumbs={[{ label: 'Assinaturas' }]}
      >
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Assinaturas"
      description="Catálogo de software e serviços SaaS utilizados pela empresa"
      breadcrumbs={[{ label: 'Assinaturas' }]}
      actions={
        canManage ? (
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Assinatura
          </Button>
        ) : undefined
      }
    >
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
              <p className="text-xl font-semibold text-foreground">{active.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <RefreshCw className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo Mensal Total</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(totalMonthlyCost)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <RefreshCw className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo Anual Total</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(totalAnnualCost)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <RefreshCw className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Maior Categoria</p>
              {topCategory ? (
                <>
                  <p className="text-base font-semibold text-foreground leading-tight">{topCategory.label}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(topCategory.cost)}/mês</p>
                </>
              ) : (
                <p className="text-xl font-semibold text-foreground">—</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, vendor ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categoriesInUse.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {SUBSCRIPTION_CATEGORY_LABELS[cat as SubscriptionCategory] ?? cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Empty state ── */}
      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <div className="rounded-full bg-muted p-4 mb-4">
            <RefreshCw className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Nenhuma assinatura cadastrada</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {canManage
              ? 'Comece adicionando os softwares e serviços SaaS utilizados pela empresa.'
              : 'Aguarde um administrador cadastrar assinaturas.'}
          </p>
          {canManage && (
            <Button onClick={handleAdd} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar Assinatura
            </Button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card">
          <Search className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nenhuma assinatura encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros ou o termo de busca.</p>
        </div>
      ) : (
        /* ── Table ── */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead className="text-right">Custo Mensal</TableHead>
                <TableHead className="text-right">Custo Anual</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow
                  key={sub.id}
                  className={cn(!sub.isActive && 'opacity-60')}
                >
                  {/* Nome */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{sub.name}</span>
                      {sub.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {sub.description}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Vendor */}
                  <TableCell>
                    {sub.vendor ? (
                      sub.url ? (
                        <a
                          href={sub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {sub.vendor}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm">{sub.vendor}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Categoria */}
                  <TableCell>
                    {sub.category ? (
                      <Badge
                        variant="outline"
                        className={CATEGORY_BADGE_CLASSES[sub.category] ?? CATEGORY_BADGE_CLASSES.other}
                      >
                        {SUBSCRIPTION_CATEGORY_LABELS[sub.category as SubscriptionCategory] ?? sub.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Ciclo */}
                  <TableCell className="text-sm">
                    {sub.billingCycle
                      ? BILLING_CYCLE_LABELS[sub.billingCycle as BillingCycle]
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  {/* Custo Mensal */}
                  <TableCell className="text-right font-medium">
                    {formatCurrency(sub.monthlyCost)}
                  </TableCell>

                  {/* Custo Anual */}
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(sub.annualCost ?? sub.monthlyCost * 12)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={sub.isActive ? 'default' : 'secondary'}>
                      {sub.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>

                  {/* Ações */}
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sub)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(sub)}>
                            {sub.isActive ? (
                              <>
                                <PowerOff className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(sub)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>

            {/* Footer totals */}
            {filteredActiveCount > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 4 : 4}
                    className="text-sm font-medium"
                  >
                    Total ({filteredActiveCount} ativa{filteredActiveCount !== 1 ? 's' : ''})
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(filteredMonthlyTotal)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(filteredAnnualTotal)}
                  </TableCell>
                  <TableCell colSpan={canManage ? 2 : 1} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </Card>
      )}

      {/* ── Dialogs ── */}
      <SubscriptionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        subscription={selected}
        onSubmit={handleFormSubmit}
        isPending={createSubscription.isPending || updateSubscription.isPending}
      />

      <DeleteSubscriptionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        subscription={selected}
        onConfirm={handleDeleteConfirm}
        isPending={deleteSubscription.isPending}
      />
    </AppLayout>
  );
};

export default Subscriptions;
