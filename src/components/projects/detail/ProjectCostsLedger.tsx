import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useDeleteProjectCost } from "@/hooks/useProjectCostItems";
import { ProjectCostFormDialog } from "./ProjectCostFormDialog";
import type { ProjectCostCategory, ProjectCostDB } from "@/types/project";

interface ProjectCostsLedgerProps {
  projectId: string;
  costs: ProjectCostDB[];
  /** Usuário pode gerenciar custos deste projeto (GP ou Admin, projeto não read-only). */
  canManage: boolean;
  /** Admin edita inclusive em mês fechado. */
  isAdmin: boolean;
}

type FilterValue = "all" | ProjectCostCategory;

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
}: ProjectCostsLedgerProps) {
  const formatCurrency = useMaskedCurrency();
  const { toast } = useToast();
  const deleteCost = useDeleteProjectCost();

  const [filter, setFilter] = useState<FilterValue>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectCostDB | null>(null);
  const [toDelete, setToDelete] = useState<ProjectCostDB | null>(null);

  const visibleCosts = useMemo(
    () =>
      filter === "all" ? costs : costs.filter((c) => c.category === filter),
    [costs, filter],
  );

  // Categoria default ao adicionar: a do filtro (se específico) ou Fornecedor.
  const defaultCategory: ProjectCostCategory =
    filter === "all" ? "supplier" : filter;

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
            </SelectContent>
          </Select>
          {canManage && visibleCosts.length > 0 && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar custo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {visibleCosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "Nenhum custo cadastrado."
                : `Nenhum custo de ${COST_CATEGORY_LABEL[filter].toLowerCase()} cadastrado.`}
            </p>
            {canManage && (
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
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  {canManage && (
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCosts.map((cost) => {
                  const closed = isCostMonthClosed(cost.cost_date ?? "");
                  const editable =
                    canManage && canEditCost(cost.cost_date ?? "", isAdmin);
                  const note = currencyNote(cost);
                  const Icon = CATEGORY_ICON[cost.category];
                  return (
                    <TableRow key={cost.id}>
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
                      <TableCell className="whitespace-nowrap">
                        {cost.cost_date ? formatShortDate(cost.cost_date) : "–"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(cost.planned_amount_brl))}
                      </TableCell>
                      <TableCell className="text-right">
                        {cost.actual_amount_brl != null ? (
                          formatCurrency(Number(cost.actual_amount_brl))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(cost)}
                              disabled={!editable}
                              aria-label={`Editar ${cost.description}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => requestDelete(cost)}
                              disabled={!editable}
                              aria-label={`Excluir ${cost.description}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
