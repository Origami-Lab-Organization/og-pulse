import { useState } from 'react';
import { AudioLines, Link2, Loader2, X } from 'lucide-react';
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
  useEventTeamsMeetings,
  useSetUpTeamsMeeting,
  useStopFollowingTeamsMeeting,
} from '@/hooks/useMeetingTranscriptions';
import { useAuth } from '@/contexts/AuthContext';
import {
  PROJECT_RITO_LABEL,
  PROJECT_RITO_TYPE,
} from '@/types/projectRito';
import type { ProjectRitoLink, ProjectRitoType } from '@/types/projectRito';
import type { ProjectTeamsMeeting } from '@/types/meetingTranscription';
import { EVENT_TYPE } from '@/types/microsoftGraph';
import type { CalendarEventDetail } from '@/types/microsoftGraph';

/** Reunião do projeto que não é rito — a transcrição vai para o projeto do mesmo jeito. */
const NOT_A_RITO = 'nenhum';
type RitoChoice = ProjectRitoType | typeof NOT_A_RITO;

interface LinkedItemProps {
  label: string;
  projectName: string;
  detail: string | null;
  icon?: 'transcript';
  onRemove: () => void;
  isRemoving: boolean;
}

function LinkedItem(props: LinkedItemProps) {
  const { label, projectName, detail, icon, onRemove, isRemoving } = props;
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Badge variant="secondary" className="shrink-0">
          {icon && <AudioLines className="mr-1 h-3 w-3" aria-hidden="true" />}
          {label}
        </Badge>
        <span className="truncate text-foreground">{projectName}</span>
        {detail && (
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">{detail}</span>
        )}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label={`Remover vínculo com ${projectName}`}
        onClick={onRemove}
        disabled={isRemoving}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  );
}

function RitoItem(props: { link: ProjectRitoLink }) {
  const { link } = props;
  const unlink = useUnlinkProjectRito();
  return (
    <LinkedItem
      label={PROJECT_RITO_LABEL[link.ritoType]}
      projectName={link.projectName}
      detail={link.linkedByName && `por ${link.linkedByName}`}
      onRemove={() => unlink.mutate(link.id)}
      isRemoving={unlink.isPending}
    />
  );
}

function TranscriptItem(props: { meeting: ProjectTeamsMeeting }) {
  const { meeting } = props;
  const stop = useStopFollowingTeamsMeeting();
  return (
    <LinkedItem
      label="Transcrição"
      icon="transcript"
      projectName={meeting.projectName ?? 'Projeto'}
      detail={meeting.registeredByName && `por ${meeting.registeredByName}`}
      onRemove={() => stop.mutate(meeting.id)}
      isRemoving={stop.isPending}
    />
  );
}

function LinkedList(props: { icalUid: string }) {
  const { icalUid } = props;
  const ritos = useRitoLinks(icalUid);
  const transcripts = useEventTeamsMeetings(icalUid);

  if (ritos.isLoading || transcripts.isLoading) return <Skeleton className="h-6 w-48" />;
  if (!ritos.data?.length && !transcripts.data?.length) return null;

  return (
    <ul className="space-y-1.5">
      {ritos.data?.map((link) => <RitoItem key={link.id} link={link} />)}
      {transcripts.data?.map((meeting) => <TranscriptItem key={meeting.id} meeting={meeting} />)}
    </ul>
  );
}

/**
 * O que o vínculo vai fazer, dito antes de clicar. A transcrição do Teams só pode vir pela
 * conta de quem organizou a reunião (ADR-0052).
 */
function TranscriptHint(props: { event: CalendarEventDetail; ritoChoice: RitoChoice }) {
  const { event, ritoChoice } = props;
  if (!event.onlineMeetingUrl) return null;

  if (event.isOrganizer) {
    return (
      <p className="text-sm text-muted-foreground">
        A transcrição desta reunião do Teams vai chegar sozinha na aba Reuniões do projeto.
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Só quem organizou a reunião pode trazer a transcrição dela para o projeto.
      {ritoChoice === NOT_A_RITO && ' Escolha um rito para vincular mesmo assim.'}
    </p>
  );
}

function ProjectSelect(props: { value: string; onChange: (projectId: string) => void }) {
  const { value, onChange } = props;
  const projects = useRitoEligibleProjects();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="rito-project">Projeto</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="rito-project">
          <SelectValue
            placeholder={projects.isLoading ? 'Carregando...' : 'Escolha entre os seus projetos'}
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
  );
}

function RitoSelect(props: { value: RitoChoice; onChange: (choice: RitoChoice) => void }) {
  const { value, onChange } = props;
  return (
    <div className="space-y-1.5">
      <Label htmlFor="rito-type">Rito</Label>
      <Select value={value} onValueChange={(changed) => onChange(changed as RitoChoice)}>
        <SelectTrigger id="rito-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NOT_A_RITO}>Não é rito</SelectItem>
          {Object.entries(PROJECT_RITO_LABEL).map(([type, label]) => (
            <SelectItem key={type} value={type}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function isSeriesEvent(event: CalendarEventDetail): boolean {
  return Boolean(event.seriesMasterId) || event.eventType !== EVENT_TYPE.SINGLE;
}

interface LinkFormProps {
  event: CalendarEventDetail;
  onDone: () => void;
}

function LinkForm(props: LinkFormProps) {
  const { event, onDone } = props;
  const { can } = useAuth();
  const linkRito = useLinkProjectRito();
  const setUpTeams = useSetUpTeamsMeeting();
  const [projectId, setProjectId] = useState('');
  const [ritoChoice, setRitoChoice] = useState<RitoChoice>(NOT_A_RITO);

  const bringsTranscript =
    Boolean(event.onlineMeetingUrl) && event.isOrganizer && can('transcricao:solicitar');
  const isRito = ritoChoice !== NOT_A_RITO;
  const isSaving = linkRito.isPending || setUpTeams.isPending;

  // Cada mutação avisa a própria falha; um vínculo não depende do outro.
  const linkAsRito = (ritoType: ProjectRitoType) =>
    linkRito
      .mutateAsync({ projectId, ritoType, icalUid: event.icalUid, eventTitle: event.subject, isSeries: isSeriesEvent(event) })
      .catch(() => undefined);
  const bringTranscript = () =>
    setUpTeams
      .mutateAsync({
        joinUrl: event.onlineMeetingUrl as string,
        eventSubject: event.subject,
        icalUid: event.icalUid,
        recordAutomatically: false,
        projectId,
      })
      .catch(() => undefined);

  const submit = async () => {
    if (ritoChoice !== NOT_A_RITO) await linkAsRito(ritoChoice);
    if (bringsTranscript) await bringTranscript();
    onDone();
  };

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border p-3">
      <ProjectSelect value={projectId} onChange={setProjectId} />
      <RitoSelect value={ritoChoice} onChange={setRitoChoice} />
      <TranscriptHint event={event} ritoChoice={ritoChoice} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onDone} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={submit}
          disabled={!projectId || isSaving || !(isRito || bringsTranscript)}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Vincular
        </Button>
      </div>
    </div>
  );
}

/**
 * Vínculo do compromisso a um projeto: como rito (ADR-0011) ou como reunião avulsa do
 * projeto, que traz a transcrição do Teams (ADR-0052). Opcional por decisão de produto:
 * nada aqui bloqueia o uso da agenda. A identidade usada é o `iCalUId`.
 */
export function RitoLinkSection({ event }: { event: CalendarEventDetail }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Sem iCalUId não há como identificar a reunião entre agendas diferentes.
  if (!event.icalUid) return null;

  return (
    <div className="border-t border-border pt-3">
      <p className="ol-label text-muted-foreground mb-2">Projeto</p>

      <LinkedList icalUid={event.icalUid} />

      {isFormOpen ? (
        <LinkForm event={event} onDone={() => setIsFormOpen(false)} />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 px-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsFormOpen(true)}
        >
          <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Vincular a um projeto
        </Button>
      )}
    </div>
  );
}
