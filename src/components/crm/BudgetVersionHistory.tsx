import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus, History, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetVersions, BudgetVersionWithCreator } from '@/hooks/useBudgetVersions';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface BudgetVersionHistoryProps {
  budgetId: string;
}

function getFinalTotal(snapshot: Record<string, unknown>): number | null {
  const v = snapshot?.final_total ?? snapshot?.finalTotal;
  return typeof v === 'number' ? v : null;
}

function TrendIcon({ current, next }: { current: number | null; next: number | null }) {
  if (current == null || next == null) return null;
  const diff = current - next;
  if (Math.abs(diff) < 0.01) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (diff < 0) return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
}

function VersionRow({ version, nextVersion }: { version: BudgetVersionWithCreator; nextVersion: BudgetVersionWithCreator | null }) {
  const currentTotal = getFinalTotal(version.snapshot_data);
  const nextTotal = nextVersion ? getFinalTotal(nextVersion.snapshot_data) : null;
  const createdAt = new Date(version.created_at);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR });

  return (
    <div className="flex gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
          v{version.version_number}
        </Badge>
        {nextVersion && (
          <TrendIcon current={currentTotal} next={nextTotal} />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {version.change_summary && (
          <p className="text-sm leading-snug">{version.change_summary}</p>
        )}
        {version.change_reason && (
          <p className="text-xs italic text-muted-foreground">{version.change_reason}</p>
        )}
        {currentTotal != null && (
          <p className="text-xs font-semibold text-primary">
            {formatCurrency(currentTotal)}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span title={format(createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}>{timeAgo}</span>
          {version.creator && <span>· {version.creator.nome}</span>}
        </div>
      </div>
    </div>
  );
}

export function BudgetVersionHistory({ budgetId }: BudgetVersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const { data: versions, isLoading } = useBudgetVersions(budgetId);

  const count = versions?.length ?? 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between h-9 px-3 text-muted-foreground hover:text-foreground">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              {isLoading ? 'Carregando versões...' : count === 0 ? 'Histórico de versões' : `Histórico de versões (${count})`}
            </span>
          </div>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-3 pb-2">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-5 w-8 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : count === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            Orçamento original, sem revisões registradas.
          </p>
        ) : (
          <div>
            {versions!.map((version, idx) => (
              <VersionRow
                key={version.id}
                version={version}
                nextVersion={versions![idx + 1] ?? null}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
