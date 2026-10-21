import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, Loader2, Paperclip, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { MessageBody } from '@/components/email/MessageBody';
import { RecipientLine } from '@/components/email/RecipientLine';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDeleteProjectEmail,
  useProjectEmailDetail,
  useUpdateProjectEmailSummary,
} from '@/hooks/useProjectEmails';
import { MAX_SUMMARY_CHARS, canChangeSavedEmail, safeAttachmentUrl } from '@/lib/projectEmail';
import type { ProjectEmailAttachment, ProjectEmailDetail } from '@/types/projectEmail';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SummaryEditorProps {
  email: ProjectEmailDetail;
  projectId: string;
  onDone: () => void;
}

function SummaryEditor(props: SummaryEditorProps) {
  const { email, projectId, onDone } = props;
  const update = useUpdateProjectEmailSummary(projectId);
  const [draft, setDraft] = useState(email.summary ?? '');

  return (
    <div className="space-y-2">
      <Label htmlFor="project-email-summary">O que foi decidido</Label>
      <Textarea
        id="project-email-summary"
        value={draft}
        onChange={(changed) => setDraft(changed.target.value)}
        maxLength={MAX_SUMMARY_CHARS}
        rows={3}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onDone} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={update.isPending}
          onClick={() => update.mutate({ id: email.id, summary: draft }, { onSuccess: onDone })}
        >
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar resumo
        </Button>
      </div>
    </div>
  );
}

interface SummarySectionProps {
  email: ProjectEmailDetail;
  projectId: string;
  canChange: boolean;
}

/** O resumo é a única parte do registro que muda depois de salvo (trigger do banco). */
function SummarySection(props: SummarySectionProps) {
  const { email, projectId, canChange } = props;
  const [editing, setEditing] = useState(false);

  // Abrir outro e-mail no mesmo diálogo não pode herdar o modo de edição.
  useEffect(() => setEditing(false), [email.id]);

  if (editing) {
    return <SummaryEditor email={email} projectId={projectId} onDone={() => setEditing(false)} />;
  }

  if (!email.summary && !canChange) return null;

  return (
    <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="ol-label text-muted-foreground">O que foi decidido</p>
        {canChange && (
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {email.summary ? 'Editar' : 'Escrever resumo'}
          </Button>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
        {email.summary || 'Sem resumo. Escreva em uma frase o que este e-mail decidiu.'}
      </p>
    </div>
  );
}

/** Anexos copiados para o OneDrive. Quem abre o arquivo é o compartilhamento de lá (ADR-0019). */
function SavedAttachments(props: { attachments: ProjectEmailAttachment[] }) {
  const { attachments } = props;
  if (!attachments.length) return null;

  return (
    <div>
      <p className="ol-label text-muted-foreground mb-2">
        Anexos no OneDrive ({attachments.length})
      </p>
      <ul className="space-y-1.5">
        {attachments.map((attachment) => {
          const href = safeAttachmentUrl(attachment.webUrl);
          return (
            <li
              key={attachment.itemId}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{attachment.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatSize(attachment.size)}
              </span>
              {href && (
                <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${attachment.name} no OneDrive`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface RemoveEmailButtonProps {
  emailId: string;
  projectId: string;
  onRemoved: () => void;
}

function RemoveEmailButton(props: RemoveEmailButtonProps) {
  const { emailId, projectId, onRemoved } = props;
  const remove = useDeleteProjectEmail(projectId);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Remover do projeto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover este e-mail do projeto?</AlertDialogTitle>
          <AlertDialogDescription>
            A cópia sai do projeto para toda a equipe. O e-mail continua na caixa de quem o
            recebeu, e os anexos continuam na pasta do OneDrive.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => remove.mutate(emailId, { onSuccess: onRemoved })}
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DetailContentProps {
  email: ProjectEmailDetail;
  projectId: string;
  canChange: boolean;
}

function DetailContent(props: DetailContentProps) {
  const { email, projectId, canChange } = props;
  const sender = email.fromName && email.fromAddress && email.fromName !== email.fromAddress
    ? `${email.fromName} <${email.fromAddress}>`
    : email.fromName || email.fromAddress || 'Remetente desconhecido';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="break-words text-sm font-medium text-foreground">{sender}</p>
        <RecipientLine label="Para" names={email.to} />
        <RecipientLine label="Cc" names={email.cc} />
        <p className="text-xs text-muted-foreground">
          Recebido em {format(parseISO(email.receivedAt), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          {' · '}salvo por {email.savedByName ?? 'alguém da equipe'} em{' '}
          {format(parseISO(email.createdAt), "d 'de' MMM", { locale: ptBR })}
        </p>
      </div>

      <SummarySection email={email} projectId={projectId} canChange={canChange} />
      <SavedAttachments attachments={email.attachments} />
      <MessageBody message={email} />
    </div>
  );
}

interface DialogStateProps {
  email: ProjectEmailDetail | undefined;
  isLoading: boolean;
  hasError: boolean;
  projectId: string;
  canChange: boolean;
}

/** Carregando, falha ou o e-mail — um estado de cada vez. */
function DialogState(props: DialogStateProps) {
  const { email, isLoading, hasError, projectId, canChange } = props;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (hasError || !email) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível abrir este e-mail. Ele pode ter sido removido do projeto.
        </AlertDescription>
      </Alert>
    );
  }

  return <DetailContent email={email} projectId={projectId} canChange={canChange} />;
}

interface ProjectEmailDetailDialogProps {
  emailId: string | null;
  projectId: string;
  canManageProject: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Cópia salva do e-mail — a mesma renderização isolada da caixa de entrada. */
export function ProjectEmailDetailDialog(props: ProjectEmailDetailDialogProps) {
  const { emailId, projectId, canManageProject, onOpenChange } = props;
  const { employee } = useAuth();
  const { data: email, isLoading, error } = useProjectEmailDetail(emailId);
  const canChange = Boolean(email) && canChangeSavedEmail(email.savedById, employee?.id, canManageProject);

  return (
    <Dialog open={Boolean(emailId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle className="pr-6">{email?.subject ?? 'E-mail'}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <DialogState
            email={email}
            isLoading={isLoading}
            hasError={Boolean(error)}
            projectId={projectId}
            canChange={canChange}
          />
        </div>

        {canChange && (
          <div className="flex justify-end">
            <RemoveEmailButton
              emailId={email.id}
              projectId={projectId}
              onRemoved={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
