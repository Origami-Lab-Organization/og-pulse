import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { toast } from '@/hooks/use-toast';
import { useRegisterActivity } from '@/hooks/useProspectActivities';
import { INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import { toISODate, type ProspectWithCompany } from '@/types/prospect';

interface RegisterActivityDialogProps {
  prospect: ProspectWithCompany;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** O caso raro: canal diferente, data retroativa ou uma observação. */
export function RegisterActivityDialog({ prospect, open, onOpenChange }: RegisterActivityDialogProps) {
  const registrar = useRegisterActivity();
  const [canal, setCanal] = useState(prospect.primary_channel);
  const [data, setData] = useState(toISODate(new Date()));
  const [teveResposta, setTeveResposta] = useState(false);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (!open) return;
    setCanal(prospect.primary_channel);
    setData(toISODate(new Date()));
    setTeveResposta(false);
    setObservacao('');
  }, [open, prospect.primary_channel]);

  const salvar = () => {
    registrar.mutate(
      {
        prospect_id: prospect.id,
        channel: canal,
        got_response: teveResposta,
        activity_date: data,
        notes: observacao.trim() || null,
      },
      {
        onSuccess: (atividade) => {
          toast({ title: `Atividade nº ${atividade.sequence_no} registrada` });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar atividade</DialogTitle>
          <DialogDescription>
            {prospect.contact_name}
            {prospect.company?.name ? ` · ${prospect.company.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="atividade-canal">Canal</Label>
            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger id="atividade-canal"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERACTION_CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="atividade-data">Data</Label>
            <Input
              id="atividade-data"
              type="date"
              value={data}
              max={toISODate(new Date())}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="atividade-resposta"
              checked={teveResposta}
              onCheckedChange={(v) => setTeveResposta(v === true)}
            />
            <Label htmlFor="atividade-resposta" className="font-normal">
              Teve resposta
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="atividade-obs">Observação</Label>
            <Textarea
              id="atividade-obs"
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={registrar.isPending}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={registrar.isPending}>
            {registrar.isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
