import { useMemo } from 'react';
import { Clock, CalendarDays, Target, CheckSquare, Building2, User, Layers, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MyProjectDetail } from '@/hooks/useMyProjectDetail';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface MyProjectOverviewTabProps {
  project: MyProjectDetail;
  currentEmployeeId: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  progress: number;
  barColor: string;
  icon: React.ReactNode;
  hideBar?: boolean;
}

function KpiCard({ label, value, sub, progress, barColor, icon, hideBar }: KpiCardProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span className="text-muted-foreground/60">{icon}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <div className="space-y-1.5">
          {!hideBar && (
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', barColor)}
                style={{ width: `${clamped}%` }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MyProjectOverviewTab({ project, currentEmployeeId }: MyProjectOverviewTabProps) {
  // ── KPI calculations ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    // 1. Horas executadas
    const hoursProgress =
      project.totalHoursPlanned > 0
        ? (project.totalHoursActual / project.totalHoursPlanned) * 100
        : 0;

    // 2. Tempo decorrido — % do período total desde start_date até end_date
    // Projetos contínuos sem end_date não têm progresso temporal calculável
    const isContinuousNoEnd = project.isContinuous && !project.endDate;
    const today = new Date();
    const start = new Date(project.startDate + 'T00:00:00');
    let timeProgress = 0;
    if (!isContinuousNoEnd) {
      const end = project.endDate
        ? new Date(project.endDate + 'T00:00:00')
        : new Date(start.getTime() + project.durationMonths * 30.44 * 24 * 3600 * 1000);
      const totalMs = end.getTime() - start.getTime();
      const elapsedMs = today.getTime() - start.getTime();
      timeProgress = totalMs > 0 ? Math.max(0, (elapsedMs / totalMs) * 100) : 0;
    }

    // 3. Progresso OKRs — média de todos os key results
    const allKRs = project.okrs.flatMap((o) => o.keyResults);
    const okrProgress =
      allKRs.length > 0
        ? allKRs.reduce((sum, kr) => sum + kr.progress, 0) / allKRs.length
        : 0;

    // 4. Cronograma — fases concluídas / total
    const totalPhases = project.schedulePhases.length;
    const completedPhases = project.schedulePhases.filter((p) => p.status === 'completed').length;
    const scheduleProgress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

    // Meses ativos para projetos contínuos sem data fim
    const monthsActive = isContinuousNoEnd
      ? Math.max(
          0,
          (today.getFullYear() - start.getFullYear()) * 12 +
            (today.getMonth() - start.getMonth())
        )
      : 0;

    return { hoursProgress, timeProgress, isContinuousNoEnd, monthsActive, okrProgress, scheduleProgress, completedPhases, totalPhases, allKRs };
  }, [project]);

  // ── Meu membro na equipe ─────────────────────────────────────────────────
  const myMember = project.members.find((m) => m.employeeId === currentEmployeeId);

  // ── Dados formatados ─────────────────────────────────────────────────────
  const clientName = project.client.tradingName ?? project.client.companyName;
  const serviceLabel = project.serviceLine
    ? (SERVICE_LINE_LABELS[project.serviceLine] ?? project.serviceLine)
    : '—';
  const durationLabel = project.isContinuous
    ? 'Contínuo'
    : `${project.durationMonths} ${project.durationMonths === 1 ? 'mês' : 'meses'}`;
  const periodLabel = project.endDate
    ? `${formatDate(project.startDate)} → ${formatDate(project.endDate)}`
    : `A partir de ${formatDate(project.startDate)}`;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Horas Executadas"
          value={`${project.totalHoursActual}h`}
          sub={`${formatPercent(kpis.hoursProgress)} de ${project.totalHoursPlanned}h planejadas`}
          progress={kpis.hoursProgress}
          barColor={cn(
            'bg-primary',
            kpis.hoursProgress >= 100 && 'bg-destructive',
            kpis.hoursProgress >= 90 && kpis.hoursProgress < 100 && 'bg-amber-500'
          )}
          icon={<Clock className="h-4 w-4" />}
        />
        <KpiCard
          label="Tempo Decorrido"
          value={kpis.isContinuousNoEnd ? `${kpis.monthsActive}m` : formatPercent(Math.min(kpis.timeProgress, 100))}
          sub={kpis.isContinuousNoEnd ? 'Meses ativos' : `${formatDate(project.startDate)} → ${project.endDate ? formatDate(project.endDate) : 'em aberto'}`}
          progress={kpis.timeProgress}
          barColor="bg-violet-500"
          hideBar={kpis.isContinuousNoEnd}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <KpiCard
          label="Progresso OKRs"
          value={formatPercent(kpis.okrProgress)}
          sub={
            kpis.allKRs.length > 0
              ? `${kpis.allKRs.length} resultado${kpis.allKRs.length > 1 ? 's' : ''}-chave`
              : 'Sem resultados-chave'
          }
          progress={kpis.okrProgress}
          barColor="bg-green-500"
          icon={<Target className="h-4 w-4" />}
        />
        <KpiCard
          label="Cronograma"
          value={`${kpis.completedPhases}/${kpis.totalPhases}`}
          sub={
            kpis.totalPhases > 0
              ? `${formatPercent(kpis.scheduleProgress)} das fases concluídas`
              : 'Sem fases definidas'
          }
          progress={kpis.scheduleProgress}
          barColor="bg-amber-500"
          icon={<CheckSquare className="h-4 w-4" />}
        />
      </div>

      {/* ── Minha Participação — 4c ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Meu papel</p>
              <p className="font-medium">{project.myRole}</p>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground">Horas/mês</p>
              <p className="font-medium">{project.myHoursPerMonth}h</p>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground">Equipe</p>
              <p className="font-medium">{project.members.length} membro{project.members.length !== 1 ? 's' : ''}</p>
            </div>
            {project.isContinuous && (
              <>
                <div className="h-8 w-px bg-border hidden sm:block" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="secondary" className="text-xs">Contínuo</Badge>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Info Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informações do Projeto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Informações do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: 'Cliente', value: clientName },
              { label: 'Gerente do Projeto', value: project.manager.nome || '—' },
              { label: 'Linha de Serviço', value: serviceLabel },
              { label: 'Duração', value: durationLabel },
              { label: 'Período', value: periodLabel },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <span className="text-sm text-muted-foreground shrink-0">{label}</span>
                <span className="text-sm font-medium text-right">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Minha Alocação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Minha Alocação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {myMember && (
              <div className="flex items-center gap-3 pb-2 border-b mb-1">
                <Avatar className="h-9 w-9 shrink-0">
                  {myMember.fotoUrl && <AvatarImage src={myMember.fotoUrl} alt={myMember.nome} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(myMember.nome)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none">{myMember.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{myMember.cargo}</p>
                </div>
              </div>
            )}
            {[
              { label: 'Meu Papel', value: myMember?.role ?? project.myRole },
              { label: 'Horas/Mês', value: `${myMember?.hoursPerMonth ?? project.myHoursPerMonth}h` },
              { label: 'Membros da Equipe', value: `${project.members.length} pessoa${project.members.length !== 1 ? 's' : ''}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center gap-4">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Equipe do Projeto ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Equipe do Projeto
            <span className="text-xs text-muted-foreground font-normal">
              ({project.members.length} membro{project.members.length !== 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum membro alocado neste projeto.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.members.map((member) => {
                const isCurrentUser = member.employeeId === currentEmployeeId;
                return (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      isCurrentUser
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-muted/30 border-transparent'
                    )}
                  >
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                      {member.fotoUrl && (
                        <AvatarImage src={member.fotoUrl} alt={member.nome} />
                      )}
                      <AvatarFallback
                        className={cn(
                          'text-xs',
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {getInitials(member.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate leading-none">
                          {member.nome.split(' ').slice(0, 2).join(' ')}
                        </p>
                        {isCurrentUser && (
                          <Badge className="text-[10px] px-1 py-0 bg-primary text-primary-foreground shrink-0 leading-tight">
                            Você
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.role}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{member.hoursPerMonth}h/mês</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
