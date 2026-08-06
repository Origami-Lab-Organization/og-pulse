import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { ServiceLineAvgTicket } from '@/types/serviceLineAvgTicket';

interface ServiceLineAvgTicketEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ServiceLineAvgTicket | null;
  onSave: (value: number) => void;
  onResetToComputed: () => void;
  isSaving: boolean;
}

export function ServiceLineAvgTicketEditDialog({
  open,
  onOpenChange,
  item,
  onSave,
  onResetToComputed,
  isSaving,
}: ServiceLineAvgTicketEditDialogProps) {
  const [value, setValue] = useState(0);
  const [useComputed, setUseComputed] = useState(true);

  useEffect(() => {
    if (!item) return;
    setValue(item.avgTicketValue);
    setUseComputed(!item.isManualOverride);
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    if (useComputed) onResetToComputed();
    else onSave(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar ticket médio — {item.label}</DialogTitle>
          <DialogDescription>
            Esse valor é usado para estimar oportunidades desta linha que ainda não têm orçamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label>Usar valor calculado automaticamente</Label>
              <p className="text-xs text-muted-foreground">
                {item.computedValue != null
                  ? `Último cálculo: valor médio dos negócios fechados nos últimos 12 meses`
                  : 'Ainda não há negócios fechados suficientes para calcular'}
              </p>
            </div>
            <Switch checked={useComputed} onCheckedChange={setUseComputed} />
          </div>

          <div>
            <Label>Valor {useComputed ? 'calculado' : 'manual'}</Label>
            <CurrencyInput
              value={useComputed ? (item.computedValue ?? 0) : value}
              onValueChange={setValue}
              disabled={useComputed}
              showPrefix
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
