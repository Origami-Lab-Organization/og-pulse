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
import { useArchiveLead } from '@/hooks/useLeads';
import { ARCHIVE_REASONS, LeadDB } from '@/types/lead';

interface ArchiveLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDB | null;
}

export function ArchiveLeadDialog({ open, onOpenChange, lead }: ArchiveLeadDialogProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const archiveMutation = useArchiveLead();

  const isCompetitor = reason === 'competitor';
  const competitorMissing = isCompetitor && !competitorName.trim();

  const reset = () => {
    setReason('');
    setNotes('');
    setCompetitorName('');
  };

  const handleConfirm = () => {
    if (!lead || !reason || competitorMissing) return;
    archiveMutation.mutate(
      {
        id: lead.id,
        archive_reason: reason,
        archive_notes: notes || undefined,
        competitor_name: isCompetitor ? competitorName.trim() : null,
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
          <DialogTitle>Arquivar Oportunidade</DialogTitle>
          <DialogDescription>
            Informe o motivo pelo qual esta oportunidade está sendo arquivada.
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
              <Label htmlFor="competitor-name">Concorrente *</Label>
              <Input
                id="competitor-name"
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
            disabled={!reason || competitorMissing || archiveMutation.isPending}
          >
            {archiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Arquivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
