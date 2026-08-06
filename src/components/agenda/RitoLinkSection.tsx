import { useState } from 'react';
import { Link2, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLinkProjectRito,
  useRitoEligibleProjects,
  useRitoLinks,
  useUnlinkProjectRito,
} from '@/hooks/useProjectRitos';
import {
  PROJECT_RITO_LABEL,
  PROJECT_RITO_TYPE,
} from '@/types/projectRito';
import type { ProjectRitoLink, ProjectRitoType } from '@/types/projectRito';
import { EVENT_TYPE } from '@/types/microsoftGraph';
import type { CalendarEventDetail } from '@/types/microsoftGraph';

function LinkedRito({
  link,
  onRemove,
  isRemoving,
}: {
  link: ProjectRitoLink;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Badge variant="secondary">{PROJECT_RITO_LABEL[link.ritoType]}</Badge>
        <span className="truncate text-foreground">{link.projectName}</span>
        {link.linkedByName && (
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            por {link.linkedByName}
          </span>
        )}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label={`Remover vínculo com ${link.projectName}`}
        onClick={onRemove}
        disabled={isRemoving}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  );
}

/**
 * Vínculo do compromisso a um rito de projeto. Opcional por decisão de produto
 * (ADR-0011): nada aqui bloqueia o uso da agenda. A identidade usada é o
 * `iCalUId`, então quem vincula não precisa ser o organizador.
 */
export function RitoLinkSection({ event }: { event: CalendarEventDetail }) {
  const links = useRitoLinks(event.icalUid);
  const projects = useRitoEligibleProjects();
  const linkRito = useLinkProjectRito();
  const unlinkRito = useUnlinkProjectRito();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [ritoType, setRitoType] = useState<ProjectRitoType>(PROJECT_RITO_TYPE.DAILY);

  const submit = () => {
    if (!projectId) return;
    linkRito.mutate(
      {
        projectId,
        ritoType,
        icalUid: event.icalUid,
        eventTitle: event.subject,
        isSeries:
          Boolean(event.seriesMasterId) || event.eventType !== EVENT_TYPE.SINGLE,
      },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          setProjectId('');
        },
      },
    );
  };

  // Sem iCalUId não há como identificar a reunião entre agendas diferentes.
  if (!event.icalUid) return null;

  return (
    <div className="border-t border-border pt-3">
      <p className="ol-label text-muted-foreground mb-2">Rito de projeto</p>

      {links.isLoading ? (
        <Skeleton className="h-6 w-48" />
      ) : links.data?.length ? (
        <ul className="space-y-1.5">
          {links.data.map((link) => (
            <LinkedRito
              key={link.id}
              link={link}
              onRemove={() => unlinkRito.mutate(link.id)}
              isRemoving={unlinkRito.isPending}
            />
          ))}
        </ul>
      ) : null}

      {!isFormOpen ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 px-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsFormOpen(true)}
        >
          <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
          {links.data?.length ? 'Vincular a outro projeto' : 'Vincular a um rito de projeto'}
        </Button>
      ) : (
        <div className="mt-2 space-y-3 rounded-lg border border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="rito-project">Projeto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="rito-project">
                <SelectValue
                  placeholder={
                    projects.isLoading ? 'Carregando...' : 'Escolha entre os seus projetos'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects.data?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!projects.isLoading && !projects.data?.length && (
              <p className="text-sm text-muted-foreground">
                Você não está alocado em nenhum projeto ativo.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rito-type">Rito</Label>
            <Select
              value={ritoType}
              onValueChange={(value) => setRitoType(value as ProjectRitoType)}
            >
              <SelectTrigger id="rito-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_RITO_LABEL).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
              disabled={linkRito.isPending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={!projectId || linkRito.isPending}
            >
              {linkRito.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Vincular
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
