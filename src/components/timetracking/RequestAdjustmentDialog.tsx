import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { useSubmitTimeAdjustment } from '@/hooks/useTimeAdjustments';
import { uploadTimeAdjustmentAttachment, validateAttachment, ALLOWED_ATTACHMENT_LABEL } from '@/lib/timeAdjustmentAttachments';
import { useToast } from '@/hooks/use-toast';
import type { TimeEntryType } from '@/hooks/useTimePunches';

const PUNCH_OPTIONS: { value: TimeEntryType; label: string }[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'inicio_intervalo', label: 'Início de Intervalo' },
  { value: 'fim_intervalo', label: 'Fim de Intervalo' },
  { value: 'saida', label: 'Saída' },
];

interface Props {
  employeeId: string;
  tenantId: string;
}

type RequestType = 'ajuste_ponto' | 'hora_extra' | 'atestado';

export function RequestAdjustmentDialog({ employeeId, tenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<RequestType>('ajuste_ponto');
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [tipoMarcacao, setTipoMarcacao] = useState<TimeEntryType>('entrada');
  const [horario, setHorario] = useState('08:00');
  const [horasSolicitadas, setHorasSolicitadas] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = useSubmitTimeAdjustment();
  const { toast } = useToast();

  const resetForm = () => {
    setTipo('ajuste_ponto');
    setData(new Date().toISOString().split('T')[0]);
    setDataFim(new Date().toISOString().split('T')[0]);
    setTipoMarcacao('entrada');
    setHorario('08:00');
    setHorasSolicitadas('1');
    setMotivo('');
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected) {
      const error = validateAttachment(selected);
      if (error) {
        toast({ title: 'Arquivo inválido', description: error, variant: 'destructive' });
        e.target.value = '';
        return;
      }
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (motivo.trim().length < 5) {
      toast({ title: 'Motivo obrigatório', description: 'Descreva o motivo com pelo menos 5 caracteres.', variant: 'destructive' });
      return;
    }
    if (tipo === 'atestado' && !file) {
      toast({ title: 'Anexo obrigatório', description: 'Anexe o comprovante do atestado.', variant: 'destructive' });
      return;
    }
    if (tipo === 'atestado' && dataFim < data) {
      toast({ title: 'Período inválido', description: 'A data final não pode ser anterior à data inicial.', variant: 'destructive' });
      return;
    }

    try {
      let anexo_path: string | undefined;
      let anexo_nome: string | undefined;

      if (file) {
        setUploading(true);
        const uploaded = await uploadTimeAdjustmentAttachment(file, { tenantId, employeeId });
        anexo_path = uploaded.path;
        anexo_nome = uploaded.name;
      }

      const horario_solicitado = tipo === 'ajuste_ponto'
        ? new Date(`${data}T${horario}:00`).toISOString()
        : undefined;

      submit.mutate(
        {
          tipo,
          data_referencia: data,
          data_fim: tipo === 'atestado' ? dataFim : undefined,
          motivo: motivo.trim(),
          tipo_marcacao: tipo === 'ajuste_ponto' ? tipoMarcacao : undefined,
          horario_solicitado,
          horas_solicitadas: tipo === 'hora_extra' ? Number(horasSolicitadas) : undefined,
          anexo_path,
          anexo_nome,
        },
        {
          onSuccess: () => {
            setOpen(false);
            resetForm();
          },
        },
      );
    } catch (error) {
      toast({
        title: 'Erro ao anexar arquivo',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const busy = submit.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Solicitar ajuste
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar ajuste</DialogTitle>
          <DialogDescription>
            Sua solicitação será analisada pelo administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de solicitação</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as RequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ajuste_ponto">Ajuste de ponto</SelectItem>
                <SelectItem value="hora_extra">Hora extra</SelectItem>
                <SelectItem value="atestado">Atestado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === 'atestado' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="data-inicio">De</Label>
                <Input id="data-inicio" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-fim-atestado">Até</Label>
                <Input id="data-fim-atestado" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="data-referencia">Data</Label>
              <Input id="data-referencia" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          )}

          {tipo === 'ajuste_ponto' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Marcação</Label>
                <Select value={tipoMarcacao} onValueChange={(v) => setTipoMarcacao(v as TimeEntryType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUNCH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario-solicitado">Horário correto</Label>
                <Input id="horario-solicitado" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
              </div>
            </div>
          )}

          {tipo === 'hora_extra' && (
            <div className="space-y-2">
              <Label htmlFor="horas-solicitadas">Horas extras</Label>
              <Input
                id="horas-solicitadas"
                type="number"
                min="0.5"
                step="0.5"
                value={horasSolicitadas}
                onChange={(e) => setHorasSolicitadas(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              placeholder="Explique o motivo da solicitação"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anexo">Anexo {tipo === 'atestado' ? '(obrigatório)' : '(opcional)'}</Label>
            <Input id="anexo" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={handleFileChange} />
            <p className="text-xs text-muted-foreground">{ALLOWED_ATTACHMENT_LABEL}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
