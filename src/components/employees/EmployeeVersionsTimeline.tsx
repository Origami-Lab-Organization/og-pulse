import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Check, Clock, History, X } from "lucide-react";
import { EmployeeVersionDB } from "@/services/employeeVersionService";
import { useCancelScheduledEmployeeVersion } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, todayLocalDateString } from "@/lib/formatters";
import { describeChanges } from "@/lib/employeeVersionDiff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface EmployeeVersionsTimelineProps {
  versions: EmployeeVersionDB[];
  isLoading?: boolean;
}

function formatRegisteredAt(iso: string) {
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function TimelineRow({
  dot,
  isLast,
  children,
}: {
  dot: React.ReactNode;
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        {dot}
        {!isLast && <div className="w-px flex-1 min-h-[12px] bg-border" />}
      </div>
      <div className="flex-1 min-w-0 pb-5">{children}</div>
    </div>
  );
}

export function EmployeeVersionsTimeline({ versions, isLoading }: EmployeeVersionsTimelineProps) {
  const { employee: currentEmployee } = useAuth();
  const isAdmin = !!currentEmployee?.isAdmin;
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const cancelVersion = useCancelScheduledEmployeeVersion();

  if (isLoading) {
    return (
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="mt-1 h-3 w-3 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pb-5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhum histórico de versões disponível.</p>
      </div>
    );
  }

  const todayStr = todayLocalDateString();

  return (
    <div>
      {versions.map((version, index) => {
        const isScheduled = version.effective_from > todayStr;
        const isActive = !isScheduled && !version.effective_until;
        const effectiveFrom = format(new Date(version.effective_from), "dd/MM/yyyy", { locale: ptBR });
        const effectiveUntil = version.effective_until
          ? format(new Date(version.effective_until), "dd/MM/yyyy", { locale: ptBR })
          : "Atual";
        const previous = versions[index + 1];
        const changes = describeChanges(version, previous);
        const isLast = index === versions.length - 1;

        const dotClassName = isScheduled
          ? "bg-background ring-2 ring-primary"
          : isActive
            ? "bg-primary"
            : "bg-muted-foreground/40";

        return (
          <TimelineRow
            key={version.id}
            isLast={isLast}
            dot={<div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", dotClassName)} />}
          >
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium">
                  Vigência: {effectiveFrom} → {effectiveUntil}
                </span>
                {isScheduled ? (
                  <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                    <Clock className="h-3 w-3" />
                    Agendado
                  </Badge>
                ) : isActive ? (
                  <Badge variant="default" className="gap-1">
                    <Check className="h-3 w-3" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary">Histórico</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Registrado em {formatRegisteredAt(version.created_at)}
              </p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="font-medium text-foreground">{version.cargo}</span>
                <span className="text-muted-foreground">
                  Salário bruto: <span className="text-foreground">{formatCurrency(version.salario_mensal)}</span>
                </span>
                <span className="text-muted-foreground">
                  Encargos: <span className="text-foreground">{formatCurrency(version.encargos)}</span>
                </span>
                <span className="text-muted-foreground">
                  Benefícios:{" "}
                  {version.total_benefits_cost != null ? (
                    <span className="text-foreground">{formatCurrency(version.total_benefits_cost)}</span>
                  ) : (
                    <span className="italic">atual</span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  Ferramentas:{" "}
                  {version.total_tools_cost != null ? (
                    <span className="text-foreground">{formatCurrency(version.total_tools_cost)}</span>
                  ) : (
                    <span className="italic">atual</span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  Jornada:{" "}
                  <span className="text-foreground">
                    {version.jornada_diaria || Math.round(version.jornada_mensal / 22)}h/dia
                  </span>
                </span>
              </div>

              {changes.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {changes.map((change) => (
                    <Badge key={change} variant="outline" className="text-xs font-normal">
                      {change}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {previous ? "—" : <em>Cadastro inicial</em>}
                </p>
              )}

              {isScheduled && isAdmin && (
                confirmCancelId === version.id ? (
                  <Alert variant="warning" className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Cancelar marco agendado?</AlertTitle>
                    <AlertDescription>
                      <p>
                        A alteração programada para {effectiveFrom} será cancelada e removida do
                        histórico. O período anterior volta a valer normalmente. Essa ação não pode ser
                        desfeita — se mudar de ideia, será preciso programar a alteração novamente.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancelVersion.isPending}
                          onClick={() => setConfirmCancelId(null)}
                        >
                          Manter
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={cancelVersion.isPending}
                          onClick={() =>
                            cancelVersion.mutate(
                              { versionId: version.id, employeeId: version.employee_id },
                              { onSuccess: () => setConfirmCancelId(null) },
                            )
                          }
                        >
                          {cancelVersion.isPending ? "Cancelando…" : "Sim, cancelar"}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 h-auto gap-1 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmCancelId(version.id)}
                  >
                    <X className="h-3 w-3" />
                    Cancelar alteração agendada
                  </Button>
                )
              )}
            </div>
          </TimelineRow>
        );
      })}
    </div>
  );
}
