import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Notification, useMarkNotificationRead } from '@/hooks/useNotifications';
import { useInboxNotifications, useInboxCounts, useMarkAllInboxRead } from '@/hooks/useInboxNotifications';
import { InboxNotificationList } from '@/components/inbox/InboxNotificationList';
import { InboxDetailPanel } from '@/components/inbox/InboxDetailPanel';
import { InboxNewActionMenu } from '@/components/inbox/InboxNewActionMenu';
import { ReimbursementFormDialog, CorrectionData } from '@/components/reimbursements/ReimbursementFormDialog';

type ActiveTab = 'all' | 'timesheet' | 'reimbursement';
type StatusFilter = 'all' | 'unread' | 'action';

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [reimbursementFormOpen, setReimbursementFormOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState<CorrectionData | null>(null);

  const { data: counts = { total: 0, timesheet: 0, reimbursement: 0 } } = useInboxCounts();
  const { data: notifications = [], isLoading } = useInboxNotifications({
    category: activeTab,
    status: statusFilter,
  });

  const markAllRead = useMarkAllInboxRead();
  const markRead = useMarkNotificationRead();

  const handleSelectNotification = (n: Notification) => {
    setSelectedNotification(n);
    if (!n.is_read) markRead.mutate(n.id);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ActiveTab);
    setSelectedNotification(null);
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter as StatusFilter);
    setSelectedNotification(null);
  };

  const handleActionComplete = () => {
    setSelectedNotification(null);
  };

  const handleOpenCorrectForm = (data: CorrectionData) => {
    setCorrectionData(data);
    setReimbursementFormOpen(true);
    setSelectedNotification(null);
  };

  const headerActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => markAllRead.mutate()}
        disabled={counts.total === 0 || markAllRead.isPending}
      >
        Marcar todas como lidas
      </Button>
      <InboxNewActionMenu
        onReimbursementClick={() => {
          setCorrectionData(null);
          setReimbursementFormOpen(true);
        }}
      />
    </>
  );

  return (
    <AppLayout
      title="Caixa de entrada"
      description="Notificações e ações pendentes"
      actions={headerActions}
    >
      {/* Negative margin to cancel AppLayout padding, then control height */}
      <div className="-mx-6 -mt-6 flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
        {/* Tabs + filter bar */}
        <div className="px-6 py-3 border-b flex items-center justify-between gap-4 flex-shrink-0 bg-background">
          <div className="overflow-x-auto">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  Todas
                  {counts.total > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground hover:bg-destructive">
                      {counts.total > 99 ? '99+' : counts.total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="timesheet" className="gap-2">
                  Timesheet
                  {counts.timesheet > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-amber-500 text-white hover:bg-amber-500">
                      {counts.timesheet}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reimbursement" className="gap-2">
                  Reembolsos
                  {counts.reimbursement > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-blue-500 text-white hover:bg-blue-500">
                      {counts.reimbursement}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[170px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="action">Ação necessária</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Master-detail */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: notification list */}
          <div className="w-[420px] border-r overflow-y-auto flex-shrink-0">
            <InboxNotificationList
              notifications={notifications}
              selectedId={selectedNotification?.id ?? null}
              onSelect={handleSelectNotification}
              isLoading={isLoading}
              category={activeTab}
              filter={statusFilter}
            />
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 overflow-y-auto">
            {selectedNotification ? (
              <InboxDetailPanel
                key={selectedNotification.id}
                notification={selectedNotification}
                onActionComplete={handleActionComplete}
                onOpenCorrectForm={handleOpenCorrectForm}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Inbox className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Selecione uma notificação</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha um item à esquerda para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReimbursementFormDialog
        open={reimbursementFormOpen}
        onOpenChange={(open) => {
          setReimbursementFormOpen(open);
          if (!open) setCorrectionData(null);
        }}
        correctionData={correctionData}
      />
    </AppLayout>
  );
}
