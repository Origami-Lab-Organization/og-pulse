import { Badge, type BadgeProps } from '@/components/ui/badge';
import { MEETING_TRANSCRIPTION_STATUS_LABEL } from '@/lib/meetingTranscription';
import {
  MEETING_TRANSCRIPTION_STATUS,
  type MeetingTranscriptionStatus,
} from '@/types/meetingTranscription';

const STATUS_VARIANT: Record<MeetingTranscriptionStatus, BadgeProps['variant']> = {
  [MEETING_TRANSCRIPTION_STATUS.PENDENTE]: 'neutral',
  [MEETING_TRANSCRIPTION_STATUS.PROCESSANDO]: 'info',
  [MEETING_TRANSCRIPTION_STATUS.CONCLUIDA]: 'success',
  [MEETING_TRANSCRIPTION_STATUS.FALHOU]: 'destructive',
};

export function TranscriptionStatusBadge(props: { status: MeetingTranscriptionStatus }) {
  const { status } = props;
  return (
    <Badge variant={STATUS_VARIANT[status]} className="shrink-0">
      {MEETING_TRANSCRIPTION_STATUS_LABEL[status]}
    </Badge>
  );
}
