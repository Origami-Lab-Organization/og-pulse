import { useNavigate } from 'react-router-dom';
import { Receipt, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMyReimbursements, ReimbursementRequest } from '@/hooks/useReimbursements';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending: {
    label: 'Pendente',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0',
  },
  approved: {
    label: 'Aprovado',
    classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0',
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function ReembolsosPendentesWidget() {
  const navigate = useNavigate();
  const { data: all = [] } = useMyReimbursements();

  const pending = all.filter(
    (r: ReimbursementRequest) => r.status === 'pending' || r.status === 'approved',
  );

  if (pending.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Reembolsos em Andamento
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {pending.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-foreground"
              onClick={() => navigate('/reimbursements')}
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {pending.map((r: ReimbursementRequest) => {
            const cfg = STATUS_CONFIG[r.status];
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                onClick={() => navigate('/reimbursements')}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate max-w-[180px]">{r.description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatCurrency(r.total_amount)}</p>
                </div>
                {cfg && (
                  <Badge className={cn('text-xs', cfg.classes)}>{cfg.label}</Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
