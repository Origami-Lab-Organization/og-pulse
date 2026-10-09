import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, History, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  commercialContactHref,
  fetchCommercialContactSummary,
} from '@/services/commercialContactService';
import { getProspectStageLabel } from '@/types/prospect';

interface ProspectOriginLinkProps {
  prospectId: string | null | undefined;
}

/**
 * Origem comercial do projeto: a oportunidade que virou este projeto (`projects.prospect_id`).
 * Substituiu o histórico da oportunidade antiga em 29/09/2026; desde 09/10/2026 a
 * oportunidade é da empresa e leva o nome dela, com o contato principal ao lado.
 */
export function ProspectOriginLink({ prospectId }: ProspectOriginLinkProps) {
  const { can } = useAuth();
  const canRead = can('prospeccao:ler');

  const { data: contact, isLoading, isError } = useQuery({
    queryKey: ['prospect-origin', prospectId],
    queryFn: () => fetchCommercialContactSummary(prospectId!),
    enabled: !!prospectId && canRead,
    staleTime: 60_000,
  });

  if (!prospectId) {
    return (
      <p className="text-xs text-muted-foreground">Projeto criado sem oportunidade de origem.</p>
    );
  }

  if (!canRead) {
    return (
      <p className="text-xs text-muted-foreground">Origem comercial registrada numa oportunidade.</p>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-xs text-destructive">
        Não foi possível carregar a origem comercial.
      </p>
    );
  }

  if (!isLoading && !contact) {
    return (
      <p className="text-xs text-muted-foreground">O contato de origem não está mais disponível.</p>
    );
  }

  return (
    <Link
      to={commercialContactHref(prospectId)}
      className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex min-w-0 items-start gap-3">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">
            {contact ? nomeDaOportunidade(contact) : 'Carregando…'}
          </p>
          {contact && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {contact.contact_name && (
                <>
                  <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{contact.contact_name}</span>
                  <span>·</span>
                </>
              )}
              <span>Cadastrada em {format(new Date(contact.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
              <span>·</span>
              <span className="font-medium text-primary">{getProspectStageLabel(contact.stage)}</span>
            </div>
          )}
        </div>
      </div>
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

/** A oportunidade leva o nome da empresa (09/10/2026). */
function nomeDaOportunidade(contact: { company: { name: string } | null }): string {
  return contact.company?.name ?? 'Oportunidade';
}
