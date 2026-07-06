import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Search,
  BarChart3,
  Clock,
  FileText,
  Briefcase,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MyProjectCard } from "@/components/my-projects/MyProjectCard";
import { useMyProjects, type MyProjectSummary } from "@/hooks/useMyProjects";
import { useAuth } from "@/contexts/AuthContext";
import { PORTFOLIO_COLUMNS } from "@/types/portfolio";
import { formatHours } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type MetricTone = "primary" | "secondary" | "warning";

const METRIC_TONES: Record<MetricTone, { chip: string; value: string }> = {
  primary: { chip: "bg-primary/10 text-primary", value: "text-primary" },
  secondary: { chip: "bg-secondary/10 text-secondary", value: "text-secondary" },
  warning: { chip: "bg-warning/10 text-warning", value: "text-warning" }
};

interface SummaryCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tone: MetricTone;
  ariaLabel: string;
}

function SummaryCard({
  icon: Icon,
  value,
  label,
  tone,
  ariaLabel
}: SummaryCardProps) {
  const t = METRIC_TONES[tone];
  return (
    <Card aria-label={ariaLabel}>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            t.chip
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className={cn("text-2xl font-bold leading-none", t.value)}>
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyProjects() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const isManager = employee?.is_gerente ?? false;
  const isAdmin = employee?.isAdmin ?? false;
  const isEmployeeOnly = !isManager && !isAdmin;
  const { data: projects = [], isLoading } = useMyProjects();

  const handleOpenDetail = (project: MyProjectSummary) => {
    // CA-01: projeto em preparação não abre a view de execução para o consultor
    if (project.portfolioStage === "planning" && isEmployeeOnly) {
      toast.info(
        "Este projeto ainda está em fase de planejamento. O gerente de projetos irá notificá-lo quando iniciar."
      );
      return;
    }
    if (isAdmin || isManager) {
      navigate(`/projects/${project.id}`);
    } else {
      navigate(`/my-projects/${project.id}`);
    }
  };

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.client.tradingName ?? p.client.companyName)
          .toLowerCase()
          .includes(q);
      const matchesStage =
        stageFilter === "all" || p.portfolioStage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [projects, search, stageFilter]);

  const activeCount = useMemo(
    () => projects.filter((p) => p.status === "active").length,
    [projects]
  );

  const totalHoursPerMonth = useMemo(
    () => projects.reduce((sum, p) => sum + p.myHoursPerMonth, 0),
    [projects]
  );

  const managerProjectsCount = useMemo(
    () => projects.filter((p) => p.manager?.nome === employee?.nome).length,
    [projects, employee?.nome]
  );

  const totalHoursActual = useMemo(
    () => projects.reduce((sum, p) => sum + p.totalHoursActual, 0),
    [projects]
  );

  const pageDescription = isEmployeeOnly
    ? "Acompanhe os projetos em que você está alocado"
    : "Visão pessoal dos projetos em que você participa como membro da equipe";

  if (isLoading) {
    return (
      <AppLayout title="Meus Projetos" description={pageDescription}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Meus Projetos" description={pageDescription}>
      <div className="space-y-6">
        {/* Painel de resumo */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            icon={BarChart3}
            value={activeCount}
            label="Projetos ativos"
            tone="primary"
            ariaLabel={`${activeCount} projeto${activeCount !== 1 ? "s" : ""} ativo${activeCount !== 1 ? "s" : ""}`}
          />
          <SummaryCard
            icon={Clock}
            value={formatHours(totalHoursPerMonth)}
            label="Horas/mês alocadas"
            tone="secondary"
            ariaLabel={`${totalHoursPerMonth} horas por mês alocadas`}
          />
          {isEmployeeOnly ? (
            <SummaryCard
              icon={FileText}
              value={formatHours(totalHoursActual)}
              label="Horas lançadas (total)"
              tone="warning"
              ariaLabel={`${totalHoursActual} horas lançadas no total`}
            />
          ) : (
            <SummaryCard
              icon={Briefcase}
              value={managerProjectsCount}
              label="Projetos como GP"
              tone="warning"
              ariaLabel={`${managerProjectsCount} projeto${managerProjectsCount !== 1 ? "s" : ""} como gerente de projetos`}
            />
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por projeto ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Todos os estágios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              {PORTFOLIO_COLUMNS.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grade de projetos / estado vazio */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
            {search || stageFilter !== "all" ? (
              <>
                <div className="mb-4 rounded-full bg-muted p-4">
                  <FolderKanban className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">
                  Nenhum projeto encontrado
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Tente ajustar os filtros de busca.
                </p>
              </>
            ) : isEmployeeOnly ? (
              <>
                <div className="mb-4 rounded-full bg-muted p-3">
                  <FolderKanban className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">
                  Você ainda não está alocado em projetos
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Quando um gerente de projetos alocar você, seus projetos
                  aparecerão aqui.
                </p>
              </>
            ) : (
              <>
                <div className="mb-4 rounded-full bg-muted p-4">
                  <FolderKanban className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">
                  Nenhum projeto com sua participação
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Você não está alocado como membro em nenhum projeto ativo.
                  Projetos que você gerencia estão disponíveis em "Projetos".
                </p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => navigate("/projects")}
                >
                  <FolderKanban className="h-4 w-4" />
                  Ir para Projetos
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => (
              <MyProjectCard
                key={project.id}
                project={project}
                isEmployeeOnly={isEmployeeOnly}
                onOpenDetail={handleOpenDetail}
                onLogHours={() => navigate("/my-timesheet")}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
