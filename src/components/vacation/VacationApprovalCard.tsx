import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { VacationRequest } from '@/types/vacation';
import { useApproveVacation, useRejectVacation } from '@/hooks/useVacations';

interface Props {
  request: VacationRequest;
  onResolved?: () => void;
}

function fmt(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy');
  } catch {
    return iso;
  }
}

export function VacationApprovalCard({ request, onResolved }: Props) {
  const approve = useApproveVacation();
  const reject = useRejectVacation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const busy = approve.isPending || reject.isPending;

  const handleApprove = () => {
    approve.mutate(request.id, { onSuccess: onResolved });
  };

  const handleReject = () => {
    reject.mutate(
      { requestId: request.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setReason('');
          onResolved?.();
        },
      },
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{request.employee_name ?? 'Funcionário'}</p>
          <p className="text-sm text-muted-foreground">
            {fmt(request.start_date)} – {fmt(request.end_date)} · {request.days_requested} dia(s)
          </p>
          {request.notes && <p className="mt-1 text-sm text-muted-foreground">“{request.notes}”</p>}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejectOpen(true)}>
            <X className="mr-1 h-4 w-4" />
            Recusar
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
            <AlertDialogTitle>Recusar solicitação de férias</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da recusa. O funcionário será notificado e a solicitação será encerrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da recusa"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reject.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={reject.isPending || reason.trim().length === 0} onClick={handleReject}>
              Recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
