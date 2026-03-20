import { Loader2, AlertCircle, Check } from "lucide-react";
import type { SaveStatusInfo } from "@/components/timesheets/TimesheetWeekRow";

interface GlobalSaveIndicatorProps {
  saveStatuses: Record<string, SaveStatusInfo>;
}

export function GlobalSaveIndicator({ saveStatuses }: GlobalSaveIndicatorProps) {
  const statuses = Object.values(saveStatuses);

  if (statuses.some((s) => s.status === "saving")) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto shrink-0">
        <Loader2 className="h-3 w-3 animate-spin" />
        Salvando...
      </span>
    );
  }

  if (statuses.some((s) => s.status === "error")) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive ml-auto shrink-0">
        <AlertCircle className="h-3 w-3" />
        Erro ao salvar
      </span>
    );
  }

  if (statuses.some((s) => s.status === "retrying")) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-600 ml-auto shrink-0">
        <Loader2 className="h-3 w-3 animate-spin" />
        Tentando novamente...
      </span>
    );
  }

  if (statuses.some((s) => s.status === "unsaved")) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto shrink-0">
        Alterações não salvas
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-green-600 ml-auto shrink-0">
      <Check className="h-3 w-3" />
      Tudo salvo
    </span>
  );
}
