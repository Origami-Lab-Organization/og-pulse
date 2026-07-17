import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, Paperclip, Timer, TrendingUp, Stethoscope, CalendarOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDecideAdjustment, type TimeAdjustmentRequest } from '@/hooks/useTimeAdjustments';
import { getTimeAdjustmentAttachmentSignedUrl } from '@/lib/timeAdjustmentAttachments';
import { useToast } from '@/hooks/use-toast';

const PUNCH_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  inicio_intervalo: 'Início Intervalo',
  fim_intervalo: 'Fim Intervalo',
  saida: 'Saída',
};

const TIPO_LABELS: Record<string, string> = {
  ajuste_ponto: 'Ajuste de ponto',
  hora_extra: 'Hora extra',
  atestado: 'Atestado',
  ferias: 'Férias',
  falta: 'Falta',
};

const TIPO_ICONS: Record<string, typeof Timer> = {
  ajuste_ponto: Timer,
  hora_extra: TrendingUp,
  atestado: Stethoscope,
  ferias: Timer,
  falta: CalendarOff,
};

function fmtData(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return iso;
  }
}

interface Props {
  request: TimeAdjustmentRequest;
}

export function TimeAdjustmentApprovalCard({ request }: Props) {
  const decide = useDecideAdjustment();
  const { toast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const busy = decide.isPending;
  const nomeColaborador = request.employees?.nome ?? 'Colaborador';

  const handleApprove = () => {
    decide.mutate({ requestId: request.id, decisao: 'aprovado' });
  };

  const handleReject = () => {
    decide.mutate(
      { requestId: request.id, decisao: 'rejeitado', motivoDecisao: reason.trim() },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setReason('');
        },
      },
    );
  };

  const handleOpenAttachment = async () => {
    if (!request.anexo_path) return;
    try {
      const url = await getTimeAdjustmentAttachmentSignedUrl(request.anexo_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({
        title: 'Não foi possível abrir o anexo',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const TipoIcon = TIPO_ICONS[request.tipo] ?? Timer;

  return (
    <Card className="border-l-4 border-l-warning">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-subtle text-warning-emphasis">
            <TipoIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{nomeColaborador}</p>
              <Badge variant="secondary">
                {TIPO_LABELS[request.tipo] ?? request.tipo}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {fmtData(request.data_referencia)}
              {request.data_fim && request.data_fim !== request.data_referencia && (
                <> a {fmtData(request.data_fim)}</>
              )}
              {request.tipo === 'ajuste_ponto' && request.tipo_marcacao && (
                <> · {PUNCH_LABELS[request.tipo_marcacao]}
                  {request.horario_solicitado && ` às ${format(new Date(request.horario_solicitado), 'HH:mm')}`}
                </>
              )}
              {request.tipo === 'hora_extra' && request.horas_solicitadas != null && (
                <> · {request.horas_solicitadas}h</>
              )}
            </p>
            <p className="text-sm text-muted-foreground">"{request.motivo}"</p>
            {request.anexo_path && (
              <Button variant="link" size="sm" className="h-auto gap-1 p-0" onClick={handleOpenAttachment}>
                <Paperclip className="h-3.5 w-3.5" />
                {request.anexo_nome ?? 'Ver anexo'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejectOpen(true)}>
            <X className="mr-1 h-4 w-4" />
            Rejeitar
          </Button>
          <Button size="sm" disabled={busy} onClick={handleApprove}>
            <Check className="mr-1 h-4 w-4" />
            Aprovar
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição. O colaborador será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={decide.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={decide.isPending || reason.trim().length === 0} onClick={handleReject}>
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
