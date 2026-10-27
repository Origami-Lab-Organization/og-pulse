import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ExternalLink, FolderCheck, FolderInput } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { describeGraphError, useMailMessageDetail } from '@/hooks/useMicrosoftGraph';
import { useEmailPlacements } from '@/hooks/useProjectEmails';
import { InviteResponseButtons } from '@/components/microsoft/InviteResponseButtons';
import { MessageAttachments } from './MessageAttachments';
import { MessageBody } from './MessageBody';
import { RecipientLine } from './RecipientLine';
import { SaveEmailToProjectDialog } from './SaveEmailToProjectDialog';
import { MEETING_MESSAGE_TYPE } from '@/types/microsoftGraph';
import type { MailMessageDetail, MeetingInvite } from '@/types/microsoftGraph';

function invitePeriod(invite: MeetingInvite): string {
  if (!invite.start) return 'Horário não informado';
  const start = parseISO(invite.start);
  if (invite.isAllDay) {
    return `${format(start, "EEEE, d 'de' MMMM", { locale: ptBR })} · dia inteiro`;
  }
  const end = invite.end ? parseISO(invite.end) : null;
  return `${format(start, "EEE, d 'de' MMM · HH:mm", { locale: ptBR })}${
    end ? ` – ${format(end, 'HH:mm')}` : ''
  }`;
}

/**
 * Cartão de convite de reunião, com as mesmas respostas do Outlook. Age sobre o
 * evento vinculado ao e-mail e avisa o organizador.
 */
function MeetingInviteCard({ invite }: { invite: MeetingInvite }) {
  if (invite.meetingMessageType === MEETING_MESSAGE_TYPE.CANCELLED) {
    return (
      <Alert>
        <AlertDescription>Esta reunião foi cancelada pelo organizador.</AlertDescription>
      </Alert>
    );
  }

  if (invite.meetingMessageType !== MEETING_MESSAGE_TYPE.REQUEST) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-start gap-2.5 text-sm">
        <CalendarDays
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-medium text-foreground first-letter:uppercase">
            {invitePeriod(invite)}
          </p>
          {invite.location && (
            <p className="text-muted-foreground">{invite.location}</p>
          )}
        </div>
      </div>

      <InviteResponseButtons eventId={invite.eventId} currentResponse={invite.myResponse} />
    </div>
  );
}

interface SavedInProjectsProps {
  internetMessageId: string | null;
}

/**
 * Projetos onde este e-mail já está salvo (ADR-0047). Mostra antes do botão para
 * ninguém salvar de novo no mesmo lugar, e leva direto à aba E-mails do projeto.
 */
function SavedInProjects(props: SavedInProjectsProps) {
  const { internetMessageId } = props;
  const { can } = useAuth();
  const { data: placements } = useEmailPlacements(internetMessageId);

  if (!placements?.length) return null;

  // Mesmo destino da lista de projetos: quem vê o portfólio abre a ficha completa.
  const projectBase = can('portfolio:ler') ? '/projects' : '/my-projects';

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <FolderCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="shrink-0 text-muted-foreground">Salvo em:</span>
      {placements.map((placement) => (
        <Link
          key={placement.id}
          to={`${projectBase}/${placement.projectId}?tab=emails`}
          className="max-w-56 truncate rounded-full bg-muted px-2 py-0.5 text-xs text-foreground
                     hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {placement.projectName}
        </Link>
      ))}
    </div>
  );
}

function DetailBody({ message }: { message: MailMessageDetail }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{message.from}</p>
        <RecipientLine label="Para" names={message.to} />
        <RecipientLine label="Cc" names={message.cc} />
        <p className="text-xs text-muted-foreground">
          {format(parseISO(message.receivedAt), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      <SavedInProjects internetMessageId={message.internetMessageId} />

      {message.meetingInvite && <MeetingInviteCard invite={message.meetingInvite} />}

      <MessageAttachments messageId={message.id} />

      <MessageBody message={message} />
    </div>
  );
}

function ReaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

interface ReaderActionsProps {
  message: MailMessageDetail;
  canSaveToProject: boolean;
  onSave: () => void;
}

function ReaderActions(props: ReaderActionsProps) {
  const { message, canSaveToProject, onSave } = props;
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row">
      {message.webLink && (
        <Button asChild variant="outline" className="flex-1">
          <a href={message.webLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Abrir no Outlook
          </a>
        </Button>
      )}
      {canSaveToProject && (
        <Button className="flex-1" onClick={onSave}>
          <FolderInput className="mr-2 h-4 w-4" aria-hidden="true" />
          Salvar no projeto
        </Button>
      )}
    </div>
  );
}

interface MessageReaderProps {
  messageId: string;
  /** Título: `DialogTitle` na janela, `h2` na coluna de leitura. */
  renderTitle: (subject: string) => ReactNode;
}

/**
 * Leitura de um e-mail — o mesmo conteúdo na coluna da direita (tela larga) e
 * na janela por cima (celular).
 */
export function MessageReader(props: MessageReaderProps) {
  const { messageId, renderTitle } = props;
  const { data: message, isLoading, error } = useMailMessageDetail(messageId);
  const { can } = useAuth();
  const canSaveToProject = can('email-projeto:salvar');
  const [saveOpen, setSaveOpen] = useState(false);

  // Trocar de e-mail fecha o "Salvar no projeto" que ficou aberto no anterior.
  useEffect(() => setSaveOpen(false), [messageId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {renderTitle(message?.subject ?? 'E-mail')}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <ReaderContent message={message} isLoading={isLoading} error={error} />
      </div>

      {message && (
        <>
          <ReaderActions
            message={message}
            canSaveToProject={canSaveToProject}
            onSave={() => setSaveOpen(true)}
          />
          {canSaveToProject && (
            <SaveEmailToProjectDialog message={message} open={saveOpen} onOpenChange={setSaveOpen} />
          )}
        </>
      )}
    </div>
  );
}

interface ReaderContentProps {
  message: MailMessageDetail | undefined;
  isLoading: boolean;
  error: unknown;
}

function ReaderContent(props: ReaderContentProps) {
  const { message, isLoading, error } = props;
  if (isLoading) return <ReaderSkeleton />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{describeGraphError(error)}</AlertDescription>
      </Alert>
    );
  }
  return message ? <DetailBody message={message} /> : null;
}
