import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ChangeEntry {
  itemTitle: string;
  monthLabel: string;
  from: number;
  to: number;
}

const REASON_OPTIONS = [
  { value: 'wrong_hours', label: 'Horas incorretas' },
  { value: 'wrong_item', label: 'Item incorreto' },
  { value: 'post_approval_fix', label: 'Correção pós-aprovação' },
  { value: 'employee_request', label: 'Pedido do colaborador' },
  { value: 'other', label: 'Outro' },
] as const;

export type SaveDialogMode = 'planned' | 'actual';

interface AllocationSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: ChangeEntry[];
  employeeName: string;
  isSaving: boolean;
  onConfirm: (reasonCode: string, justification: string) => void;
  mode?: SaveDialogMode;
}

function fmt(h: number): string {
  return `${Math.round(h * 10) / 10}h`;
}

export function AllocationSaveDialog({
  open,
  onOpenChange,
  changes,
  employeeName,
  isSaving,
  onConfirm,
  mode = 'planned',
}: AllocationSaveDialogProps) {
  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');

  const canConfirm = reasonCode.length > 0 && justification.trim().length >= 10;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(reasonCode, justification.trim());
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReasonCode('');
      setJustification('');
    }
    onOpenChange(nextOpen);
  };

  const totalDelta = changes.reduce((sum, c) => sum + (c.to - c.from), 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'actual' ? 'Confirmar correções de horas reais' : 'Confirmar alterações de alocação'}
          </DialogTitle>
          <DialogDescription>
            {changes.length} alteração(ões) para {employeeName}.
            Delta total: {totalDelta >= 0 ? '+' : ''}{fmt(totalDelta)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Changes list */}
          <div className="max-h-[200px] overflow-auto border rounded-md">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-2 font-medium">Item</th>
                  <th className="text-left p-2 font-medium">Mês</th>
                  <th className="text-right p-2 font-medium">De</th>
                  <th className="text-right p-2 font-medium">Para</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2">{change.itemTitle}</td>
                    <td className="p-2">{change.monthLabel}</td>
                    <td className="p-2 text-right text-muted-foreground">{fmt(change.from)}</td>
                    <td className="p-2 text-right font-medium">{fmt(change.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reason code */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Motivo da alteração *</label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justification */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Justificativa * <span className="text-muted-foreground font-normal">(mín. 10 caracteres)</span></label>
            <Textarea
              placeholder="Descreva o motivo da alteração..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || isSaving}>
            {isSaving ? 'Salvando...' : 'Confirmar e salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
