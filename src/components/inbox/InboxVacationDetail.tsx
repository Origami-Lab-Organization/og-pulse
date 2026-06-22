// Casts `as any` nas tabelas de férias até a regeneração do types.ts do Supabase (ver TD-002).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/hooks/useNotifications';
import { useApproveVacation, useRejectVacation } from '@/hooks/useVacations';
import { VacationStatusBadge } from '@/components/vacation/VacationStatusBadge';
import { VacationRequestStatus } from '@/types/vacation';

interface Props {
  notification: Notification;
  onActionComplete: () => void;
}

interface InboxVacationData {
  status: VacationRequestStatus;
  startDate: string | null;
  endDate: string | null;
  days: number | null;
  canDecide: boolean;
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd/MM/yyyy');
  } catch {
    return iso;
  }
}

export function InboxVacationDetail({ notification, onActionComplete }: Props) {
  const { employee } = useAuth();
  const requestId = notification.reference_id;
  const approve = useApproveVacation();
  const reject = useRejectVacation();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const { data } = useQuery({
    queryKey: ['vacation-inbox-detail', requestId, employee?.id],
    enabled: !!requestId && !!employee?.id,
    queryFn: async (): Promise<InboxVacationData> => {
      const { data: req } = await supabase
        .from('vacation_requests' as any)
        .select('status, start_date, end_date, days_requested')
        .eq('id', requestId)
        .maybeSingle();
      const { data: myApproval } = await supabase
        .from('vacation_request_approvals' as any)
        .select('status')
        .eq('request_id', requestId)
        .eq('approver_id', employee!.id)
        .maybeSingle();
      const r = req as any;
      return {
        status: (r?.status ?? 'pending') as VacationRequestStatus,
        startDate: r?.start_date ?? null,
        endDate: r?.end_date ?? null,
        days: r?.days_requested ?? null,
        canDecide: r?.status === 'pending' && (myApproval as any)?.status === 'pending',
      };
    },
  });

  // Sinaliza o status ao painel pai não é necessário aqui; o badge é local.
  useEffect(() => {
    if (!showReject) setReason('');
  }, [showReject]);

  const handleApprove = () => approve.mutate(requestId, { onSuccess: onActionComplete });
  const handleReject = () =>
    reject.mutate(
      { requestId, reason: reason.trim() },
      { onSuccess: onActionComplete },
    );

  const busy = approve.isPending || reject.isPending;
  const meta = (notification.metadata ?? {}) as Record<string, any>;
  const startDate = data?.startDate ?? meta.start_date ?? null;
  const endDate = data?.endDate ?? meta.end_date ?? null;
  const days = data?.days ?? meta.days ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Período</span>
          <span className="font-medium">
            {fmt(startDate)} – {fmt(endDate)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground">Dias</span>
          <span className="font-medium">{days ?? '—'}</span>
        </div>
        {data && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <VacationStatusBadge status={data.status} />
          </div>
        )}
      </div>

      {data?.canDecide && !showReject && (
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => setShowReject(true)}>
            <X className="mr-1 h-4 w-4" />
            Recusar
          </Button>
          <Button disabled={busy} onClick={handleApprove}>
            <Check className="mr-1 h-4 w-4" />
            Aprovar
          </Button>
        </div>
      )}

      {data?.canDecide && showReject && (
        <div className="space-y-2">
          <Textarea
            placeholder="Motivo da recusa"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button variant="outline" disabled={reject.isPending} onClick={() => setShowReject(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={reject.isPending || reason.trim().length === 0}
              onClick={handleReject}
            >
              Confirmar recusa
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
