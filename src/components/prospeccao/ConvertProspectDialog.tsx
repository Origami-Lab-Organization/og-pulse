import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProspectActivities } from '@/hooks/useProspectActivities';
import { useConvertProspect } from '@/hooks/useProspects';
import type { ProspectWithCompany } from '@/types/prospect';

interface ConvertProspectDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A passagem para o comercial.
 *
 * Leva a data do 1º toque e o número de atividades até a resposta. Sem isso o comercial
 * mede o ciclo a partir da reunião, e o número fica bonito e falso.
 */
export function ConvertProspectDialog({ prospect, open, onOpenChange }: ConvertProspectDialogProps) {
  const navigate = useNavigate();
  const converter = useConvertProspect();
  const { data: atividades = [] } = useProspectActivities(open ? prospect?.id ?? null : null);

  if (!prospect) return null;

  const primeiraResposta = atividades
    .filter((a) => a.got_response)
    .reduce<number | null>((menor, a) => (menor === null ? a.sequence_no : Math.min(menor, a.sequence_no)), null);

  const jaConvertido = !!prospect.converted_lead_id;

  const confirmar = () => {
    if (jaConvertido) {
      navigate(`/pipeline?lead=${prospect.converted_lead_id}`);
      onOpenChange(false);
      return;
    }
    converter.mutate(
      { prospect, activitiesUntilResponse: primeiraResposta },
      {
        onSuccess: ({ leadId }) => {
          onOpenChange(false);
          navigate(`/pipeline?lead=${leadId}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {jaConvertido ? 'Contato já convertido' : 'Converter em oportunidade'}
          </DialogTitle>
          <DialogDescription>
            {jaConvertido
              ? 'Este contato já gerou uma oportunidade. Abrir a existente em vez de criar outra.'
              : 'O contato é encerrado como Convertido e passa a ser somente leitura — nunca dois lugares editáveis para o mesmo contato.'}
          </DialogDescription>
        </DialogHeader>

        {!jaConvertido && (
          <dl className="space-y-2 text-sm">
            <Linha termo="Empresa" valor={prospect.company?.name ?? '—'} />
            <Linha termo="Contato" valor={prospect.contact_name} />
            <Linha
              termo="Data do 1º toque"
              valor={prospect.first_touch_at ? formatarData(prospect.first_touch_at) : 'sem atividade registrada'}
            />
            <Linha
              termo="Atividades até responder"
              valor={primeiraResposta ? String(primeiraResposta) : '—'}
            />
            <Linha termo="Alavanca de origem" valor={prospect.lever ?? '—'} />
          </dl>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={converter.isPending}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={converter.isPending}>
            {converter.isPending
              ? 'Convertendo...'
              : jaConvertido
                ? 'Abrir oportunidade'
                : 'Converter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Linha({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{termo}</dt>
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
