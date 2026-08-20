import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MonthStatus, TeamMonthCell } from '@/types/equipe.types';

const PAST_MONTH_EDIT_REASONS = [
  { value: 'planning_error', label: 'Erro de planejamento' },
  { value: 'retroactive_adjustment', label: 'Ajuste retroativo de escopo' },
  { value: 'correction', label: 'Correção de lançamento' },
  { value: 'other', label: 'Outro' },
] as const;

type CellTone = 'empty' | 'ok' | 'warning' | 'critical';

// Cores de EXECUÇÃO (só mês vigente/passado, quando já há realizado a comparar).
function executionTone(plannedHours: number, realizedHours: number): CellTone {
  if (plannedHours === 0) return realizedHours > 0 ? 'critical' : 'empty';
  const ratio = realizedHours / plannedHours;
  if (ratio <= 1) return 'ok';
  if (ratio <= 1.1) return 'warning';
  return 'critical';
}

const TONE_CLASSES: Record<CellTone, string> = {
  empty: 'text-muted-foreground',
  ok: 'bg-primary-deep/10 text-primary-deep',
  warning: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
};

interface AllocationCellProps {
  cell: TeamMonthCell | undefined;
  editable: boolean;
  monthStatus: MonthStatus;
  isAdmin: boolean;
  onSave: (newHours: number, reasonCode?: string, justification?: string) => void;
}

export function AllocationCell({ cell, editable, monthStatus, isAdmin, onSave }: AllocationCellProps) {
  const plannedHours = cell?.plannedHours ?? 0;
  const realizedHours = cell?.realizedHours ?? null;
  const capacity = cell?.capacityHours ?? 0;
  const others = cell?.othersHours ?? 0;
  // Mês futuro = capacidade (sem realizado). Mês vigente/passado = execução.
  const isPastMonth = monthStatus === 'past';
  const isFuture = monthStatus === 'future';

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(plannedHours));
  const [pendingHours, setPendingHours] = useState<number | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    if (!editable) return;
    setDraft(String(plannedHours));
    setIsEditing(true);
  };

  const commit = () => {
    setIsEditing(false);
    const newHours = Math.max(0, Number(draft) || 0);
    if (newHours === plannedHours) return;
    if (isPastMonth && isAdmin) {
      setPendingHours(newHours);
      return;
    }
    onSave(newHours);
  };

  const confirmPastMonthEdit = () => {
    if (pendingHours === null || !reasonCode || justification.trim().length < 10) return;
    onSave(pendingHours, reasonCode, justification.trim());
    setPendingHours(null);
    setReasonCode('');
    setJustification('');
  };

  const cancelPastMonthEdit = () => {
    setPendingHours(null);
    setReasonCode('');
    setJustification('');
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        min={0}
        step={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        className="h-8 w-full text-center font-mono text-xs tabular-nums"
      />
    );
  }

  // Fração de CAPACIDADE (mês futuro): plan neste projeto / jornada mensal.
  const capacityPct = capacity > 0 ? Math.min(100, (plannedHours / capacity) * 100) : 0;
  const freeHours = Math.max(0, capacity - others - plannedHours);
  // Fração de EXECUÇÃO (mês vigente/passado): realizado / planejado.
  const tone = isFuture ? null : executionTone(plannedHours, realizedHours as number);
  const execPct = plannedHours > 0
    ? Math.min(100, ((realizedHours as number) / plannedHours) * 100)
    : (realizedHours as number) > 0
      ? 100
      : 0;
  // Sobrealocação = soma de TODOS os projetos do tenant no mês (fonte cross-projeto)
  // acima da capacidade. Rótulo explica o que é e o que fazer.
  const totalPlannedAllProjects = Math.round(plannedHours + others);
  const overallocationLabel = `Sobrealocado neste mês: ${totalPlannedAllProjects}h planejadas em todos os projetos para ${Math.round(capacity)}h de capacidade. Reduza ou redistribua as horas.`;

  const content = (
    <button
      type="button"
      onClick={startEdit}
      disabled={!editable}
      className={cn(
        'group relative flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors',
        isFuture ? 'text-foreground' : TONE_CLASSES[tone as CellTone],
        editable ? 'cursor-pointer hover:ring-1 hover:ring-primary-deep/40' : 'cursor-default',
      )}
    >
      {isFuture ? (
        <>
          <span className="font-mono text-sm font-semibold tabular-nums leading-none">
            {Math.round(plannedHours)}h
          </span>
          {capacity > 0 && (
            <>
              {/* Barra de CAPACIDADE — cor neutra (não é execução verde/amarelo/vermelho). */}
              <span className="flex h-1 w-12 overflow-hidden rounded-full bg-muted">
                <span className="h-full bg-muted-foreground/50" style={{ width: `${capacityPct}%` }} />
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground">
                de {Math.round(capacity)}h cap.
              </span>
            </>
          )}
        </>
      ) : (
        <>
          <span className="flex items-baseline gap-1">
            <span className="font-mono text-sm font-semibold tabular-nums">{Math.round(plannedHours)}h</span>
            <span className="font-mono text-[11px] tabular-nums opacity-40">/</span>
            <span className="font-mono text-[11px] tabular-nums opacity-70">{Math.round(realizedHours as number)}h</span>
          </span>
          {(plannedHours > 0 || (realizedHours as number) > 0) && (
            /* Barra de EXECUÇÃO — realizado/planejado, na cor do tom (currentColor). */
            <span className="flex h-1 w-12 overflow-hidden rounded-full bg-foreground/10">
              <span className="h-full bg-current" style={{ width: `${execPct}%` }} />
            </span>
          )}
        </>
      )}
      {cell?.isOverallocated && (
        <span
          className="absolute right-0.5 top-0.5 text-warning"
          role="img"
          aria-label={overallocationLabel}
          title={overallocationLabel}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden />
        </span>
      )}
      {isPastMonth && !editable && (
        <span className="absolute left-0.5 top-0.5 text-muted-foreground">
          <Lock className="h-2.5 w-2.5" aria-hidden />
        </span>
      )}
    </button>
  );

  // Mês futuro: tooltip de contexto do projeto (horas apenas, nunca custo).
  if (isFuture && capacity > 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {Math.round(plannedHours)}h neste projeto · {Math.round(others)}h em outros projetos ·{' '}
            {Math.round(freeHours)}h livres
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isPastMonth && !editable) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Apenas admin pode editar meses passados
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={pendingHours !== null} onOpenChange={(open) => !open && cancelPastMonthEdit()}>
      <PopoverTrigger asChild>{content}</PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="center">
        <p className="text-sm font-semibold text-foreground">Editar mês encerrado</p>
        <p className="text-xs text-muted-foreground">
          Alterar horas planejadas de {Math.round(plannedHours)}h para {pendingHours}h. Motivo e justificativa ficam
          registrados.
        </p>
        <Select value={reasonCode} onValueChange={setReasonCode}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Motivo" />
          </SelectTrigger>
          <SelectContent>
            {PAST_MONTH_EDIT_REASONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Justificativa (mín. 10 caracteres)"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          className="text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={cancelPastMonthEdit}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!reasonCode || justification.trim().length < 10}
            onClick={confirmPastMonthEdit}
            className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
          >
            Confirmar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
