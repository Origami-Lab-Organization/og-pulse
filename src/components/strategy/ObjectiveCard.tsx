import { Pencil, Trash2, TrendingUp, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getStrategyObjectiveStatus, strategyObjectiveStatusConfig } from '@/lib/strategyObjectiveStatus';
import { cn } from '@/lib/utils';
import { StrategyObjectiveWithKrs, StrategyKeyResult, getKrStatus, getKrProgress } from '@/types/strategy';

interface ObjectiveCardProps {
  objective: StrategyObjectiveWithKrs;
  onClick: () => void;
  onAddKr: () => void;
  onCheckin: (krId: string) => void;
  onDeleteObjective: () => void;
  onEditObjective?: () => void;
  canManageOkrs: boolean;
  cycleIsActive: boolean;
}

function KrRow({
  kr,
  onCheckin,
  cycleIsActive,
  canManageOkrs,
}: {
  kr: StrategyKeyResult;
  onCheckin: () => void;
  cycleIsActive: boolean;
  canManageOkrs: boolean;
}) {
  const status = getKrStatus(kr.confidence);
  const progress = getKrProgress(kr.currentValue, kr.targetValue, kr.direction, kr.initialValue);
  const cfg = strategyObjectiveStatusConfig[status];

  return (
    <div className="py-2.5 border-b last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium leading-snug flex-1">{kr.title}</p>
        {canManageOkrs && cycleIsActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] shrink-0"
            onClick={(e) => { e.stopPropagation(); onCheckin(); }}
          >
            Check-in
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress value={progress} className={cn('h-1.5', cfg.progressClass)} />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
          {progress}%
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-[11px] font-semibold shrink-0',
            status === 'green'
              ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'amber'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400',
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {kr.confidence}/10
        </span>
      </div>

    </div>
  );
}

export function ObjectiveCard({
  objective,
  onClick,
  onAddKr,
  onCheckin,
  onDeleteObjective,
  onEditObjective,
  canManageOkrs,
  cycleIsActive,
}: ObjectiveCardProps) {
  const cfg = getStrategyObjectiveStatus(objective.avgConfidence);

  return (
    <Card
      className="flex flex-col cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn('text-[11px] font-semibold', cfg.className)}>
                <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', cfg.dot)} />
                {cfg.label}
              </Badge>
              {objective.avgProgress > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {objective.avgProgress}% médio
                </span>
              )}
            </div>
            <h3 className="font-semibold text-base leading-snug">{objective.title}</h3>
            {objective.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {objective.description}
              </p>
            )}
            {objective.ownerName && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <User className="h-3 w-3" />
                {objective.ownerName}
              </p>
            )}
          </div>

          {canManageOkrs && cycleIsActive && (
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onEditObjective?.(); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDeleteObjective(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-4 pb-4">
        {objective.keyResults.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhum Key Result cadastrado.</p>
        ) : (
          <div>
            {objective.keyResults.map((kr) => (
              <KrRow
                key={kr.id}
                kr={kr}
                onCheckin={() => onCheckin(kr.id)}
                cycleIsActive={cycleIsActive}
                canManageOkrs={canManageOkrs}
              />
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
