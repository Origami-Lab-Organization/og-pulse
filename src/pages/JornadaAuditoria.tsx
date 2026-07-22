import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarOff, Check, FileClock, FileText, Loader2, ScanFace, Timer, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTimeTrackingAuditLog } from '@/hooks/useTimeTrackingAuditLog';
import { useEmployees } from '@/hooks/useEmployees';

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Timer; className: string }> = {
  punch_created: { label: 'Marcação registrada', icon: Timer, className: 'bg-primary/10 text-primary' },
  request_created: { label: 'Solicitação criada', icon: FileText, className: 'bg-warning-subtle text-warning-emphasis' },
  request_approved: { label: 'Solicitação aprovada', icon: Check, className: 'bg-success-subtle text-success-emphasis' },
  request_rejected: { label: 'Solicitação rejeitada', icon: X, className: 'bg-destructive-subtle text-destructive-emphasis' },
  face_profile_enrolled: { label: 'Reconhecimento facial cadastrado', icon: ScanFace, className: 'bg-primary/10 text-primary' },
  face_profile_deleted: { label: 'Reconhecimento facial removido', icon: ScanFace, className: 'bg-muted text-muted-foreground' },
  absence_period_registered: { label: 'Ausência lançada', icon: CalendarOff, className: 'bg-info-subtle text-info-emphasis' },
};

const FACE_MATCH_LABELS: Record<string, { label: string; className: string }> = {
  confirmado: { label: 'Facial confirmado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  nao_confirmado: { label: 'Facial não confirmado', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

const JornadaAuditoria = () => {
  const [employeeId, setEmployeeId] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { data: employees } = useEmployees();
  const { data: log, isLoading } = useTimeTrackingAuditLog({
    employeeId: employeeId === 'todos' ? undefined : employeeId,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });

  return (
    <AppLayout
      title="Ponto Eletrônico — Auditoria"
      description="Histórico de marcações, solicitações e decisões do módulo"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileClock className="h-4 w-4" />
              </span>
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {(employees || []).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-inicio">De</Label>
              <Input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-fim">Até</Label>
              <Input id="data-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Timer className="h-4 w-4" />
              </span>
              Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !log || log.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum evento encontrado para o filtro selecionado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((entry) => {
                    const actionConfig = ACTION_CONFIG[entry.action];
                    const ActionIcon = actionConfig?.icon ?? FileText;
                    const faceMatch = FACE_MATCH_LABELS[String(entry.metadata?.face_match_status ?? '')];
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                                actionConfig?.className ?? 'bg-muted text-muted-foreground',
                              )}
                            >
                              <ActionIcon className="h-3.5 w-3.5" />
                            </span>
                            {actionConfig?.label ?? entry.action}
                            {faceMatch && (
                              <Badge variant="secondary" className={faceMatch.className}>{faceMatch.label}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{entry.employees?.nome ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.description}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default JornadaAuditoria;
