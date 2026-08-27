import { useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarClock, DollarSign, PauseCircle, Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SortableTableHead, SortDirection } from './SortableTableHead';
import { LeadTablePagination } from './LeadTablePagination';
import { LeadWithBudget, getStageColor, getStageLabel } from '@/types/lead';
import { LeadFollowUp, useAllPendingFollowUps } from '@/hooks/useLeadFollowUps';
import { getNextPendingFollowUp, isFollowUpOverdue } from '@/lib/followUps';
import { useResumeLeadFromStandBy } from '@/hooks/useLeads';
import { resolveStandByReturnStage } from '@/services/leadService';
import { resolveLeadEstimatedValue } from '@/lib/leadValue';
import { formatCurrency, formatShortDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

/**
 * Situação do retorno de uma oportunidade em Stand By. É o eixo desta visão: o
 * Stand By só não vira cemitério enquanto houver retorno agendado, então
 * "missing" e "overdue" são os estados que a tela precisa deixar evidentes.
 */
export type StandByReturnState = 'overdue' | 'scheduled' | 'missing';

export type StandByFilter = 'all' | StandByReturnState;

export const STAND_BY_FILTER_OPTIONS: { value: StandByFilter; label: string }[] = [
  { value: 'all', label: 'Todos os retornos' },
  { value: 'overdue', label: 'Retorno vencido' },
  { value: 'missing', label: 'Sem retorno agendado' },
  { value: 'scheduled', label: 'Retorno agendado' },
];

type StandBySortKey = 'name' | 'return' | 'since' | 'estimated_value';

export interface StandByStats {
  total: number;
  parkedValue: number;
  overdue: number;
  missingReturn: number;
}

/** Agrupa os follow-ups pendentes do tenant por oportunidade. */
function groupFollowUpsByLead(followUps: LeadFollowUp[]): Record<string, LeadFollowUp[]> {
  const map: Record<string, LeadFollowUp[]> = {};
  for (const followUp of followUps) {
    (map[followUp.lead_id] ??= []).push(followUp);
  }
  return map;
}

function getReturnState(followUps: LeadFollowUp[]): StandByReturnState {
  const next = getNextPendingFollowUp(followUps);
  if (!next) return 'missing';
  return isFollowUpOverdue(next) ? 'overdue' : 'scheduled';
}

function matchesSearch(lead: LeadWithBudget, term: string): boolean {
  const q = term.toLowerCase();
  return (
    lead.name.toLowerCase().includes(q) ||
    (lead.company_name || '').toLowerCase().includes(q) ||
    (lead.contact_name || '').toLowerCase().includes(q)
  );
}

/**
 * Carrega os retornos das oportunidades em Stand By e devolve a lista filtrada
 * mais os números do topo da visão.
 */
export function useStandByLeads(
  leads: LeadWithBudget[],
  searchTerm: string,
  filter: StandByFilter,
) {
  const { data: pendingFollowUps = [] } = useAllPendingFollowUps();

  const followUpsByLead = useMemo(
    () => groupFollowUpsByLead(pendingFollowUps),
    [pendingFollowUps],
  );

  const stats = useMemo<StandByStats>(() => {
    let overdue = 0;
    let missingReturn = 0;
    let parkedValue = 0;
    for (const lead of leads) {
      parkedValue += resolveLeadEstimatedValue(lead);
      const state = getReturnState(followUpsByLead[lead.id] || []);
      if (state === 'overdue') overdue += 1;
      if (state === 'missing') missingReturn += 1;
    }
    return { total: leads.length, parkedValue, overdue, missingReturn };
  }, [leads, followUpsByLead]);

  const filtered = useMemo(() => {
    let result = [...leads];
    if (filter !== 'all') {
      result = result.filter((l) => getReturnState(followUpsByLead[l.id] || []) === filter);
    }
    if (searchTerm.trim()) {
      result = result.filter((l) => matchesSearch(l, searchTerm));
    }
    return result;
  }, [leads, followUpsByLead, filter, searchTerm]);

  return { filtered, stats, followUpsByLead };
}

export function StandByStatsCards({ stats }: { stats: StandByStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full p-2 bg-muted">
            <PauseCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Em Stand By</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full p-2 bg-info-subtle">
            <DollarSign className="h-5 w-5 text-info-emphasis" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor Parado</p>
            <p className="text-lg font-semibold">{formatCurrency(stats.parkedValue)}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full p-2 bg-warning-subtle">
            <CalendarClock className="h-5 w-5 text-warning-emphasis" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Retorno Vencido</p>
            <p className="text-lg font-semibold">{stats.overdue}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full p-2 bg-destructive-subtle">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sem Retorno Agendado</p>
            <p className="text-lg font-semibold">{stats.missingReturn}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Célula de retorno: a informação que decide o que fazer com a oportunidade. */
function ReturnCell({ followUps }: { followUps: LeadFollowUp[] }) {
  const next = getNextPendingFollowUp(followUps);

  if (!next) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        Sem retorno agendado
      </span>
    );
  }

  const overdue = isFollowUpOverdue(next);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium',
        overdue ? 'text-destructive' : 'text-info-emphasis',
      )}
    >
      <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
      {overdue ? 'Vencido em' : 'Em'} {formatShortDate(next.scheduled_at)}
    </span>
  );
}

/** Ordem de urgência do retorno: sem data primeiro, depois da mais antiga. */
function returnSortValue(followUps: LeadFollowUp[]): number {
  const next = getNextPendingFollowUp(followUps);
  return next ? new Date(next.scheduled_at).getTime() : Number.NEGATIVE_INFINITY;
}

function sinceTime(lead: LeadWithBudget): number {
  return lead.stand_by_since ? new Date(lead.stand_by_since).getTime() : 0;
}

interface StandByTableProps {
  leads: LeadWithBudget[];
  followUpsByLead: Record<string, LeadFollowUp[]>;
  onSelectLead: (lead: LeadWithBudget) => void;
}

export function StandByTable({ leads, followUpsByLead, onSelectLead }: StandByTableProps) {
  // Padrão: o retorno mais urgente no topo — é o que a visão existe para cobrar.
  const [sortKey, setSortKey] = useState<StandBySortKey>('return');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const resumeFromStandBy = useResumeLeadFromStandBy();

  const handleSort = (key: StandBySortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'name' || key === 'return' ? 'asc' : 'desc');
  };

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...leads].sort((a, b) => {
      switch (sortKey) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'since': return dir * (sinceTime(a) - sinceTime(b));
        case 'estimated_value':
          return dir * (resolveLeadEstimatedValue(a) - resolveLeadEstimatedValue(b));
        default:
          return dir * (
            returnSortValue(followUpsByLead[a.id] || []) -
            returnSortValue(followUpsByLead[b.id] || [])
          );
      }
    });
  }, [leads, followUpsByLead, sortKey, sortDir]);

  // A página é fixada no render em vez de zerada por efeito: ao estreitar o
  // filtro, uma página fora de faixa mostraria a tabela vazia sem motivo.
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages - 1);

  const paginated = useMemo(
    () => sorted.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [sorted, safePage, pageSize],
  );

  const handleResume = (lead: LeadWithBudget) => {
    resumeFromStandBy.mutate({
      id: lead.id,
      targetStage: resolveStandByReturnStage(lead.stand_by_return_stage),
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead label="Nome" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <TableHead>Empresa</TableHead>
              <TableHead>Volta para</TableHead>
              <SortableTableHead label="Retorno" sortKey="return" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTableHead label="Parada desde" sortKey="since" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableTableHead label="Valor" sortKey="estimated_value" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma oportunidade em Stand By
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((lead) => {
                const returnStage = resolveStandByReturnStage(lead.stand_by_return_stage);
                return (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-accent/40 transition-colors"
                    onClick={() => onSelectLead(lead)}
                  >
                    <TableCell className="font-medium max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate">{lead.name}</span>
                        </TooltipTrigger>
                        <TooltipContent>{lead.name}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="max-w-[160px]">
                      <span className="block truncate">{lead.company_name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStageColor(returnStage)} variant="secondary">
                        {getStageLabel(returnStage)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <ReturnCell followUps={followUpsByLead[lead.id] || []} />
                    </TableCell>
                    <TableCell>{lead.stand_by_since ? formatShortDate(lead.stand_by_since) : '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(resolveLeadEstimatedValue(lead))}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => handleResume(lead)}
                            disabled={resumeFromStandBy.isPending}
                            aria-label={`Retomar ${lead.name} em ${getStageLabel(returnStage)}`}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Retomar em {getStageLabel(returnStage)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {sorted.length > 10 && (
        <LeadTablePagination
          currentPage={safePage}
          pageSize={pageSize}
          totalItems={sorted.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(0); }}
        />
      )}
    </div>
  );
}
