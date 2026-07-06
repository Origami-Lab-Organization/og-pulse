import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useUnarchiveLead } from '@/hooks/useLeads';
import { CRM_LEAD_COLUMNS, CRMStage, LeadWithBudget } from '@/types/lead';

// Etapas válidas para restauração: "Negócio Fechado" é excluído porque o
// fechamento tem fluxo próprio (criação de projeto) que não pode ser pulado.
const RESTORE_STAGES = CRM_LEAD_COLUMNS.filter((c) => c.id !== 'closed');

function defaultStage(stage?: CRMStage): CRMStage {
  return stage && stage !== 'closed' ? stage : 'qualification';
}

interface RestoreLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadWithBudget | null;
}

export function RestoreLeadDialog({ open, onOpenChange, lead }: RestoreLeadDialogProps) {
  const [targetStage, setTargetStage] = useState<CRMStage>('qualification');
  const unarchiveMutation = useUnarchiveLead();

  // Pré-seleciona a etapa que a oportunidade tinha ao ser arquivada.
  useEffect(() => {
    if (lead) setTargetStage(defaultStage(lead.crm_stage));
  }, [lead]);

  const handleConfirm = () => {
    if (!lead) return;
    unarchiveMutation.mutate(
      { id: lead.id, targetStage },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Restaurar Oportunidade</DialogTitle>
          <DialogDescription>
            Escolha a etapa do pipeline em que esta oportunidade deve retornar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Etapa de retorno *</Label>
            <Select value={targetStage} onValueChange={(v) => setTargetStage(v as CRMStage)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                {RESTORE_STAGES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={unarchiveMutation.isPending}>
            {unarchiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restaurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
