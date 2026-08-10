import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateFollowUp } from '@/hooks/useLeadFollowUps';
import { useMoveLeadToFollowUp } from '@/hooks/useLeads';
import { suggestFollowUpDate, toLocalDatetimeInputValue } from '@/lib/followUps';
import { CRMStage, LeadDB, getStageLabel } from '@/types/lead';

/** Atalhos de cadência — a maioria das nutrições cai num destes intervalos. */
const RETURN_PRESETS = [
  { days: 15, label: '15 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
] as const;

interface MoveToFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDB | null;
  fromStage: CRMStage | null;
}

export function MoveToFollowUpDialog({ open, onOpenChange, lead, fromStage }: MoveToFollowUpDialogProps) {
  const { employee } = useAuth();
  const { data: employees = [] } = useEmployees();
  const createFollowUp = useCreateFollowUp();
  const moveToFollowUpStage = useMoveLeadToFollowUp();

  const [returnAt, setReturnAt] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const activeEmployees = employees.filter((e) => e.status === 'ativo');
  const isSubmitting = createFollowUp.isPending || moveToFollowUpStage.isPending;
  const canConfirm = !!returnAt && !!description.trim() && !isSubmitting;

  // Reabre sempre com sugestão de 30 dias e o usuário como responsável.
  useEffect(() => {
    if (!open) return;
    setReturnAt(toLocalDatetimeInputValue(suggestFollowUpDate(30)));
    setDescription('');
    setAssignedTo(employee?.id ?? '');
  }, [open, employee?.id]);

  const applyPreset = (days: number) => {
    setReturnAt(toLocalDatetimeInputValue(suggestFollowUpDate(days)));
  };

  const handleConfirm = async () => {
    if (!lead || !fromStage || !canConfirm) return;

    // O follow-up vem PRIMEIRO de propósito: se ele falhar, a oportunidade
    // continua no funil — estado seguro. Follow Up sem data de retorno é
    // justamente o esquecimento que este fluxo existe para impedir.
    await createFollowUp.mutateAsync({
      lead_id: lead.id,
      description: description.trim(),
      scheduled_at: new Date(returnAt).toISOString(),
      assigned_to: assignedTo || null,
    });

    await moveToFollowUpStage.mutateAsync({ id: lead.id, fromStage });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mover para Follow Up</DialogTitle>
          <DialogDescription>
            A oportunidade sai do Pipeline e fica na coluna Follow Up até a data de retorno.
            {fromStage ? ` Ao retomar, ela volta para ${getStageLabel(fromStage)}.` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="follow-up-return-at">Data de retorno *</Label>
            <Input
              id="follow-up-return-at"
              type="datetime-local"
              value={returnAt}
              onChange={(e) => setReturnAt(e.target.value)}
            />
            <div className="flex gap-2">
              {RETURN_PRESETS.map((preset) => (
                <Button
                  key={preset.days}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => applyPreset(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow-up-description">O que fazer no retorno *</Label>
            <Textarea
              id="follow-up-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: retomar conversa sobre orçamento do próximo ciclo"
            />
            <p className="text-xs text-muted-foreground">
              Este texto é o lembrete que você vai receber na data de retorno.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow-up-assigned">Responsável pelo retorno</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="follow-up-assigned">
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mover para Follow Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
