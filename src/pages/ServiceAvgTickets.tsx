import { useMemo, useState } from 'react';
import { Calculator, HelpCircle, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ServiceAvgTicketEditDialog } from '@/components/services/ServiceAvgTicketEditDialog';
import {
  useServiceAvgTicketsAdmin,
  useUpdateServiceAvgTicket,
  useResetServiceAvgTicket,
  useRecalculateServiceAvgTicketsNow,
} from '@/hooks/useServiceAvgTickets';
import { useServices } from '@/hooks/useServices';
import { useServiceLines } from '@/hooks/useServiceLines';
import { ServiceAvgTicket } from '@/types/serviceAvgTicket';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export default function ServiceAvgTickets() {
  const { data: items = [], isLoading } = useServiceAvgTicketsAdmin();
  const { data: services = [] } = useServices();
  const { data: serviceLines = [] } = useServiceLines();
  const updateMutation = useUpdateServiceAvgTicket();
  const resetMutation = useResetServiceAvgTicket();
  const recalculateNow = useRecalculateServiceAvgTicketsNow();

  const [editTarget, setEditTarget] = useState<ServiceAvgTicket | null>(null);

  const isSaving = updateMutation.isPending || resetMutation.isPending;

  // Linha de serviço a que cada serviço pertence — contexto secundário na tabela.
  const lineNameByServiceId = useMemo(() => {
    const lineNameById = new Map(serviceLines.map((l) => [l.id, l.name]));
    return services.reduce<Record<string, string>>((acc, s) => {
      const lineName = s.serviceLineId ? lineNameById.get(s.serviceLineId) : undefined;
      if (lineName) acc[s.id] = lineName;
      return acc;
    }, {});
  }, [services, serviceLines]);

  const handleSave = (value: number) => {
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, avgTicketValue: value },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  const handleResetToComputed = () => {
    if (!editTarget) return;
    resetMutation.mutate(
      { id: editTarget.id, computedValue: editTarget.computedValue ?? 0 },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  if (isLoading) {
    return (
      <AppLayout
        title="Ticket Médio"
        description="Valor médio dos negócios fechados por serviço, usado para estimar oportunidades ainda sem orçamento."
        breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Ticket Médio' }]}
      >
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Ticket Médio"
      description="Valor médio dos negócios fechados por serviço, usado para estimar oportunidades ainda sem orçamento no Pipeline e no Forecast."
      breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Ticket Médio' }]}
      actions={
        <Button size="sm" variant="outline" onClick={() => recalculateNow.mutate()} disabled={recalculateNow.isPending}>
          {recalculateNow.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          Recalcular agora
        </Button>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="rounded-full bg-muted p-5 mb-4">
            <Calculator className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold">Nenhum serviço encontrado</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Cadastre serviços em Cadastros &gt; Serviços e clique em &quot;Recalcular agora&quot;.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead className="w-28">Origem</TableHead>
                <TableHead className="w-32 text-center">Amostra (12m)</TableHead>
                <TableHead className="w-40 text-right">Ticket Médio</TableHead>
                <TableHead className="w-36">Atualizado em</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.serviceId && lineNameByServiceId[item.serviceId] && (
                      <p className="text-xs text-muted-foreground">{lineNameByServiceId[item.serviceId]}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        item.serviceId
                          ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {item.serviceId ? 'Catálogo' : 'Legado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                    {item.sampleSize}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={cn(
                        'text-sm font-semibold tabular-nums',
                        item.avgTicketValue === 0 && 'text-muted-foreground'
                      )}>
                        {formatCurrency(item.avgTicketValue)}
                      </span>
                      {item.isManualOverride && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none">
                          Manual
                        </Badge>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Como esse valor é calculado"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="max-w-xs text-sm space-y-1.5">
                          <p>
                            Média dos valores de negócios fechados (orçamento final ou valor
                            estimado) deste serviço nos últimos 12 meses.
                          </p>
                          <p className="text-muted-foreground">
                            Amostra: {item.sampleSize} negócio{item.sampleSize !== 1 ? 's' : ''}.
                            {item.computedAt && ` Calculado em ${formatDate(item.computedAt)}.`}
                            {item.sampleSize === 0 && ' Sem negócios fechados neste período — defina um valor manual se quiser estimar oportunidades deste serviço.'}
                          </p>
                          <p className="text-muted-foreground">
                            Recalculado automaticamente todo trimestre.
                            {item.isManualOverride && ' Este valor foi definido manualmente e não é sobrescrito pelo recálculo automático até ser restaurado.'}
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(item.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTarget(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ServiceAvgTicketEditDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        item={editTarget}
        onSave={handleSave}
        onResetToComputed={handleResetToComputed}
        isSaving={isSaving}
      />
    </AppLayout>
  );
}
