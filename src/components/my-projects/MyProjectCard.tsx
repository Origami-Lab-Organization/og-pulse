import {
  Building2,
  Calendar,
  Clock,
  ListTodo,
  AlertTriangle,
  Flag,
  Hourglass,
  MoreHorizontal,
  Eye
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import type { MyProjectSummary } from "@/hooks/useMyProjects";
import {
  PORTFOLIO_COLUMNS,
  PORTFOLIO_STAGE_LABELS,
  PortfolioStage
} from "@/types/portfolio";
import { SERVICE_LINE_LABELS } from "@/types/lead";
import { formatDate, formatHours } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function getStageBadgeClass(stage: string): string {
  const col = PORTFOLIO_COLUMNS.find((c) => c.id === stage);
  const base = col?.color ?? "bg-muted text-muted-foreground";
  // Reaplica a própria cor no hover, sobrescrevendo o hover verde (primary)
  // herdado da variante default do Badge.
  const hover = base
    .split(" ")
    .filter((c) => c.includes("bg-"))
    .map((c) =>
      c.startsWith("dark:") ? `dark:hover:${c.slice(5)}` : `hover:${c}`
    )
    .join(" ");
  return `${base} ${hover}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

// Ícones de metadados — tom levemente mais escuro que o texto para legibilidade
const META_ICON = "text-foreground/60";

// Status operacional → cor do "dot" (token semântico)
const STATUS_DOT: Record<string, { label: string; dot: string; pulse?: boolean }> =
  {
    active: { label: "Ativo", dot: "bg-success", pulse: true },
    paused: { label: "Pausado", dot: "bg-warning" },
    planning: { label: "Em planejamento", dot: "bg-secondary" }
  };

type Member = MyProjectSummary["members"][number];

interface MyProjectCardProps {
  project: MyProjectSummary;
  isEmployeeOnly: boolean;
  onOpenDetail: (project: MyProjectSummary) => void;
  onLogHours: () => void;
}

export function MyProjectCard({
  project,
  isEmployeeOnly,
  onOpenDetail,
  onLogHours
}: MyProjectCardProps) {
  const { employee } = useAuth();
  const clientName = project.client.tradingName ?? project.client.companyName;
  const isPlanning = project.portfolioStage === "planning";
  // CA-01: consultor não acessa o detalhe do projeto em preparação
  const isLocked = isPlanning && isEmployeeOnly;

  const stageLabel = isPlanning
    ? "Em preparação"
    : (PORTFOLIO_STAGE_LABELS[project.portfolioStage as PortfolioStage] ??
      project.portfolioStage);
  const serviceLabel = project.serviceLine
    ? (SERVICE_LINE_LABELS[project.serviceLine] ?? null)
    : null;

  // Prazo do projeto (início → fim) — exibido como ícone+tooltip no topo
  const periodText =
    project.isContinuous && !project.endDate
      ? `${formatDate(project.startDate)} · Contínuo`
      : project.endDate
        ? `${formatDate(project.startDate)} → ${formatDate(project.endDate)}`
        : formatDate(project.startDate);

  const hasPlanned = project.totalHoursPlanned > 0;
  const hoursPercent = hasPlanned
    ? Math.min(
        100,
        Math.round((project.totalHoursActual / project.totalHoursPlanned) * 100)
      )
    : 0;
  const isOverLimit = hoursPercent > 90;
  const isHighConsumption = hoursPercent > 70 && !isOverLimit;
  const barColorClass = isOverLimit
    ? "bg-destructive"
    : isHighConsumption
      ? "bg-warning"
      : "bg-primary";
  const progressMsg = isOverLimit
    ? "Atenção: horas próximas do limite planejado"
    : isHighConsumption
      ? "Consumo de horas elevado"
      : "Dentro do planejado";

  const status = STATUS_DOT[project.status] ?? null;

  // Equipe: mostra só o avatar de quem está logado (ou o 1º) + badge "+N".
  // O total (+N) usa membersCount (contagem real, independente do embed de
  // nomes); a lista exibe quem temos nome e sinaliza os demais.
  const members = project.members;
  const self = members.find((m) => m.nome === employee?.nome);
  const lead: Member | undefined = self ?? members[0];
  const others = members.filter((m) => m !== lead);
  const knownMembers = lead ? [lead, ...others] : [];
  const extraCount = Math.max(0, project.membersCount - 1);
  const hiddenCount = Math.max(0, project.membersCount - knownMembers.length);

  return (
    <TooltipProvider>
      <Card
        role="article"
        aria-label={project.name}
        onClick={() => onOpenDetail(project)}
        className={cn(
          "cursor-pointer transition-shadow duration-200 hover:border-primary/30 hover:shadow-md",
          isLocked && "border-dashed"
        )}
      >
        <CardContent className="p-4">
          {/* Cabeçalho: badges + ações */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge
                className={cn(
                  "gap-1 border-0",
                  getStageBadgeClass(project.portfolioStage)
                )}
              >
                {isPlanning && <Hourglass className="h-3 w-3" />}
                {stageLabel}
              </Badge>
              {serviceLabel && (
                <Badge
                  variant="outline"
                  className="font-normal text-muted-foreground"
                >
                  {serviceLabel}
                </Badge>
              )}
              {status && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "ml-0.5 h-2 w-2 shrink-0 rounded-full",
                        status.dot,
                        status.pulse && "animate-pulse"
                      )}
                      aria-label={`Status: ${status.label}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{status.label}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Action bar discreto */}
            <div
              className="flex shrink-0 items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prazo do projeto — ícone + tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    role="img"
                    aria-label={`Prazo do projeto: ${periodText}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Calendar className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">Prazo</p>
                  <p className="text-xs text-muted-foreground">{periodText}</p>
                </TooltipContent>
              </Tooltip>
              {isEmployeeOnly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isLocked}
                      aria-label={`Lançar horas no projeto ${project.name}`}
                      onClick={onLogHours}
                      className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {isLocked
                        ? "Disponível quando o projeto iniciar"
                        : "Lançar horas"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Mais opções do projeto ${project.name}`}
                    className="h-7 w-7 text-muted-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onOpenDetail(project)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {isEmployeeOnly ? "Ver detalhes" : "Abrir projeto"}
                  </DropdownMenuItem>
                  {isEmployeeOnly && (
                    <DropdownMenuItem disabled={isLocked} onClick={onLogHours}>
                      <Clock className="mr-2 h-4 w-4" />
                      Lançar horas
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Título — âncora visual do card */}
          <h3 className="mt-2.5 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground">
            {project.name}
          </h3>

          {/* Cliente + atividades atribuídas (metadados) */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Building2 className={cn("h-3.5 w-3.5 shrink-0", META_ICON)} />
              <span className="truncate">{clientName}</span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex shrink-0 cursor-default items-center gap-1.5">
                  <ListTodo className={cn("h-3.5 w-3.5 shrink-0", META_ICON)} />
                  {project.assignedActivitiesCount}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {project.assignedActivitiesCount === 1
                    ? "1 atividade atribuída a você (em aberto)"
                    : `${project.assignedActivitiesCount} atividades atribuídas a você (em aberto)`}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Métricas */}
          <div className="mt-3 space-y-3">
            {/* Progresso de horas */}
            {hasPlanned ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-default space-y-1.5">
                    {/* Linha de rótulo + valores absolutos */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        Horas consumidas
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs tabular-nums">
                          <span className="font-semibold text-foreground">
                            {formatHours(project.totalHoursActual)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {formatHours(project.totalHoursPlanned)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            ({hoursPercent}%)
                          </span>
                        </span>
                        {(isOverLimit || isHighConsumption) && (
                          <AlertTriangle
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isOverLimit ? "text-destructive" : "text-warning"
                            )}
                          />
                        )}
                      </span>
                    </div>
                    {/* Barra logo abaixo da linha de texto */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        role="progressbar"
                        aria-valuenow={hoursPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${formatHours(
                          project.totalHoursActual
                        )} de ${formatHours(
                          project.totalHoursPlanned
                        )} horas consumidas (${hoursPercent}%)`}
                        className={cn(
                          "h-full rounded-full transition-all",
                          barColorClass
                        )}
                        style={{ width: `${hoursPercent}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs text-muted-foreground">{progressMsg}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Horas consumidas
                  </span>
                  <span className="text-xs tabular-nums">
                    <span className="font-semibold text-foreground">
                      {formatHours(project.totalHoursActual)}
                    </span>
                    <span className="text-muted-foreground"> / a planejar</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" />
              </div>
            )}

            {/* Rodapé: próximo marco + equipe */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center text-[11px] text-muted-foreground">
                {project.nextMilestone && (
                  <span className="flex min-w-0 items-center gap-1">
                    <Flag className="h-3 w-3 shrink-0 text-primary" />
                    <span className="truncate">
                      {project.nextMilestone.title} ·{" "}
                      {formatDate(project.nextMilestone.date)}
                    </span>
                  </span>
                )}
              </div>

              {/* Cluster da equipe — avatar inteiro abre o popover */}
              {lead && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Ver equipe (${project.membersCount} ${
                        project.membersCount === 1 ? "membro" : "membros"
                      })`}
                      className="flex shrink-0 items-center gap-1 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Avatar className="h-6 w-6 ring-2 ring-background">
                        {lead.fotoUrl && (
                          <AvatarImage src={lead.fotoUrl} alt={lead.nome} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                          {getInitials(lead.nome)}
                        </AvatarFallback>
                      </Avatar>
                      {extraCount > 0 && (
                        <span className="flex h-6 items-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                          +{extraCount}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-60 p-2">
                    <p className="px-1 pb-1.5 text-xs font-medium">
                      Equipe ({project.membersCount})
                    </p>
                    <ul className="space-y-0.5">
                      {knownMembers.map((m, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded px-1 py-1"
                        >
                          <Avatar className="h-5 w-5">
                            {m.fotoUrl && (
                              <AvatarImage src={m.fotoUrl} alt={m.nome} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-[8px] text-primary">
                              {getInitials(m.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {m.nome}
                          </span>
                          {m.cargo && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {m.cargo}
                            </span>
                          )}
                        </li>
                      ))}
                      {hiddenCount > 0 && (
                        <li className="px-1 py-1 text-[11px] text-muted-foreground">
                          +{hiddenCount}{" "}
                          {hiddenCount === 1
                            ? "outro membro"
                            : "outros membros"}
                        </li>
                      )}
                    </ul>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
