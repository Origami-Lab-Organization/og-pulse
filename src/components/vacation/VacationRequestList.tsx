import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VacationRequest } from '@/types/vacation';
import { VacationStatusBadge } from './VacationStatusBadge';

interface Props {
  requests: VacationRequest[];
  showEmployee?: boolean;
  onCancel?: (requestId: string) => void;
  cancelingId?: string | null;
}

function fmt(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy');
  } catch {
    return iso;
  }
}

function approvalsSummary(request: VacationRequest): string {
  const approvals = request.approvals ?? [];
  if (request.auto_approved) return 'Aprovação automática';
  if (approvals.length === 0) return '—';
  const approved = approvals.filter((a) => a.status === 'approved').length;
  return `${approved}/${approvals.length} aprovações`;
}

export function VacationRequestList({ requests, showEmployee, onCancel, cancelingId }: Props) {
  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma solicitação de férias.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showEmployee && <TableHead>Funcionário</TableHead>}
            <TableHead>Período</TableHead>
            <TableHead className="text-center">Dias</TableHead>
            <TableHead>Aprovações</TableHead>
            <TableHead>Status</TableHead>
            {onCancel && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              {showEmployee && <TableCell className="font-medium">{r.employee_name ?? '—'}</TableCell>}
              <TableCell>
                {fmt(r.start_date)} – {fmt(r.end_date)}
              </TableCell>
              <TableCell className="text-center">{r.days_requested}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {approvalsSummary(r)}
                {r.status === 'rejected' && r.rejection_reason && (
                  <span className="block text-xs text-destructive">Motivo: {r.rejection_reason}</span>
                )}
              </TableCell>
              <TableCell>
                <VacationStatusBadge status={r.status} />
              </TableCell>
              {onCancel && (
                <TableCell className="text-right">
                  {r.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cancelingId === r.id}
                      onClick={() => onCancel(r.id)}
                    >
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
