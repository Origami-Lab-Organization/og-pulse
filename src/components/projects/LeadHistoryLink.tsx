import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Building2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LeadActivityTimeline } from '@/components/crm/LeadActivityTimeline';
import { supabase } from '@/integrations/supabase/client';

interface LeadSummary {
  id: string;
  name: string;
  company_name: string | null;
  created_at: string;
  crm_stage: string;
}

async function fetchLeadSummary(leadId: string): Promise<LeadSummary> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, company_name, created_at, crm_stage')
    .eq('id', leadId)
    .single();
  if (error) throw error;
  return data as LeadSummary;
}

const STAGE_LABELS: Record<string, string> = {
  screening: 'Triagem',
  qualification: 'Qualificação',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  closed: 'Negócio Fechado',
};

interface LeadHistoryLinkProps {
  leadId: string | null | undefined;
}

export function LeadHistoryLink({ leadId }: LeadHistoryLinkProps) {
  const [open, setOpen] = useState(false);

  const { data: lead } = useQuery({
    queryKey: ['lead-summary', leadId],
    queryFn: () => fetchLeadSummary(leadId!),
    enabled: !!leadId,
    staleTime: 60_000,
  });

  if (!leadId) {
    return (
      <p className="text-xs text-muted-foreground">Projeto criado sem lead vinculado.</p>
    );
  }

  return (
    <>
      <div
        className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start gap-3 min-w-0">
          <History className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {lead ? lead.name : 'Carregando...'}
            </p>
            {lead && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
                {lead.company_name && (
                  <>
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span>{lead.company_name}</span>
                    <span>·</span>
                  </>
                )}
                <span>Criado em {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                <span>·</span>
                <span className="text-primary font-medium">{STAGE_LABELS[lead.crm_stage] ?? lead.crm_stage}</span>
              </div>
            )}
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              Histórico Comercial — {lead?.name}
            </DialogTitle>
            {lead?.company_name && (
              <p className="text-sm text-muted-foreground">{lead.company_name}</p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 mt-2">
            {leadId && <LeadActivityTimeline leadId={leadId} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
