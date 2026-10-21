import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Paperclip, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectEmailDetailDialog } from '@/components/projects/detail/ProjectEmailDetailDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectEmails } from '@/hooks/useProjectEmails';
import { filterProjectEmails } from '@/lib/projectEmail';
import type { ProjectEmailListItem } from '@/types/projectEmail';

interface EmailRowProps {
  email: ProjectEmailListItem;
  onOpen: () => void;
}

function EmailRow(props: EmailRowProps) {
  const { email, onOpen } = props;
  const sender = email.fromName || email.fromAddress || 'Remetente desconhecido';

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-lg border border-border p-3 text-left transition-colors
                   hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{email.subject}</p>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {format(parseISO(email.receivedAt), "d 'de' MMM yyyy", { locale: ptBR })}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">De {sender}</p>

        {email.summary && (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground">
            {email.summary}
          </p>
        )}

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Salvo por {email.savedByName ?? 'alguém da equipe'} em{' '}
            {format(parseISO(email.createdAt), "d 'de' MMM", { locale: ptBR })}
          </span>
          {email.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3 w-3" aria-hidden="true" />
              {email.attachments.length === 1 ? '1 anexo' : `${email.attachments.length} anexos`}
            </span>
          )}
        </p>
      </button>
    </li>
  );
}

function EmptyState(props: { message: string; hint?: string }) {
  const { message, hint } = props;
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <Mail className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{message}</p>
        {hint && <p className="max-w-md text-sm text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

interface ProjectEmailsTabProps {
  projectId: string;
  /** GP do projeto (ou quem gere qualquer projeto): edita resumo e remove e-mail de outros. */
  canManageProject: boolean;
}

/**
 * E-mails salvos no projeto como registro de decisão (ADR-0047). Salvar acontece na
 * caixa de entrada; aqui a equipe lê, busca e mantém o resumo.
 */
export function ProjectEmailsTab(props: ProjectEmailsTabProps) {
  const { projectId, canManageProject } = props;
  const { can } = useAuth();
  const { data: emails = [], isLoading, error } = useProjectEmails(projectId);
  const [search, setSearch] = useState('');
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);

  const visible = useMemo(() => filterProjectEmails(emails, search), [emails, search]);

  const renderList = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-24 w-full" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar os e-mails do projeto. Tente de novo em instantes.
          </AlertDescription>
        </Alert>
      );
    }

    if (!emails.length) {
      return (
        <EmptyState
          message="Nenhum e-mail salvo neste projeto."
          hint='Quando uma decisão chegar por e-mail, abra a mensagem em E-mails e use "Salvar no projeto". Ela aparece aqui para toda a equipe.'
        />
      );
    }

    if (!visible.length) {
      return <EmptyState message={`Nenhum e-mail encontrado para "${search.trim()}".`} />;
    }

    return (
      <ul className="space-y-2">
        {visible.map((email) => (
          <EmailRow key={email.id} email={email} onOpen={() => setOpenEmailId(email.id)} />
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">E-mails salvos</h3>
          <p className="text-sm text-muted-foreground">
            Decisões que chegaram por e-mail, registradas no projeto para ter rastreabilidade.
          </p>
        </div>
        {can('email-projeto:salvar') && (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/meus-emails">
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              Ir para E-mails
            </Link>
          </Button>
        )}
      </div>

      {emails.length > 0 && (
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(changed) => setSearch(changed.target.value)}
            placeholder="Buscar por assunto, resumo ou remetente"
            aria-label="Buscar e-mails do projeto"
            className="pl-9"
          />
        </div>
      )}

      {renderList()}

      <ProjectEmailDetailDialog
        emailId={openEmailId}
        projectId={projectId}
        canManageProject={canManageProject}
        onOpenChange={(open) => !open && setOpenEmailId(null)}
      />
    </div>
  );
}
