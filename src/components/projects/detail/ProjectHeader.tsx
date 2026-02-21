import { Building2, Calendar, User, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations } from '@/types/project';
import { PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectHeaderProps {
  project: ProjectWithRelations;
}

const stageColors: Record<PortfolioStage, string> = {
  planning: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  value_delivery: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  results_presentation: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  value_book: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  learning_case: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
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
      <Badge className={stageColors[(project.portfolio_stage || 'planning') as PortfolioStage]}>
        {PORTFOLIO_STAGE_LABELS[(project.portfolio_stage || 'planning') as PortfolioStage]}
      </Badge>
      {project.service_line && (
        <>
          <span className="hidden sm:inline text-muted-foreground/50">•</span>
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>{SERVICE_LINE_LABELS[project.service_line] || project.service_line}</span>
          </span>
        </>
      )}
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
