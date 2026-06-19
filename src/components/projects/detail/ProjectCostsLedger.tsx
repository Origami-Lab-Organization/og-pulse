import { useMemo, useState } from "react";
import { Plus, Lock, MoreHorizontal, CreditCard, Pencil, Trash2, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMaskedCurrency } from "@/contexts/HideValuesContext";
import { useToast } from "@/hooks/use-toast";
import { formatShortDate } from "@/lib/formatters";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABEL,
  CLOSED_MONTH_MESSAGE,
  canEditCost,
  isCostMonthClosed,
} from "@/lib/projectCosts";
import { useCancelProjectCost, useDeleteProjectCost } from "@/hooks/useProjectCostItems";
import type { ReimbursementRequest } from "@/hooks/useReimbursements";
import { ProjectCostFormDialog } from "./ProjectCostFormDialog";
import { ProjectCostPayDialog } from "./ProjectCostPayDialog";
import type { ProjectCostCategory, ProjectCostDB } from "@/types/project";

type EnrichedReimbursement = ReimbursementRequest & { requester_name?: string };

interface ProjectCostsLedgerProps {
  projectId: string;
  costs: ProjectCostDB[];
  /** Usuário pode gerenciar custos deste projeto (GP ou Admin, projeto não read-only). */
  canManage: boolean;
  /** Admin edita inclusive em mês fechado. */
  isAdmin: boolean;
  reimbursements?: EnrichedReimbursement[];
}

type FilterValue = "all" | ProjectCostCategory | "reimbursement";

type LedgerRow =
  | { kind: "cost"; data: ProjectCostDB; sortDate: string }
  | { kind: "reimbursement"; data: EnrichedReimbursement; sortDate: string };

const CATEGORY_ICON = Object.fromEntries(
  COST_CATEGORIES.map((c) => [c.value, c.icon]),
) as Record<ProjectCostCategory, (typeof COST_CATEGORIES)[number]["icon"]>;

const currencyNote = (cost: ProjectCostDB) =>
  cost.original_currency !== "BRL"
    ? `${cost.original_currency} ${Number(cost.planned_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · câmbio ${Number(cost.exchange_rate).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : null;


export function ProjectCostsLedger({
  projectId,
  costs,
  canManage,
  isAdmin,
  reimbursements = [],
}: ProjectCostsLedgerProps) {
  const formatCurrency = useMaskedCurrency();
  const { toast } = useToast();
  const deleteCost = useDeleteProjectCost();
  const cancelCost = useCancelProjectCost();

  const [filter, setFilter] = useState<FilterValue>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectCostDB | null>(null);
  const [toDelete, setToDelete] = useState<ProjectCostDB | null>(null);
  const [toPay, setToPay] = useState<ProjectCostDB | null>(null);

  const allRows = useMemo<LedgerRow[]>(() => {
    const costRows: LedgerRow[] = costs.map((c) => ({
      kind: "cost",
      data: c,
      sortDate: c.cost_date ?? c.created_at,
    }));
    const rRows: LedgerRow[] = reimbursements.map((r) => ({
      kind: "reimbursement",
      data: r,
      sortDate: r.paid_at ?? r.reviewed_at ?? r.created_at,
    }));
    return [...costRows, ...rRows].sort((a, b) =>
      b.sortDate.localeCompare(a.sortDate),
    );
  }, [costs, reimbursements]);

  const visibleRows = useMemo<LedgerRow[]>(() => {
    if (filter === "all") return allRows;
    if (filter === "reimbursement") {
      return allRows.filter((r) => r.kind === "reimbursement");
    }
    return allRows.filter(
      (r) => r.kind === "cost" && r.data.category === filter,
    );
  }, [allRows, filter]);

  const defaultCategory: ProjectCostCategory =
    filter === "all" || filter === "reimbursement" ? "supplier" : filter;

  const emptyLabel =
    filter === "reimbursement"
      ? "Nenhum reembolso lançado neste projeto."
      : filter === "all"
        ? "Nenhum custo cadastrado."
        : `Nenhum custo de ${COST_CATEGORY_LABEL[filter].toLowerCase()} cadastrado.`;

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (cost: ProjectCostDB) => {
    if (!canEditCost(cost.cost_date ?? "", isAdmin)) {
      toast({ title: CLOSED_MONTH_MESSAGE, variant: "destructive" });
      return;
    }
    setEditing(cost);
    setDialogOpen(true);
  };

  const requestDelete = (cost: ProjectCostDB) => {
    if (!canEditCost(cost.cost_date ?? "", isAdmin)) {
      toast({ title: CLOSED_MONTH_MESSAGE, variant: "destructive" });
      return;
    }
    setToDelete(cost);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteCost.mutate({ id: toDelete.id, projectId });
    setToDelete(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Custos </CardTitle>
          <CardDescription>
            Fornecedores, assinaturas, aluguéis, materiais, viagens e outros
            custos do projeto.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as FilterValue)}
          >
            <SelectTrigger className="w-[200px]" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {COST_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
              <SelectItem value="reimbursement">Reembolsos</SelectItem>
            </SelectContent>
          </Select>
          {canManage && visibleRows.length > 0 && filter !== "reimbursement" && (
            <Button
              size="sm"
              onClick={openAdd}
              className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar custo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {visibleRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
            {canManage && filter !== "reimbursement" && (
              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar primeiro custo
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Criado em</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Pago em</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  {canManage && (
                    <TableHead className="w-12" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => {
                  if (row.kind === "reimbursement") {
                    const r = row.data;
                    const paidDateStr = r.paid_at ?? r.reviewed_at;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatShortDate(r.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                            {r.description}
                            <Badge
                              variant="outline"
                              className="border-transparent bg-primary-deep/10 text-primary-deep text-xs shrink-0 hover:bg-primary-deep/10"
                            >
                              Reembolso
                            </Badge>
                          </div>
                          {r.requester_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {r.requester_name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.expense_type ? (
                            <span className="text-sm text-muted-foreground">
                              {r.expense_type}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge className="border-0 bg-primary-deep/10 text-primary-deep text-xs hover:bg-primary-deep/10">
                            Pago
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {paidDateStr ? formatShortDate(paidDateStr) : "–"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-muted-foreground">—</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(r.total_amount))}
                        </TableCell>
                        {canManage && <TableCell />}
                      </TableRow>
                    );
                  }

                  const cost = row.data;
                  const closed = isCostMonthClosed(cost.cost_date ?? "");
                  const isPaid = cost.status === "paid";
                  const isCancelled = cost.status === "cancelled";
                  // Apenas itens "planejado" em mês aberto são editáveis.
                  // Pago e cancelado são estados terminais — sem ações.
                  const editable =
                    canManage &&
                    !isPaid &&
                    !isCancelled &&
                    canEditCost(cost.cost_date ?? "", isAdmin);
                  const note = currencyNote(cost);
                  const Icon = CATEGORY_ICON[cost.category];
                  return (
                    <TableRow key={cost.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatShortDate(cost.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          {cost.description}
                          {closed && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock
                                  className="h-3.5 w-3.5 text-muted-foreground"
                                  aria-label="Mês fechado"
                                />
                              </TooltipTrigger>
                              <TooltipContent>Mês fechado</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {note && (
                          <p className="text-xs text-muted-foreground">
                            {note}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          {Icon && (
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          {COST_CATEGORY_LABEL[cost.category]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isPaid ? (
                          <Badge className="border-0 bg-primary-deep/10 text-primary-deep text-xs hover:bg-primary-deep/10">
                            Pago
                          </Badge>
                        ) : isCancelled ? (
                          <Badge className="bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-0 text-xs hover:bg-slate-100">
                            Cancelado
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-0 text-xs hover:bg-slate-200">
                            Planejado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {isPaid
                          ? cost.cost_date
                            ? formatShortDate(cost.cost_date)
                            : "–"
                          : "–"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(cost.planned_amount_brl))}
                      </TableCell>
                      <TableCell className="text-right">
                        {isPaid ? (
                          formatCurrency(Number(cost.actual_amount_brl))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Ações para ${cost.description}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {editable && (
                                <>
                                  <DropdownMenuItem onClick={() => setToPay(cost)}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Pagar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => cancelCost.mutate({ id: cost.id, projectId })}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancelar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEdit(cost)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => requestDelete(cost)}
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ProjectCostFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        category={editing ? editing.category : defaultCategory}
        cost={editing}
      />

      <ProjectCostPayDialog
        open={!!toPay}
        onOpenChange={(o) => !o && setToPay(null)}
        projectId={projectId}
        cost={toPay}
      />

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir custo</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir custo &lsquo;{toDelete?.description}&rsquo;? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
