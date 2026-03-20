import { useState, useEffect, useRef } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check, X, Paperclip, Bell, CheckCheck, Clock, AlertTriangle,
  CheckCircle2, Plus, Receipt, DollarSign, XCircle, Inbox,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  Notification,
} from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { ReimbursementFormDialog, CorrectionData } from '@/components/reimbursements/ReimbursementFormDialog';
import { InboxReimbursementDetail } from './InboxReimbursementDetail';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type NotifFilter = 'all' | 'timesheet' | 'reimbursement' | 'action';

type NotificationConfig = {
  icon: React.ReactNode;
  badgeClass: string;
  label: string;
  onClick?: () => void;
  hasDetail?: boolean;
};

function useNotificationConfig(onOpenChange: (open: boolean) => void) {
  const navigate = useNavigate();

  return (n: Notification): NotificationConfig => {
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
    if (n.type === 'timesheet_pending') {
      return {
        icon: <Clock className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />,
        badgeClass: 'bg-amber-100 text-amber-700',
        label: 'Timesheet Pendente',
        onClick: () => { onOpenChange(false); navigate('/my-timesheet'); },
      };
    }
    if (n.type === 'timesheet_modified') {
      return {
        icon: <Clock className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />,
        badgeClass: 'bg-blue-100 text-blue-700',
        label: 'Timesheet Alterada',
        onClick: () => {
          onOpenChange(false);
          navigate(n.action_url || '/my-timesheet');
        },
      };
    }
    if (n.type === 'reimbursement_pending') {
      return {
        icon: <Receipt className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />,
        badgeClass: 'bg-amber-100 text-amber-700',
        label: 'Reembolso Pendente',
        hasDetail: true,
      };
    }
    if (n.type === 'reimbursement_rejected') {
      return {
        icon: <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />,
        badgeClass: 'bg-red-100 text-red-700',
        label: 'Reembolso Rejeitado',
        hasDetail: true,
      };
    }
    if (n.type === 'reimbursement_approved') {
      return {
        icon: <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />,
        badgeClass: 'bg-green-100 text-green-700',
        label: 'Reembolso Aprovado',
      };
    }
    if (n.type === 'reimbursement_paid') {
      return {
        icon: <DollarSign className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />,
        badgeClass: 'bg-blue-100 text-blue-700',
        label: 'Reembolso Pago',
      };
    }
    return {
      icon: <Bell className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />,
      badgeClass: '',
      label: '',
    };
  };
}

// ── Empty state helper ────────────────────────────────────────────────────────
function NotifEmptyState({
  icon,
  title,
  subtitle,
  green = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  green?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className={cn(
        'flex h-14 w-14 items-center justify-center rounded-full',
        green ? 'bg-green-50' : 'bg-muted',
      )}>
        <span className={cn(green ? 'text-green-600' : 'text-muted-foreground')}>
          {icon}
        </span>
      </div>
      <div>
        <p className={cn('text-sm font-medium', green ? 'text-green-700' : 'text-foreground')}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px]">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Filter helpers ────────────────────────────────────────────────────────────
function applyFilter(notifications: Notification[], filter: NotifFilter) {
  switch (filter) {
    case 'timesheet':
      return notifications.filter(n => n.type.startsWith('timesheet'));
    case 'reimbursement':
      return notifications.filter(n => n.type.startsWith('reimbursement'));
    case 'action':
      return notifications.filter(n => !n.is_resolved && !!n.action_type);
    default:
      return notifications;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export function NotificationInbox({ open, onOpenChange }: Props) {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: pending = [], isLoading } = usePendingReimbursements();
  const { data: notifications = [], isLoading: loadingNotifs } = useNotifications();
  const approveMutation = useApproveReimbursement();
  const rejectMutation = useRejectReimbursement();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewAttachmentsId, setViewAttachmentsId] = useState<string | null>(null);

  // New action / correction form
  const [reimbursementFormOpen, setReimbursementFormOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState<CorrectionData | null>(null);

  // Expanded notification detail
  const [expandedNotif, setExpandedNotif] = useState<Notification | null>(null);

  // Sub-filter for Notificações tab
  const [notifFilter, setNotifFilter] = useState<NotifFilter>('all');

  const isManagerOrAdmin = employee?.is_gerente || employee?.isAdmin;
  const unreadNotifs = notifications.filter(n => !n.is_read);
  const filteredNotifs = applyFilter(notifications, notifFilter);
  const getNotifConfig = useNotificationConfig(onOpenChange);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!employee?.id) return;

    const channel = supabase
      .channel('inbox-realtime-' + employee.id)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${employee.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
          queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
          queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [employee?.id, queryClient]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    rejectMutation.mutate(
      { reimbursementId: rejectId, reason: rejectReason },
      { onSuccess: () => { setRejectId(null); setRejectReason(''); } },
    );
  };

  const handleOpenCorrectForm = (data: CorrectionData) => {
    setCorrectionData(data);
    setReimbursementFormOpen(true);
    setExpandedNotif(null);
  };

  const handleNotifClick = (n: Notification, config: NotificationConfig) => {
    if (config.hasDetail) {
      setExpandedNotif(prev => (prev?.id === n.id ? null : n));
      if (!n.is_read) markReadMutation.mutate(n.id);
    } else if (config.onClick) {
      config.onClick();
    }
  };

  // ── Notification row renderer ────────────────────────────────────────────
  const renderNotifications = (list: Notification[]) => {
    if (list.length === 0) {
      return renderEmptyState();
    }

    return list.map((n, index) => {
      const config = getNotifConfig(n);
      const isExpanded = expandedNotif?.id === n.id;
      const isClickable = !!(config.onClick || config.hasDetail);

      return (
        <div
          key={n.id}
          className={cn(
            'rounded-lg border px-2 py-2 sm:px-3 sm:py-3 transition-all duration-300',
            !n.is_read ? 'bg-primary/5 border-primary/20' : '',
            isClickable ? 'cursor-pointer hover:bg-muted/50' : '',
          )}
          style={{ animation: `fadeIn 0.2s ease ${index * 0.03}s both` }}
          onClick={() => handleNotifClick(n, config)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <span className="shrink-0 mt-0.5">
                {config.label
                  ? config.icon
                  : <Bell className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', !n.is_read ? 'text-primary' : 'text-muted-foreground')} />
                }
              </span>
              <div className="flex-1 min-w-0">
                {config.label && (
                  <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1 ${config.badgeClass}`}>
                    {config.label}
                  </span>
                )}
                <p className={`text-sm leading-snug ${!n.is_read ? 'font-medium' : ''}`}>{n.title}</p>
                {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                <p className="hidden sm:block text-xs text-muted-foreground mt-1">
                  {format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(n.created_at), 'dd/MM HH:mm')}
                </p>
              </div>
            </div>
            {!n.is_read && !config.hasDetail && (
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

          {/* Inline detail (desktop) or tracked for mobile sheet */}
          {config.hasDetail && isExpanded && n.reference_id && !isMobile && (
            <div
              className="inbox-detail-enter"
              onClick={(e) => e.stopPropagation()}
            >
              <InboxReimbursementDetail
                notification={n}
                onResolved={() => setExpandedNotif(null)}
                onOpenCorrectForm={handleOpenCorrectForm}
              />
            </div>
          )}
        </div>
      );
    });
  };

  const renderEmptyState = () => {
    switch (notifFilter) {
      case 'timesheet':
        return (
          <NotifEmptyState
            icon={<Clock className="h-7 w-7" />}
            title="Nenhum lembrete de timesheet"
            subtitle="Seus lembretes de lançamento de horas aparecerão aqui."
          />
        );
      case 'reimbursement':
        return (
          <NotifEmptyState
            icon={<Receipt className="h-7 w-7" />}
            title="Nenhuma notificação de reembolso"
            subtitle="Atualizações sobre seus pedidos de reembolso aparecerão aqui."
          />
        );
      case 'action':
        return (
          <NotifEmptyState
            icon={<CheckCircle2 className="h-7 w-7" />}
            title="Tudo em dia!"
            subtitle="Não há ações pendentes no momento."
            green
          />
        );
      default:
        return (
          <NotifEmptyState
            icon={<Inbox className="h-7 w-7" />}
            title="Nenhuma notificação"
            subtitle="Quando houver lembretes ou ações pendentes, eles aparecerão aqui."
          />
        );
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between pr-6">
            <SheetTitle>Caixa de Entrada</SheetTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setCorrectionData(null); setReimbursementFormOpen(true); }}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Pedido de reembolso
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SheetHeader>

          <Tabs defaultValue={isManagerOrAdmin ? 'pending' : 'notifications'} className="mt-4">
            <div className="overflow-x-auto">
              <TabsList className="w-full min-w-max">
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
            </div>

            {/* ── Pendentes tab ──────────────────────────────────────────── */}
            {isManagerOrAdmin && (
              <TabsContent value="pending">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Carregando...</p>
                ) : pending.length === 0 ? (
                  <NotifEmptyState
                    icon={<CheckCircle2 className="h-7 w-7" />}
                    title="Tudo em dia!"
                    subtitle="Não há pedidos aguardando aprovação no momento."
                    green
                  />
                ) : (
                  <div className="space-y-3 mt-2">
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

            {/* ── Notificações tab ───────────────────────────────────────── */}
            <TabsContent value="notifications">
              {/* Sub-filter buttons */}
              <div className="flex gap-1 mt-2 mb-3 overflow-x-auto pb-1">
                {(['all', 'timesheet', 'reimbursement', 'action'] as NotifFilter[]).map((f) => {
                  const labels: Record<NotifFilter, string> = {
                    all: 'Todas',
                    timesheet: 'Timesheet',
                    reimbursement: 'Reembolsos',
                    action: 'Ações',
                  };
                  return (
                    <Button
                      key={f}
                      size="sm"
                      variant={notifFilter === f ? 'default' : 'outline'}
                      className="h-7 text-xs shrink-0"
                      onClick={() => setNotifFilter(f)}
                    >
                      {labels[f]}
                    </Button>
                  );
                })}
              </div>

              {loadingNotifs ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {filteredNotifs.length > 0 && unreadNotifs.length > 0 && notifFilter === 'all' && (
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
                  {renderNotifications(filteredNotifs)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Mobile: expanded reimbursement detail in a bottom sheet */}
      {isMobile && expandedNotif && expandedNotif.reference_id && (
        <Sheet open={!!expandedNotif} onOpenChange={(v) => { if (!v) setExpandedNotif(null); }}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle className="text-base">
                {expandedNotif.title}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-3">
              {expandedNotif.message && (
                <p className="text-sm text-muted-foreground mb-3">{expandedNotif.message}</p>
              )}
              <InboxReimbursementDetail
                notification={expandedNotif}
                onResolved={() => setExpandedNotif(null)}
                onOpenCorrectForm={handleOpenCorrectForm}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Pending reimbursement reject dialog */}
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

      {/* Reimbursement form: new request or correction */}
      <ReimbursementFormDialog
        open={reimbursementFormOpen}
        onOpenChange={(v) => {
          setReimbursementFormOpen(v);
          if (!v) setCorrectionData(null);
        }}
        correctionData={correctionData}
      />
    </>
  );
}

// ── Attachments dialog ────────────────────────────────────────────────────────
function AttachmentsDialog({ reimbursementId, onClose }: { reimbursementId: string | null; onClose: () => void }) {
  const { data: attachments = [], isLoading } = useReimbursementAttachments(reimbursementId);

  const downloadFile = async (fileUrl: string) => {
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
                  onClick={() => downloadFile(a.file_url)}
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
