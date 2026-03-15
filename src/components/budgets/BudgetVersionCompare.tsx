import { ArrowRight, ArrowUp, ArrowDown, Minus, GitCompare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BudgetVersionWithCreator,
  BudgetVersionSnapshot,
  compareSnapshots,
  VersionDiff,
} from '@/services/budgetVersionService';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BudgetVersionCompareProps {
  versionA: BudgetVersionWithCreator;
  versionB: BudgetVersionWithCreator;
  open: boolean;
  onClose: () => void;
}

function formatDiffValue(value: string | number, type: VersionDiff['type']): string {
  if (type === 'currency') return formatCurrency(value as number);
  if (type === 'percent') return `${value}%`;
  if (type === 'count') return `${value}`;
  return String(value);
}

function DiffRow({ diff }: { diff: VersionDiff }) {
  const oldFormatted = formatDiffValue(diff.oldValue, diff.type);
  const newFormatted = formatDiffValue(diff.newValue, diff.type);
  const isIncrease =
    typeof diff.newValue === 'number' && typeof diff.oldValue === 'number'
      ? diff.newValue > diff.oldValue
      : false;
  const isDecrease =
    typeof diff.newValue === 'number' && typeof diff.oldValue === 'number'
      ? diff.newValue < diff.oldValue
      : false;

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
      <span className="text-sm font-medium">{diff.label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground line-through">{oldFormatted}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
        <span
          className={cn(
            'text-sm font-semibold flex items-center gap-1',
            isIncrease && 'text-green-600 dark:text-green-400',
            isDecrease && 'text-red-600 dark:text-red-400'
          )}
        >
          {isIncrease && <ArrowUp className="h-3 w-3" />}
          {isDecrease && <ArrowDown className="h-3 w-3" />}
          {newFormatted}
        </span>
      </div>
    </div>
  );
}

function RoleComparison({
  oldSnapshot,
  newSnapshot,
}: {
  oldSnapshot: BudgetVersionSnapshot;
  newSnapshot: BudgetVersionSnapshot;
}) {
  // Build map of roles by name+seniority for both versions
  const oldRoles = new Map(
    oldSnapshot.roles.map((r) => [
      `${r.role_name}|${r.seniority}`,
      { ...r, totalHours: r.months.reduce((h, m) => h + m.hours, 0) },
    ])
  );
  const newRoles = new Map(
    newSnapshot.roles.map((r) => [
      `${r.role_name}|${r.seniority}`,
      { ...r, totalHours: r.months.reduce((h, m) => h + m.hours, 0) },
    ])
  );

  const allKeys = new Set([...oldRoles.keys(), ...newRoles.keys()]);
  if (allKeys.size === 0) return null;

  return (
    <div>
      <h4 className="font-semibold mb-2 text-sm">Papéis</h4>
      <div className="space-y-1">
        {Array.from(allKeys).map((key) => {
          const oldRole = oldRoles.get(key);
          const newRole = newRoles.get(key);
          const [name, seniority] = key.split('|');
          const isAdded = !oldRole;
          const isRemoved = !newRole;
          const isChanged = oldRole && newRole && (oldRole.totalHours !== newRole.totalHours || oldRole.hourly_rate !== newRole.hourly_rate);

          return (
            <div
              key={key}
              className={cn(
                'flex items-center justify-between py-1.5 px-3 rounded text-sm',
                isAdded && 'bg-green-50 dark:bg-green-900/20',
                isRemoved && 'bg-red-50 dark:bg-red-900/20',
                isChanged && 'bg-amber-50 dark:bg-amber-900/20',
                !isAdded && !isRemoved && !isChanged && 'bg-muted/20'
              )}
            >
              <div className="flex items-center gap-2">
                {isAdded && <Badge className="text-[9px] px-1 py-0 h-4 bg-green-500">Novo</Badge>}
                {isRemoved && <Badge className="text-[9px] px-1 py-0 h-4 bg-red-500">Removido</Badge>}
                <span className={cn(isRemoved && 'line-through text-muted-foreground')}>
                  {name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {seniority}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {oldRole && <span>{oldRole.totalHours}h</span>}
                {isChanged && (
                  <>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium text-foreground">{newRole!.totalHours}h</span>
                  </>
                )}
                {isAdded && newRole && <span className="font-medium text-foreground">{newRole.totalHours}h</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BudgetVersionCompare({
  versionA,
  versionB,
  open,
  onClose,
}: BudgetVersionCompareProps) {
  // Ensure versionA is older
  const [older, newer] =
    versionA.version_number < versionB.version_number
      ? [versionA, versionB]
      : [versionB, versionA];

  const diffs = compareSnapshots(older.snapshot_data, newer.snapshot_data);
  const financialDiffs = diffs.filter((d) =>
    ['final_total', 'total_with_fees', 'subtotal', 'discount_value'].includes(d.field)
  );
  const configDiffs = diffs.filter((d) =>
    ['duration_months', 'commission_percent', 'net_margin_percent'].includes(d.field)
  );
  const compositionDiffs = diffs.filter((d) =>
    ['total_hours', 'roles_count', 'suppliers_count', 'materials_count'].includes(d.field)
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparar Versões
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline">v{older.version_number}</Badge>
            <ArrowRight className="h-4 w-4" />
            <Badge variant="default">v{newer.version_number}</Badge>
            <span className="text-xs ml-2">
              {format(new Date(newer.created_at), "dd/MM/yyyy", { locale: ptBR })}
              {newer.creator && ` por ${newer.creator.nome}`}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
          <div className="space-y-5">
            {/* Change reason */}
            {newer.change_reason && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Motivo da Alteração
                </p>
                <p className="text-sm">{newer.change_reason}</p>
              </div>
            )}

            {/* Change summary */}
            {newer.change_summary && (
              <div className="rounded-lg border bg-primary/5 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Resumo das Mudanças
                </p>
                <p className="text-sm font-medium">{newer.change_summary}</p>
              </div>
            )}

            {diffs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Minus className="h-5 w-5 mr-2" />
                <p className="text-sm">Sem diferenças significativas entre as versões.</p>
              </div>
            ) : (
              <>
                {/* Financial changes */}
                {financialDiffs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Valores
                    </p>
                    <div className="space-y-1">
                      {financialDiffs.map((diff) => (
                        <DiffRow key={diff.field} diff={diff} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Configuration changes */}
                {configDiffs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Configuração
                    </p>
                    <div className="space-y-1">
                      {configDiffs.map((diff) => (
                        <DiffRow key={diff.field} diff={diff} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Composition changes */}
                {compositionDiffs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Composição
                    </p>
                    <div className="space-y-1">
                      {compositionDiffs.map((diff) => (
                        <DiffRow key={diff.field} diff={diff} />
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Detailed role comparison */}
                <RoleComparison
                  oldSnapshot={older.snapshot_data}
                  newSnapshot={newer.snapshot_data}
                />
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
