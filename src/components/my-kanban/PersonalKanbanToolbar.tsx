import { Archive, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { BoardSummary, ProjectFilter, ProjectOption } from '@/types/personalKanban';

interface PersonalKanbanToolbarProps {
  summary: BoardSummary;
  filter: ProjectFilter;
  projectOptions: ProjectOption[];
  onFilterChange: (filter: ProjectFilter) => void;
  onArchived: () => void;
  onSettings: () => void;
}

const ALL = '__all__';
const NONE = '__none__';

function toSelectValue(filter: ProjectFilter): string {
  if (filter.kind === 'project') return filter.projectId;
  return filter.kind === 'none' ? NONE : ALL;
}

function fromSelectValue(value: string): ProjectFilter {
  if (value === ALL) return { kind: 'all' };
  if (value === NONE) return { kind: 'none' };
  return { kind: 'project', projectId: value };
}

function pendingLabel(summary: BoardSummary) {
  if (summary.pending === 0) return 'Nada pendente.';
  const plural = summary.pending === 1 ? '' : 's';
  return `${summary.pending} pendente${plural}${summary.overdue ? '' : ', nada atrasado'}`;
}

function SummaryChip(props: { count?: number; label: string; className: string }) {
  if (!props.count) return null;
  return <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', props.className)}>{props.count} {props.label}</span>;
}

function ProjectFilterSelect(props: Pick<PersonalKanbanToolbarProps, 'filter' | 'projectOptions' | 'onFilterChange'>) {
  if (props.projectOptions.length === 0) return null;
  return (
    <Select value={toSelectValue(props.filter)} onValueChange={(value) => props.onFilterChange(fromSelectValue(value))}>
      <SelectTrigger className="h-9 w-[220px]" aria-label="Filtrar por projeto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todos os projetos</SelectItem>
        <SelectItem value={NONE}>Sem projeto</SelectItem>
        <SelectSeparator />
        {props.projectOptions.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function PersonalKanbanToolbar(props: PersonalKanbanToolbarProps) {
  const { summary } = props;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <SummaryChip count={summary.overdue} label={summary.overdue === 1 ? 'atrasado' : 'atrasados'} className="bg-destructive-subtle text-destructive" />
        <SummaryChip count={summary.today} label="para hoje" className="bg-warning-subtle text-warning-emphasis" />
        <span className="text-xs text-muted-foreground">{pendingLabel(summary)}</span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ProjectFilterSelect filter={props.filter} projectOptions={props.projectOptions} onFilterChange={props.onFilterChange} />
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={props.onArchived}>
          <Archive className="h-4 w-4" />
          Arquivados
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={props.onSettings}>
          <Settings2 className="h-4 w-4" />
          Configurar
        </Button>
      </div>
    </div>
  );
}
