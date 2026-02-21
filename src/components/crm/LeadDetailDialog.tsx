import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Archive, Building2, User, Mail, Phone, Globe, FileText, DollarSign } from 'lucide-react';
import { LeadWithBudget, CRM_LEAD_COLUMNS } from '@/types/lead';
import { ArchiveLeadDialog } from './ArchiveLeadDialog';
import { LeadFormDialog } from './LeadFormDialog';
import { formatCurrency } from '@/lib/formatters';

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadWithBudget | null;
}

export function LeadDetailDialog({ open, onOpenChange, lead }: LeadDetailDialogProps) {
  const navigate = useNavigate();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (!lead) return null;

  const stageLabel = CRM_LEAD_COLUMNS.find((c) => c.id === lead.crm_stage)?.label ?? lead.crm_stage;

  const handleViewBudget = () => {
    if (lead.budget_id) {
      onOpenChange(false);
      navigate(`/budgets/${lead.budget_id}`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-lg">{lead.name}</DialogTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar Lead
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DialogDescription>Detalhes do lead</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {lead.company_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span>{lead.company_name}</span>
              </div>
            )}
            {lead.contact_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 flex-shrink-0" />
                <span>{lead.contact_name}</span>
              </div>
            )}
            {lead.contact_email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>{lead.contact_email}</span>
              </div>
            )}
            {lead.contact_phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{lead.contact_phone}</span>
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span>{lead.source}</span>
              </div>
            )}
            {lead.notes && (
              <div className="pt-1">
                <p className="text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Etapa:</span>
                <Badge variant="secondary">{stageLabel}</Badge>
              </div>

              {lead.budget && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="font-mono cursor-pointer hover:bg-accent"
                    onClick={handleViewBudget}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {lead.budget.budget_number}
                  </Badge>
                  {lead.budget.final_total != null && (
                    <span className="text-sm font-semibold text-primary flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(lead.budget.final_total)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button onClick={() => setEditOpen(true)}>Editar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArchiveLeadDialog
        open={archiveOpen}
        onOpenChange={(v) => {
          setArchiveOpen(v);
          if (!v) onOpenChange(false);
        }}
        lead={lead}
      />

      <LeadFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
      />
    </>
  );
}
