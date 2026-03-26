import { useState, useMemo } from "react";
import {
  ClipboardList,
  Search,
  Plus,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import { JobOpeningFormSheet } from "@/components/job-openings/JobOpeningFormSheet";
import { useJobOpenings, useDeleteJobOpening } from "@/hooks/useJobOpenings";
import {
  JobOpeningDB,
  JobOpeningStatus,
  JOB_OPENING_STATUS_LABELS,
  REGIME_LABELS,
  MODALIDADE_LABELS
} from "@/types/jobOpening";
import { useAuth } from "@/contexts/AuthContext";

function formatSalary(de: number | null, ate: number | null): string {
  if (!de && !ate) return "";
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  if (de && ate) return `R$ ${fmt(de)} – R$ ${fmt(ate)}`;
  if (de) return `A partir de R$ ${fmt(de)}`;
  return `Até R$ ${fmt(ate!)}`;
}

const STATUS_BADGE: Record<JobOpeningStatus, string> = {
  aberta:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  rascunho:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  encerrada:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "aberta", label: "Abertas" },
  { value: "rascunho", label: "Rascunhos" },
  { value: "encerrada", label: "Encerradas" }
];

export default function JobOpenings() {
  const { employee } = useAuth();
  const { data: jobOpenings = [], isLoading } = useJobOpenings();
  const deleteJobOpening = useDeleteJobOpening();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedOpening, setSelectedOpening] = useState<JobOpeningDB | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<JobOpeningDB | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return jobOpenings.filter((o) => {
      const matchesSearch =
        !q ||
        o.titulo.toLowerCase().includes(q) ||
        o.area.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobOpenings, search, statusFilter]);

  const abertas = useMemo(
    () => jobOpenings.filter((o) => o.status === "aberta").length,
    [jobOpenings]
  );
  const rascunhos = useMemo(
    () => jobOpenings.filter((o) => o.status === "rascunho").length,
    [jobOpenings]
  );

  const prazoProximo = useMemo(() => {
    const now = new Date();
    const limit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return jobOpenings.filter((o) => {
      if (!o.prazo_candidaturas || o.status !== "aberta") return false;
      const d = new Date(o.prazo_candidaturas);
      return d >= now && d <= limit;
    }).length;
  }, [jobOpenings]);

  const handleEdit = (opening: JobOpeningDB) => {
    setSelectedOpening(opening);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedOpening(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setSelectedOpening(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteJobOpening.mutateAsync(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null)
    });
  };

  const handleCopyLink = (opening: JobOpeningDB) => {
    const path =
      opening.public_url ??
      `/trabalhe-conosco/${employee?.tenant_id}/${opening.id}`;
    const url = path.startsWith("http")
      ? path
      : `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(opening.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (isLoading) {
    return (
      <AppLayout
        title="Vagas"
        description="Gerencie as vagas em aberto da empresa."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-5 space-y-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Vagas"
      description="Gerencie as vagas em aberto da empresa."
      actions={
        <Button onClick={handleNew} size="sm">
          <Plus className="h-4 w-4" />
          Abrir nova vaga
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {abertas}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {abertas === 1 ? "Vaga aberta" : "Vagas abertas"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {rascunhos}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rascunhos === 1 ? "Rascunho" : "Rascunhos"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-primary">{prazoProximo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prazo nos próximos 7 dias
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou área..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
            {search || statusFilter !== "all" ? (
              <>
                <div className="rounded-full bg-muted p-4 mb-4">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nenhuma vaga encontrada</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Tente ajustar os filtros de busca.
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-4 mb-4">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nenhuma vaga cadastrada</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Crie a primeira vaga para começar a receber candidatos.
                </p>
                <Button
                  onClick={handleNew}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Abrir nova vaga
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((opening) => {
              const salaryText = opening.nao_divulgar_salario
                ? "A combinar"
                : formatSalary(opening.salario_de, opening.salario_ate);

              const isPrazoProximo =
                opening.prazo_candidaturas &&
                opening.status === "aberta" &&
                (() => {
                  const now = new Date();
                  const limit = new Date(
                    now.getTime() + 7 * 24 * 60 * 60 * 1000
                  );
                  const d = new Date(opening.prazo_candidaturas!);
                  return d >= now && d <= limit;
                })();

              return (
                <Card
                  key={opening.id}
                  className="group hover:border-primary/50 hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="pt-4 pb-4 space-y-3">
                    {/* Header: status + area */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        className={cn(
                          "text-xs border shrink-0",
                          STATUS_BADGE[opening.status]
                        )}
                      >
                        {JOB_OPENING_STATUS_LABELS[opening.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {opening.area}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="font-semibold text-base leading-snug line-clamp-2">
                      {opening.titulo}
                    </p>

                    {/* Meta: regime + modalidade */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {REGIME_LABELS[opening.regime_contratacao]}
                      </span>
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {MODALIDADE_LABELS[opening.modalidade]}
                      </span>
                      {opening.senioridade && (
                        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                          {opening.senioridade}
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    {opening.localizacao && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{opening.localizacao}</span>
                      </div>
                    )}

                    {/* Salary */}
                    {salaryText && (
                      <p className="text-sm font-medium text-foreground">
                        {salaryText}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {opening.prazo_candidaturas ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    "flex items-center gap-1 cursor-default",
                                    isPrazoProximo &&
                                      "text-amber-600 dark:text-amber-400 font-medium"
                                  )}
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  Prazo:{" "}
                                  {formatDate(opening.prazo_candidaturas)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Prazo para candidaturas
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(opening.created_at)}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {opening.status === "aberta" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleCopyLink(opening)}
                                >
                                  {copiedId === opening.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {copiedId === opening.id
                                    ? "Link copiado!"
                                    : "Copiar link público"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(opening)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Editar vaga</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(opening)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Remover vaga</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Sheet */}
      <JobOpeningFormSheet
        open={formOpen}
        onOpenChange={handleFormClose}
        jobOpening={selectedOpening}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vaga</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a vaga{" "}
              <strong>{deleteTarget?.titulo}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
