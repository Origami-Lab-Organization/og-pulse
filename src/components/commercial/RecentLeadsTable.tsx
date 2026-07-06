import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowRight, ChevronRight, Archive, Edit, ExternalLink, DollarSign, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { LeadWithBudget, CRM_LEAD_COLUMNS, CRMStage } from '@/types/lead';
import { ArchiveLeadDialog } from '@/components/crm/ArchiveLeadDialog';
import { useUpdateLeadStage } from '@/hooks/useLeads';

interface Props {
  leads: LeadWithBudget[];
}

type SortKey = 'name' | 'company_name' | 'crm_stage' | 'value' | 'created_at' | 'responsible';
type SortDir = 'asc' | 'desc';

const STAGE_ORDER: Record<string, number> = {
  screening: 0, qualification: 1, proposal: 2, negotiation: 3, closed: 4,
};

const NEXT_STAGE: Partial<Record<CRMStage, CRMStage>> = {
  screening: 'qualification',
  qualification: 'proposal',
  proposal: 'negotiation',
  negotiation: 'closed',
};

const NEXT_STAGE_LABEL: Partial<Record<CRMStage, string>> = {
  screening: 'Qualificação',
  qualification: 'Proposta',
  proposal: 'Negociação',
  negotiation: 'Negócio Fechado',
};

function getLeadValue(lead: LeadWithBudget): number {
  if (lead.budget?.final_total && lead.budget.final_total > 0) return lead.budget.final_total;
  return lead.estimated_value;
}

function isPreProposalStage(stage: string): boolean {
  return stage === 'screening' || stage === 'qualification';
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function RecentLeadsTable({ leads }: Props) {
  const navigate = useNavigate();
  const updateStage = useUpdateLeadStage();
  const [selectedLead, setSelectedLead] = useState<LeadWithBudget | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...leads];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'company_name':
          return dir * (a.company_name || '').localeCompare(b.company_name || '');
        case 'crm_stage':
          return dir * ((STAGE_ORDER[a.crm_stage] ?? 0) - (STAGE_ORDER[b.crm_stage] ?? 0));
        case 'value':
          return dir * (getLeadValue(a) - getLeadValue(b));
        case 'created_at':
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case 'responsible':
          return dir * (a.responsible?.nome || '').localeCompare(b.responsible?.nome || '');
        default:
          return 0;
      }
    });
    return arr;
  }, [leads, sortKey, sortDir]);

  const getStageBadge = (stage: string) => {
    const col = CRM_LEAD_COLUMNS.find(c => c.id === stage);
    return col ? (
      <Badge variant="outline" className={col.color}>{col.label}</Badge>
    ) : (
      <Badge variant="outline">{stage}</Badge>
    );
  };

  const handleAdvanceStage = () => {
    if (!selectedLead) return;
    const next = NEXT_STAGE[selectedLead.crm_stage as CRMStage];
    if (!next) return;
    updateStage.mutate({ id: selectedLead.id, stage: next }, {
      onSuccess: () => setSelectedLead(null),
    });
  };

  const SortableHead = ({ label, sortKeyName, className }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <TableHead className={className}>
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1 py-0.5 rounded text-xs"
        onClick={() => toggleSort(sortKeyName)}
      >
        {label}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
      </button>
    </TableHead>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Leads Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Nome" sortKeyName="name" />
                  <SortableHead label="Empresa" sortKeyName="company_name" />
                  <SortableHead label="Etapa" sortKeyName="crm_stage" />
                  <SortableHead label="Valor" sortKeyName="value" className="text-right" />
                  <SortableHead label="Responsável" sortKeyName="responsible" />
                  <SortableHead label="Criado em" sortKeyName="created_at" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(lead => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.company_name || '—'}</TableCell>
                    <TableCell>{getStageBadge(lead.crm_stage)}</TableCell>
                    <TableCell className="text-right">
                      {isPreProposalStage(lead.crm_stage) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground inline-flex items-center gap-1">
                              —
                              <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs">
                            Orçamento definido na etapa Proposta
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        formatCurrency(getLeadValue(lead))
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.responsible ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getInitials(lead.responsible.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[100px]">{lead.responsible.nome}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end">
            <Button
              variant="link"
              size="sm"
              className="text-primary gap-1 px-0"
              onClick={() => navigate('/pipeline')}
            >
              Ver todos os leads
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lead detail drawer */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
                <SheetDescription>
                  {selectedLead.company_name || 'Sem empresa definida'}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Stage */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Etapa</span>
                  {getStageBadge(selectedLead.crm_stage)}
                </div>

                {/* Value */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="font-medium">
                    {isPreProposalStage(selectedLead.crm_stage)
                      ? <span className="text-muted-foreground">Sem orçamento</span>
                      : formatCurrency(getLeadValue(selectedLead))
                    }
                  </span>
                </div>

                {/* Responsible */}
                {selectedLead.responsible && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Responsável</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {getInitials(selectedLead.responsible.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{selectedLead.responsible.nome}</span>
                    </div>
                  </div>
                )}

                {/* Contact */}
                {selectedLead.contact_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Contato</span>
                    <span className="text-sm">{selectedLead.contact_name}</span>
                  </div>
                )}

                {/* Created */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Criado em</span>
                  <span className="text-sm">{formatDate(selectedLead.created_at)}</span>
                </div>

                {/* Notes */}
                {selectedLead.notes && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Observações</span>
                    <p className="text-sm bg-muted/50 rounded-md p-3">{selectedLead.notes}</p>
                  </div>
                )}

                {/* Budget summary */}
                {selectedLead.budget && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <span className="text-sm font-medium">Orçamento</span>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Custo</p>
                          <p className="text-sm font-medium">{formatCurrency(selectedLead.budget.subtotal)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Venda</p>
                          <p className="text-sm font-medium">{formatCurrency(selectedLead.budget.total_with_fees)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Final</p>
                          <p className="text-sm font-medium text-primary">{formatCurrency(selectedLead.budget.final_total)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                  {selectedLead.crm_stage !== 'closed' && NEXT_STAGE[selectedLead.crm_stage as CRMStage] && (
                    <Button
                      className="w-full"
                      onClick={handleAdvanceStage}
                      disabled={updateStage.isPending}
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Avançar para {NEXT_STAGE_LABEL[selectedLead.crm_stage as CRMStage]}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedLead(null);
                      navigate('/pipeline');
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar no Pipeline
                  </Button>

                  {selectedLead.budget_id && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedLead(null);
                        navigate(`/budgets/${selectedLead.budget_id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Orçamento
                    </Button>
                  )}

                  {!selectedLead.archived && selectedLead.crm_stage !== 'closed' && (
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => setArchiveOpen(true)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Arquivar Lead
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {selectedLead && (
        <ArchiveLeadDialog
          open={archiveOpen}
          onOpenChange={(v) => {
            setArchiveOpen(v);
            if (!v) setSelectedLead(null);
          }}
          lead={selectedLead}
        />
      )}
    </TooltipProvider>
  );
}
