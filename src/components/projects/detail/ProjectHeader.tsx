import { Building2, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, PROJECT_STATUS_LABELS } from '@/types/project';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectHeaderProps {
  project: ProjectWithRelations;
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const startDate = parseISO(project.start_date);
  const endDate = project.end_date ? parseISO(project.end_date) : null;

  const clientName = project.client?.trading_name || project.client?.company_name || '-';
  const managerName = project.manager?.nome || '-';

  const formatPeriod = () => {
    const start = format(startDate, "MMM/yyyy", { locale: ptBR });
    if (project.is_continuous) {
      return `${start} - Contínuo`;
    }
    if (endDate) {
      const end = format(endDate, "MMM/yyyy", { locale: ptBR });
      return `${start} - ${end}`;
    }
    return start;
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <Badge className={statusColors[project.status]}>
        {PROJECT_STATUS_LABELS[project.status]}
      </Badge>
      <span className="hidden sm:inline text-muted-foreground/50">•</span>
      <span className="flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{clientName}</span>
      </span>
      <span className="hidden sm:inline text-muted-foreground/50">•</span>
      <span className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5" />
        <span>{managerName}</span>
      </span>
      <span className="hidden sm:inline text-muted-foreground/50">•</span>
      <span className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        <span>{formatPeriod()}</span>
      </span>
    </div>
  );
}
