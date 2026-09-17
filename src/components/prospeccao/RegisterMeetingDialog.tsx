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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRegisterActivity } from '@/hooks/useProspectActivities';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import { INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import { toISODate, type ProspectWithCompany } from '@/types/prospect';

interface RegisterMeetingDialogProps {
  prospect: ProspectWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Marca a reunião como feita e, se a pessoa quiser, guarda como ela foi.
 *
 * O registro é OPCIONAL de propósito: exigir o relato na hora em que alguém acabou de sair
 * de uma call é a forma mais rápida de fazer o time parar de mover o card — e o card parado
 * estraga a taxa de comparecimento, que é o número que a etapa existe para produzir.
 *
 * Quando há relato, ele vira uma atividade normal: aparece na linha do tempo junto com o
 * resto, em vez de virar um campo que só esta tela sabe ler.
 */
export function RegisterMeetingDialog({ prospect, open, onOpenChange }: RegisterMeetingDialogProps) {
  const registrar = useRegisterActivity();
  const moverEtapa = useUpdateProspectStage();

  const [data, setData] = useState(toISODate(new Date()));
  const [canal, setCanal] = useState('video_call');
  const [relato, setRelato] = useState('');

  useEffect(() => {
    if (!open) return;
    setData(toISODate(new Date()));
    setCanal('video_call');
    setRelato('');
  }, [open]);

  if (!prospect) return null;

  const mover = () =>
    moverEtapa.mutate(
      { id: prospect.id, stage: 'reuniao_feita' },
      { onSuccess: () => onOpenChange(false) },
    );

  const salvar = () => {
    registrar.mutate(
      {
        prospect_id: prospect.id,
        channel: canal,
        got_response: true,
        activity_date: data,
        notes: relato.trim() || null,
      },
      { onSuccess: mover },
    );
  };

  const ocupado = registrar.isPending || moverEtapa.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reunião feita</DialogTitle>
          <DialogDescription>
            {prospect.contact_name}
            {prospect.company?.name ? ` · ${prospect.company.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reuniao-data">Data</Label>
              <Input
                id="reuniao-data"
                type="date"
                value={data}
                max={toISODate(new Date())}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reuniao-canal">Formato</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger id="reuniao-canal"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERACTION_CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reuniao-relato">Como foi a reunião</Label>
            <Textarea
              id="reuniao-relato"
              rows={4}
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              placeholder="Opcional — o que foi discutido, quem estava, qual o próximo passo"
            />
            <p className="text-xs text-muted-foreground">
              Vira uma atividade na linha do tempo do contato.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={mover} disabled={ocupado}>
            Pular registro
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={ocupado}>
              {ocupado ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
