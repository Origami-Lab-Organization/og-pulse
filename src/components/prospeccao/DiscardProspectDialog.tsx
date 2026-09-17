import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDiscardProspect } from '@/hooks/useProspects';
import { PROSPECT_DISCARD_REASONS, type ProspectWithCompany } from '@/types/prospect';

interface DiscardProspectDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Descarte exige motivo de uma lista fechada.
 *
 * Texto livre aqui seria o fim da métrica: "sem budget", "sem orçamento" e "não tem verba"
 * viram três linhas diferentes do mesmo fato e ninguém consegue somar.
 */
export function DiscardProspectDialog({ prospect, open, onOpenChange }: DiscardProspectDialogProps) {
  const descartar = useDiscardProspect();
  const [motivo, setMotivo] = useState<string>('');

  useEffect(() => {
    if (open) setMotivo('');
  }, [open]);

  if (!prospect) return null;

  const confirmar = () => {
    descartar.mutate(
      { id: prospect.id, reason: motivo },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Descartar contato</DialogTitle>
          <DialogDescription>
            {prospect.contact_name}
            {prospect.company?.name ? ` · ${prospect.company.name}` : ''}. O motivo é obrigatório.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={motivo} onValueChange={setMotivo} className="space-y-1">
          {PROSPECT_DISCARD_REASONS.map((r) => (
            <div key={r.value} className="flex items-center gap-2">
              <RadioGroupItem value={r.value} id={`motivo-${r.value}`} />
              <Label htmlFor={`motivo-${r.value}`} className="font-normal">{r.label}</Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={descartar.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={!motivo || descartar.isPending}>
            {descartar.isPending ? 'Descartando...' : 'Descartar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
