import { Building2, Calendar, User, Clock, Banknote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, PROJECT_STATUS_LABELS } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { differenceInMonths, parseISO, format } from 'date-fns';
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
  
  const durationMonths = endDate 
    ? differenceInMonths(endDate, startDate) + 1
    : null;

  const receivedValue = project.installments
    ?.filter((i) => i.status === 'received')
    .reduce((sum, i) => sum + Number(i.value), 0) || 0;

  const pendingValue = project.total_value - receivedValue;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={statusColors[project.status]}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium truncate">
                {project.client?.trading_name || project.client?.company_name || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Gerente</p>
              <p className="font-medium truncate">{project.manager?.nome || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duration Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Duração</p>
              <p className="font-medium">
                {project.is_continuous 
                  ? 'Contínuo' 
                  : durationMonths 
                    ? `${durationMonths} ${durationMonths === 1 ? 'mês' : 'meses'}`
                    : 'Indefinido'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Valor do Contrato</p>
              <p className="text-lg font-semibold">{formatCurrency(project.total_value)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Received Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Recebido</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(receivedValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Banknote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(pendingValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-medium text-sm">
                {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
                {endDate && ` - ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
