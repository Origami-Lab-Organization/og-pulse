import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStopFollowingTeamsMeeting, useUpdateTeamsMeetingNotes } from '@/hooks/useMeetingTranscriptions';
import { MeetingNotesEditor } from './MeetingNotesEditor';
import { LINKED_MEETING_STATUS_HINT } from '@/lib/meetingTranscription';
import { LinkedMeetingStatusBadge } from './MeetingTimelineCard';
import {
  LINKED_MEETING_STATUS,
  type LinkedMeetingStatus,
  type ProjectTeamsMeeting,
} from '@/types/meetingTranscription';

function meetingMeta(meeting: ProjectTeamsMeeting): string {
  const when = meeting.startsAt
    ? format(parseISO(meeting.startsAt), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : null;
  return [when, meeting.isSeries ? 'reunião recorrente' : null, `vinculada por ${meeting.registeredByName ?? 'alguém da equipe'}`]
    .filter(Boolean)
    .join(' · ');
}

function StatusExplanation(props: { meeting: ProjectTeamsMeeting; status: LinkedMeetingStatus }) {
  const { meeting, status } = props;
  const text = status === LINKED_MEETING_STATUS.COM_PROBLEMA ? meeting.lastError : LINKED_MEETING_STATUS_HINT[status];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkedMeetingStatusBadge status={status} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

interface LinkedMeetingDialogProps {
  meeting: ProjectTeamsMeeting | null;
  status: LinkedMeetingStatus | null;
  canEdit: boolean;
  canStop: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Reunião vinculada que ainda não tem transcrição: o que está acontecendo com ela e as notas
 * da equipe — pauta antes, ata se o Teams não transcrever.
 */
export function LinkedMeetingDialog(props: LinkedMeetingDialogProps) {
  const { meeting, status, canEdit, canStop, onOpenChange } = props;
  const saveNotes = useUpdateTeamsMeetingNotes();
  const stop = useStopFollowingTeamsMeeting();

  return (
    <Dialog open={Boolean(meeting)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex max-h-[85vh] flex-col">
        {meeting && status && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{meeting.eventSubject}</DialogTitle>
              <DialogDescription>{meetingMeta(meeting)}</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <StatusExplanation meeting={meeting} status={status} />
              <section className="space-y-2" aria-labelledby="meeting-notes-title">
                <h4 id="meeting-notes-title" className="text-sm font-semibold text-foreground">
                  Notas da reunião
                </h4>
                <MeetingNotesEditor
                  recordId={meeting.id}
                  value={meeting.notes}
                  updatedAt={meeting.notesUpdatedAt}
                  updatedByName={meeting.notesUpdatedByName}
                  canEdit={canEdit}
                  isSaving={saveNotes.isPending}
                  onSave={(notes, done) => saveNotes.mutate({ id: meeting.id, notes }, { onSuccess: done })}
                  emptyState={
                    <p className="text-sm text-muted-foreground">
                      Sem notas ainda. Use para a pauta antes da reunião, ou para a ata se ela não for
                      transcrita.
                    </p>
                  }
                />
              </section>
            </div>

            {canStop && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => stop.mutate(meeting.id, { onSuccess: () => onOpenChange(false) })}
                  disabled={stop.isPending}
                >
                  <BellOff className="mr-2 h-4 w-4" aria-hidden="true" />
                  Parar de acompanhar esta reunião
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
