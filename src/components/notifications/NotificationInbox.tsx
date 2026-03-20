import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Paperclip, Bell, CheckCheck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  usePendingReimbursements,
  useApproveReimbursement,
  useRejectReimbursement,
  useReimbursementAttachments,
} from '@/hooks/useReimbursements';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type NotificationConfig = {
  icon: React.ReactNode;
  badgeClass: string;
  label: string;
  onClick?: () => void;
};

function useNotificationConfig(onOpenChange: (open: boolean) => void) {
  const navigate = useNavigate();

  return (n: { type?: string; reference_id?: string }): NotificationConfig => {
    if (n.type === 'timesheet_reminder') {
      return {
        icon: <Clock className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />,
        badgeClass: 'bg-amber-100 text-amber-700',
        label: 'Lembrete de Timesheet',
        onClick: () => { onOpenChange(false); navigate('/my-timesheet'); },
      };
    }
    if (n.type === 'timesheet_submitted') {
      return {
        icon: <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />,
        badgeClass: 'bg-green-100 text-green-700',
        label: 'Timesheet Enviado',
        onClick: () => {
          onOpenChange(false);
          navigate(n.reference_id ? `/alocacao/${n.reference_id}` : '/alocacao');
        },
      };
    }
    if (n.type === 'timesheet_manager_alert') {
      return {
        icon: <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />,
        badgeClass: 'bg-red-100 text-red-700',
        label: 'Timesheet Pendente',
        onClick: () => {
          onOpenChange(false);
          navigate(n.reference_id ? `/alocacao/${n.reference_id}?tab=timesheet` : '/alocacao');
        },
      };
    }
    return {
      icon: <Bell className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />,
      badgeClass: '',
      label: '',
    };
  };
}

export function NotificationInbox({ open, onOpenChange }: Props) {
  const { employee } = useAuth();
  const { data: pending = [], isLoading } = usePendingReimbursements();
  const { data: notifications = [], isLoading: loadingNotifs } = useNotifications();
  const approveMutation = useApproveReimbursement();
  const rejectMutation = useRejectReimbursement();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewAttachmentsId, setViewAttachmentsId] = useState<string | null>(null);

  const isManagerOrAdmin = employee?.is_gerente || employee?.isAdmin;
  const unreadNotifs = notifications.filter(n => !n.is_read);
  const getNotifConfig = useNotificationConfig(onOpenChange);

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    rejectMutation.mutate(
      { reimbursementId: rejectId, reason: rejectReason },
      { onSuccess: () => { setRejectId(null); setRejectReason(''); } }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Caixa de Entrada</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue={isManagerOrAdmin ? "pending" : "notifications"} className="mt-4">
            <TabsList className="w-full">
              {isManagerOrAdmin && (
                <TabsTrigger value="pending" className="flex-1">
                  Pendentes
                  {pending.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-[10px]">
                      {pending.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="notifications" className="flex-1">
                Notificações
                {unreadNotifs.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-[10px]">
                    {unreadNotifs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {isManagerOrAdmin && (
              <TabsContent value="pending">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Nenhum pedido pendente.</p>
                ) : (
                  <div className="space-y-3">
                    {pending.map((r) => (
                      <div key={r.id} className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{r.requester_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <span className="font-semibold text-sm">
                            {r.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>

                        <p className="text-sm">{r.description}</p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {r.is_internal ? (
                            <Badge variant="secondary">Interno</Badge>
                          ) : (
                            <>
                              {r.client_name && <Badge variant="outline">{r.client_name}</Badge>}
                              {r.project_name && <Badge variant="outline">{r.project_name}</Badge>}
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => setViewAttachmentsId(r.id)}>
                            <Paperclip className="h-3 w-3 mr-1" />
                            Anexos
                          </Button>
                          <div className="flex-1" />
                          <Button size="sm" variant="destructive" className="text-xs" onClick={() => setRejectId(r.id)} disabled={rejectMutation.isPending}>
                            <X className="h-3 w-3 mr-1" />
                            Rejeitar
                          </Button>
                          <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700" onClick={() => handleApprove(r.id)} disabled={approveMutation.isPending}>
                            <Check className="h-3 w-3 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="notifications">
              {loadingNotifs ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma notificação.</p>
              ) : (
                <div className="space-y-2">
                  {unreadNotifs.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending}
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Marcar todas como lidas
                      </Button>
                    </div>
                  )}
                  {notifications.map((n) => {
                    const config = getNotifConfig(n);
                    return (
                      <div
                        key={n.id}
                        className={`rounded-lg border p-3 space-y-1 transition-colors ${
                          !n.is_read ? 'bg-primary/5 border-primary/20' : ''
                        } ${config.onClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                        onClick={config.onClick}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {config.label ? (
                              config.icon
                            ) : (
                              <Bell className={`h-4 w-4 mt-0.5 shrink-0 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                            )}
                            <div>
                              {config.label && (
                                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1 ${config.badgeClass}`}>
                                  {config.label}
                                </span>
                              )}
                              <p className={`text-sm ${!n.is_read ? 'font-medium' : ''}`}>{n.title}</p>
                              {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          {!n.is_read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 shrink-0"
                              onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(n.id); }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(v) => { if (!v) { setRejectId(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Rejeição</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Informe o motivo da rejeição..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachments dialog */}
      <AttachmentsDialog
        reimbursementId={viewAttachmentsId}
        onClose={() => setViewAttachmentsId(null)}
      />
    </>
  );
}

function AttachmentsDialog({ reimbursementId, onClose }: { reimbursementId: string | null; onClose: () => void }) {
  const { data: attachments = [], isLoading } = useReimbursementAttachments(reimbursementId);

  const downloadFile = async (fileUrl: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('reimbursement-receipts')
      .createSignedUrl(fileUrl, 300);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
  };

  return (
    <Dialog open={!!reimbursementId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprovantes Anexados</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum anexo encontrado.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <button
                  className="text-sm text-primary hover:underline truncate"
                  onClick={() => downloadFile(a.file_url, a.file_name)}
                >
                  {a.file_name}
                </button>
                {a.file_size && (
                  <span className="text-xs text-muted-foreground">
                    {(a.file_size / 1024).toFixed(0)} KB
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
