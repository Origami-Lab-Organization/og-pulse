import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpdateTermination } from '@/hooks/useTerminations';
import { TerminationWithEmployee } from '@/services/terminationService';
import {
  TERMINATION_TYPES, TERMINATION_TYPE_LABELS,
  REASON_CATEGORIES, REASON_CATEGORY_LABELS,
  TerminationType, ReasonCategory,
} from '@/types/termination';

interface TerminationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termination: TerminationWithEmployee | null;
}

export const TerminationEditDialog = ({ open, onOpenChange, termination }: TerminationEditDialogProps) => {
  const updateTermination = useUpdateTermination();

  const [terminationType, setTerminationType] = useState<TerminationType>('voluntary');
  const [terminationDate, setTerminationDate] = useState('');
  const [notificationDate, setNotificationDate] = useState('');
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory>('other');
  const [reason, setReason] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState(0);
  const [noticeWorked, setNoticeWorked] = useState(false);
  const [exitInterviewCompleted, setExitInterviewCompleted] = useState(false);
  const [exitInterviewNotes, setExitInterviewNotes] = useState('');

  useEffect(() => {
    if (!termination) return;
    setTerminationType(termination.termination_type as TerminationType);
    setTerminationDate(termination.termination_date);
    setNotificationDate(termination.notification_date || '');
    setReasonCategory(termination.reason_category as ReasonCategory);
    setReason(termination.reason || '');
    setNoticePeriodDays(termination.notice_period_days || 0);
    setNoticeWorked(termination.notice_worked || false);
    setExitInterviewCompleted(termination.exit_interview_completed || false);
    setExitInterviewNotes(termination.exit_interview_notes || '');
  }, [termination]);

  if (!termination) return null;

  const handleSave = () => {
    updateTermination.mutate(
      {
        id: termination.id,
        updates: {
          termination_type: terminationType,
          termination_date: terminationDate,
          notification_date: notificationDate || null,
          reason_category: reasonCategory,
          reason: reason || null,
          notice_period_days: noticePeriodDays,
          notice_worked: noticeWorked,
          exit_interview_completed: exitInterviewCompleted,
          exit_interview_notes: exitInterviewNotes || null,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Desligamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Desligamento</Label>
            <Select value={terminationType} onValueChange={(v) => setTerminationType(v as TerminationType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TERMINATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{TERMINATION_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Desligamento</Label>
              <Input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Notificação</Label>
              <Input type="date" value={notificationDate} onChange={(e) => setNotificationDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria do Motivo</Label>
            <Select value={reasonCategory} onValueChange={(v) => setReasonCategory(v as ReasonCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASON_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{REASON_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dias de Aviso Prévio</Label>
              <Input type="number" min={0} value={noticePeriodDays} onChange={(e) => setNoticePeriodDays(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={noticeWorked} onCheckedChange={setNoticeWorked} />
              <Label>Aviso Trabalhado</Label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={exitInterviewCompleted} onCheckedChange={setExitInterviewCompleted} />
              <Label>Entrevista de Saída Realizada</Label>
            </div>
            {exitInterviewCompleted && (
              <Textarea
                value={exitInterviewNotes}
                onChange={(e) => setExitInterviewNotes(e.target.value)}
                placeholder="Notas da entrevista de saída..."
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateTermination.isPending}>
            {updateTermination.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
