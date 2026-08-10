import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCloseLeadAsLost } from '@/hooks/useLeads';
import { ARCHIVE_REASONS, CRMStage, LeadDB } from '@/types/lead';

interface LoseDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDB | null;
  fromStage: CRMStage | null;
}

export function LoseDealDialog({ open, onOpenChange, lead, fromStage }: LoseDealDialogProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const closeLeadAsLost = useCloseLeadAsLost();

  const isCompetitor = reason === 'competitor';
  const competitorMissing = isCompetitor && !competitorName.trim();

  const reset = () => {
    setReason('');
    setNotes('');
    setCompetitorName('');
  };

  const handleConfirm = () => {
    if (!lead || !fromStage || !reason || competitorMissing) return;
    closeLeadAsLost.mutate(
      {
        id: lead.id,
        fromStage,
        reason,
        notes: notes || undefined,
        competitorName: isCompetitor ? competitorName.trim() : null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dar perda na oportunidade</DialogTitle>
          <DialogDescription>
            Informe o motivo pelo qual esta oportunidade foi perdida. Ela sai do Pipeline e passa
            a ser contabilizada na aba "Perdas", de onde pode ser reaberta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Motivo *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCompetitor && (
            <div>
              <Label htmlFor="lost-competitor-name">Concorrente *</Label>
              <Input
                id="lost-competitor-name"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="Nome do concorrente que venceu"
              />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentários adicionais..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason || competitorMissing || closeLeadAsLost.isPending}
          >
            {closeLeadAsLost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dar perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
