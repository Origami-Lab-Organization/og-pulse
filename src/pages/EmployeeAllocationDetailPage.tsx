import { useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Pencil, ChevronLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatHours } from '@/lib/formatters';
import { alteracoesLabel } from '@/lib/pluralize';
import { useAuth } from '@/contexts/AuthContext';
import { useAllocationGrid } from '@/hooks/useAllocationGrid';
import { useEmployeeAllocationPanel, useSaveEmployeeAllocationPanel, PlannedHoursChange } from '@/hooks/useEmployeeAllocationPanel';
import { AllocationFiltersState, AllocationPanelMonthData, AllocationPanelProjectRow } from '@/types/allocation';

const ALL_FILTERS: AllocationFiltersState = { status: 'all', role: 'all', projectId: 'all', search: '', showTerminated: true };

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface MatrixRow {
  key: string;
  label: string;
  subtitle: string;
  kind: 'project' | 'internal' | 'others';
  projectId: string | null;
}

export default function EmployeeAllocationDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { employee: currentUser } = useAuth();
  const tenantId = currentUser?.tenant_id;

  const offsetStart = Number(searchParams.get('offset') ?? -1);
  const periodLength = Number(searchParams.get('months') ?? 6);
  const baseDate = useMemo(() => new Date(), []);

  const { data: grid, isLoading } = useAllocationGrid({ tenantId, filters: ALL_FILTERS, offsetStart, periodLength, baseDate });

  const months = grid?.months ?? [];
  const person = useMemo(() => grid?.people.find((p) => p.id === employeeId) ?? null, [grid?.people, employeeId]);
  const projectOptions = grid?.projects ?? [];

  const panelQuery = useEmployeeAllocationPanel({ tenantId, employee: person, months, projectId: 'all', enabled: !!person });
  const saveMutation = useSaveEmployeeAllocationPanel({ tenantId, employeeId: person?.id });
  const panelData = panelQuery.data;

  const [draftHours, setDraftHours] = useState<Record<string, number>>({});
  const nowKey = currentMonthKey();

  const monthByKey = useMemo(
    () => new Map<string, AllocationPanelMonthData>((panelData?.months ?? []).map((md) => [md.month.key, md])),
    [panelData?.months],
  );

  // Permissão por recurso (ADR-0002): admin edita tudo; GP só onde é manager_id.
  const canEditProject = useMemo(() => {
    const managerByProject = new Map(projectOptions.map((p) => [p.id, p.managerId]));
    return (projectId: string) =>
      Boolean(currentUser?.isAdmin) || (currentUser?.id != null && managerByProject.get(projectId) === currentUser.id);
  }, [projectOptions, currentUser?.id, currentUser?.isAdmin]);
  const managerNameByProject = useMemo(
    () => new Map(projectOptions.map((p) => [p.id, p.managerName])),
    [projectOptions],
  );

  // Linhas da matriz: projetos (união entre meses) + Atividades internas + Outros projetos (anônimo).
  const rows: MatrixRow[] = useMemo(() => {
    const seen = new Map<string, MatrixRow>();
    (panelData?.months ?? []).forEach((md) =>
      md.projects.forEach((p) => {
        if (!seen.has(p.projectId)) {
          seen.set(p.projectId, {
            key: `proj-${p.projectId}`,
            label: p.projectName,
            subtitle: p.subtitle || p.clientName,
            kind: 'project',
            projectId: p.projectId,
          });
        }
      }),
    );
    const list = Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    list.push({ key: 'internal', label: 'Atividades internas', subtitle: 'não vinculadas a projeto', kind: 'internal', projectId: null });
    return list;
  }, [panelData?.months]);

  // Remainder anônimo de "outros projetos" por mês: carga total do tenant (grid, cross-projeto)
  // menos o que é nomeado (projetos próprios) e as internas. Nunca nomeia projetos de terceiros.
  const othersByMonth = useMemo(() => {
    const map = new Map<string, number>();
    months.forEach((m) => {
      const md = monthByKey.get(m.key);
      const named = (md?.projects ?? []).reduce((s, p) => s + Number(p.plannedHours || 0), 0);
      const internal = md?.internalHours ?? 0;
      const tenantWide = Number(person?.cells?.[m.key]?.plannedHours ?? 0);
      map.set(m.key, Math.max(0, Math.round(tenantWide - named - internal)));
    });
    return map;
  }, [months, monthByKey, person]);
  const hasOthers = Array.from(othersByMonth.values()).some((h) => h > 0);

  const findRow = (projectId: string, monthKey: string): AllocationPanelProjectRow | undefined =>
    monthByKey.get(monthKey)?.projects.find((p) => p.projectId === projectId);

  const isPastMonth = (monthKey: string) => monthKey < nowKey;
  const isFutureMonth = (monthKey: string) => monthKey > nowKey;

  const draftKey = (allocationId: string) => allocationId;
  const setDraft = (allocationId: string, hours: number) =>
    setDraftHours((cur) => ({ ...cur, [draftKey(allocationId)]: Math.max(0, Math.round(hours)) }));

  const changes: PlannedHoursChange[] = useMemo(() => {
    if (!tenantId) return [];
    const out: PlannedHoursChange[] = [];
    (panelData?.months ?? []).forEach((md) =>
      md.projects.forEach((p) => {
        if (!p.allocationId) return;
        const draft = draftHours[p.allocationId];
        if (draft !== undefined && draft !== p.plannedHours) {
          out.push({ tenantId, allocationId: p.allocationId, hours: draft });
        }
      }),
    );
    return out;
  }, [draftHours, panelData?.months, tenantId]);

  const totals = useMemo(
    () =>
      months.map((m) => {
        const md = monthByKey.get(m.key);
        const planned = (md?.projects ?? []).reduce((s, p) => {
          const draft = p.allocationId ? draftHours[p.allocationId] : undefined;
          return s + (draft ?? Number(p.plannedHours || 0));
        }, 0) + (othersByMonth.get(m.key) ?? 0);
        const actual = (md?.projects ?? []).reduce((s, p) => s + Number(p.actualHours || 0), 0) + (md?.internalHours ?? 0);
        const capacity = Number(person?.cells?.[m.key]?.capacityHours ?? 0);
        return { key: m.key, planned, actual, capacity };
      }),
    [months, monthByKey, draftHours, othersByMonth, person],
  );

  const handleSave = () => {
    if (changes.length > 0) saveMutation.mutate(changes, { onSuccess: () => setDraftHours({}) });
  };

  if (isLoading) {
    return (
      <AppLayout title="Alocação" breadcrumbs={[{ label: 'Alocações', href: '/analises/alocacoes' }, { label: 'Carregando...' }]}>
        <Skeleton className="h-64 w-full" />
      </AppLayout>
    );
  }

  if (!person) {
    return (
      <AppLayout title="Alocação" breadcrumbs={[{ label: 'Alocações', href: '/analises/alocacoes' }, { label: 'Não encontrado' }]}>
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-muted-foreground">Funcionário não encontrado no período selecionado.</p>
          <Button variant="outline" onClick={() => navigate('/analises/alocacoes')}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar para Alocações
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={person.name}
      breadcrumbs={[{ label: 'Alocações', href: '/analises/alocacoes' }, { label: person.name }]}
    >
      <TooltipProvider delayDuration={150}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{person.name}</h2>
            <p className="text-sm text-muted-foreground">
              {person.role} · jornada {formatHours(Number(person.dailyHours || 0))}/dia
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-[220px] border-b border-r bg-muted p-3 text-left">
                    <span className="ol-label text-muted-foreground">Projeto</span>
                  </th>
                  {months.map((m) => (
                    <th key={m.key} className="border-b border-r bg-muted p-2 text-left last:border-r-0">
                      <span className="block text-xs font-semibold uppercase text-foreground">{m.label}</span>
                      <span className="mt-0.5 block text-[10px] font-normal normal-case text-muted-foreground">
                        {isFutureMonth(m.key) ? 'planejado' : 'planejado / realizado'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="group">
                    <td className="sticky left-0 z-10 border-r border-t bg-card p-2 align-middle">
                      <p className="truncate text-sm font-medium text-foreground">{row.label}</p>
                      {row.subtitle && <p className="truncate text-[11px] text-muted-foreground">{row.subtitle}</p>}
                    </td>
                    {months.map((m) => {
                      const cellData = row.kind === 'project' && row.projectId ? findRow(row.projectId, m.key) : undefined;
                      const planned = cellData?.allocationId
                        ? draftHours[cellData.allocationId] ?? Number(cellData.plannedHours || 0)
                        : row.kind === 'internal'
                          ? Number(monthByKey.get(m.key)?.internalHours ?? 0)
                          : row.kind === 'others'
                            ? othersByMonth.get(m.key) ?? 0
                            : Number(cellData?.plannedHours ?? 0);
                      const actual = row.kind === 'internal'
                        ? Number(monthByKey.get(m.key)?.internalHours ?? 0)
                        : Number(cellData?.actualHours ?? 0);
                      const editable =
                        row.kind === 'project' &&
                        !!cellData?.allocationId &&
                        canEditProject(row.projectId as string) &&
                        !isPastMonth(m.key);
                      const lockReason =
                        row.kind !== 'project'
                          ? row.kind === 'internal'
                            ? 'Atividades internas não são editáveis aqui.'
                            : 'Horas em outros projetos (você não é gerente).'
                          : isPastMonth(m.key)
                            ? 'Mês fechado — edição apenas por admin.'
                            : cellData?.allocationId
                              ? `Você não é gerente deste projeto. Fale com ${managerNameByProject.get(row.projectId as string) ?? 'o gestor responsável'}.`
                              : 'Sem planejamento editável neste mês.';

                      return (
                        <td key={m.key} className="border-r border-t bg-card p-1.5 align-middle last:border-r-0">
                          {editable && cellData?.allocationId ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={String(planned)}
                                onChange={(e) => setDraft(cellData.allocationId as string, Number(e.target.value) || 0)}
                                className="h-8 w-16 text-center font-mono text-xs tabular-nums"
                              />
                              <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center justify-center gap-1.5 font-mono text-xs tabular-nums text-foreground">
                                  {isFutureMonth(m.key) ? (
                                    formatHours(planned)
                                  ) : (
                                    <>
                                      {formatHours(planned)}
                                      <span className="opacity-40">/</span>
                                      <span className="opacity-70">{formatHours(actual)}</span>
                                    </>
                                  )}
                                  <Lock className="h-2.5 w-2.5 text-muted-foreground" aria-label={lockReason} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">{lockReason}</TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {hasOthers && (
                  <tr>
                    <td className="sticky left-0 z-10 border-r border-t bg-card p-2 align-middle">
                      <p className="truncate text-sm font-medium text-muted-foreground">Outros projetos</p>
                      <p className="truncate text-[11px] text-muted-foreground">consolidado · sem detalhamento</p>
                    </td>
                    {months.map((m) => (
                      <td key={m.key} className="border-r border-t bg-card p-1.5 text-center align-middle last:border-r-0">
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatHours(othersByMonth.get(m.key) ?? 0)}
                        </span>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td className="sticky left-0 z-10 border-r bg-muted/40 p-2 text-xs font-semibold text-foreground">
                    Total do mês
                  </td>
                  {totals.map((t) => (
                    <td key={t.key} className="border-r bg-muted/40 p-2 text-center font-mono text-[11px] tabular-nums last:border-r-0">
                      <span className="text-foreground">{formatHours(t.planned)}</span>
                      <span className="opacity-40"> / </span>
                      <span className="opacity-70">{formatHours(t.actual)}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        cap. {formatHours(t.capacity)}
                      </span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          {changes.length > 0 && (
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-card/95 py-3 backdrop-blur">
              <Button variant="outline" onClick={() => setDraftHours({})} disabled={saveMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : `Salvar ${alteracoesLabel(changes.length)}`}
              </Button>
            </div>
          )}
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}
