import { useEffect, useState } from 'react';
import { Sparkles, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { generateInstallmentDrafts, toISODate } from '@/lib/installmentStatus';
import { useGenerateInstallments } from '@/hooks/useProjects';

interface GenerateInstallmentsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithRelations;
  existingCount: number;
}

export function GenerateInstallmentsWizard({
  open,
  onOpenChange,
  project,
  existingCount,
}: GenerateInstallmentsWizardProps) {
  const generate = useGenerateInstallments();

  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(1);
  const [firstDue, setFirstDue] = useState('');
  const [leadDays, setLeadDays] = useState(7);

  // Semeia com os dados já cadastrados no projeto sempre que o modal abre.
  useEffect(() => {
    if (!open) return;
    setTotal(Number(project.total_value || 0));
    setCount(Math.max(1, project.installments_count || 1));
    setFirstDue(project.first_invoice_date || toISODate(new Date()));
    setLeadDays(project.nf_emission_lead_days ?? 7);
  }, [open, project]);

  const perInstallment = count > 0 ? total / count : 0;

  const handleConfirm = () => {
    const drafts = generateInstallmentDrafts({ totalValue: total, count, firstDueDate: firstDue });
    generate.mutate(
      {
        projectId: project.id,
        leadDays,
        drafts: drafts.map((d) => ({ dueDate: d.dueDate, value: d.value })),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-deep" />
            Gerar parcelas automaticamente
          </DialogTitle>
          <DialogDescription>
            A partir do valor do contrato, do número de parcelas e do primeiro vencimento,
            sugerimos as parcelas mensais. Confirme e defina a antecedência do lembrete de emissão de NF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wiz-total">Valor do contrato</Label>
            <Input
              id="wiz-total"
              type="number"
              min={0}
              value={total}
              onChange={(e) => setTotal(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wiz-count">Nº de parcelas</Label>
            <Input
              id="wiz-count"
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wiz-first">1º vencimento</Label>
            <Input
              id="wiz-first"
              type="date"
              value={firstDue}
              onChange={(e) => setFirstDue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wiz-lead">Antecedência p/ emitir NF (dias)</Label>
            <Input
              id="wiz-lead"
              type="number"
              min={0}
              value={leadDays}
              onChange={(e) => setLeadDays(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-primary/10 px-3.5 py-2.5 text-xs text-primary-deep">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Serão criadas <b>{count}</b> parcelas de <b>{formatCurrency(perInstallment)}</b>, mensais a
            partir do 1º vencimento. Cada parcela gera um lembrete de emissão de NF <b>{leadDays} dias</b>{' '}
            antes do vencimento.
          </span>
        </div>

        {existingCount > 0 && (
          <p className="text-xs text-warning">
            Este projeto já tem {existingCount} parcela(s). As novas serão adicionadas às existentes.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generate.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={generate.isPending || !firstDue || total <= 0}>
            Confirmar e gerar parcelas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
