import { useEffect, useState } from 'react';
import { useDecisoesDaBase } from '@/hooks/useDecisoesDaBase';
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
import { opportunityName, PROSPECT_DISCARD_REASONS, type ProspectWithCompany } from '@/types/prospect';
import { CampoVoltarEm } from './CampoVoltarEm';

interface DiscardProspectDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Motivo já marcado ao abrir (vem do BANT "Não atende", US-0022); a pessoa pode trocar. */
  motivoSugerido?: string | null;
}

// "Momento errado / adiado" pede quando voltar: vira o "Não agora" da empresa (US-0010).
const MOMENTO_ERRADO = 'momento_errado';
const CNPJ_COMPLETO = /^\d{14}$/;

/**
 * Perda exige motivo de uma lista fechada (etapa `descartado`, "Perda" desde 28/09/2026).
 *
 * Texto livre aqui seria o fim da métrica: "sem budget", "sem orçamento" e "não tem verba"
 * viram três linhas diferentes do mesmo fato e ninguém consegue somar. O banco também
 * recusa perda sem motivo (prospects_discarded_has_reason).
 */
export function DiscardProspectDialog({ prospect, open, onOpenChange, motivoSugerido = null }: DiscardProspectDialogProps) {
  const descartar = useDiscardProspect();
  const { naoAgora } = useDecisoesDaBase();
  const [motivo, setMotivo] = useState<string>('');
  const [voltarEm, setVoltarEm] = useState<string | null>(null);

  useEffect(() => {
    if (open) setMotivo(motivoSugerido ?? '');
  }, [open, motivoSugerido]);

  if (!prospect) return null;

  const cnpj = (prospect.company?.cnpj ?? '').replace(/\D/g, '');
  const momentoErrado = motivo === MOMENTO_ERRADO;
  const comVolta = momentoErrado && CNPJ_COMPLETO.test(cnpj);
  const pendente = descartar.isPending || naoAgora.isPending;

  const marcarNaoAgora = () => {
    if (!comVolta || !voltarEm) return;
    const empresa = { cnpj, nome: prospect.company?.name ?? opportunityName(prospect) };
    naoAgora.mutate({ empresas: [empresa], voltarEm, prospectId: prospect.id });
  };

  const confirmar = () => {
    descartar.mutate(
      { id: prospect.id, reason: motivo },
      {
        onSuccess: () => {
          marcarNaoAgora();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar perda</DialogTitle>
          <DialogDescription>
            {opportunityName(prospect)}. Por que perdemos? O motivo é
            obrigatório e entra nas métricas.
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

        {comVolta && <CampoVoltarEm onChange={setVoltarEm} desabilitado={pendente} />}
        {momentoErrado && !comVolta && (
          <p className="text-[12.5px] text-muted-foreground">A empresa não tem CNPJ: a Perda é registrada, sem o aviso para voltar.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pendente}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={!motivo || pendente || (comVolta && !voltarEm)}>
            {descartar.isPending ? 'Registrando...' : 'Registrar perda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
