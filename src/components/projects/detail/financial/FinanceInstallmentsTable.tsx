import { useMemo, useState } from 'react';
import { Sparkles, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ProjectWithRelations, ProjectInstallmentDB, UpdateInstallmentInput } from '@/types/project';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import {
  useUpdateInstallment,
  useCreateInstallment,
  useDeleteInstallment,
} from '@/hooks/useProjects';
import { deriveInstallmentStatus, toISODate } from '@/lib/installmentStatus';
import { InstallmentRow, INSTALLMENTS_GRID } from './InstallmentRow';
import { GenerateInstallmentsWizard } from './GenerateInstallmentsWizard';

interface FinanceInstallmentsTableProps {
  project: ProjectWithRelations;
  canManage: boolean;
}

const COLUMN_LABELS = ['#', 'Valor', 'Vencimento', 'Status', 'Nota Fiscal', 'Recebimento', 'Ações'];

export function FinanceInstallmentsTable({ project, canManage }: FinanceInstallmentsTableProps) {
  const formatCurrency = useMaskedCurrency();
  const today = useMemo(() => new Date(), []);
  const isPlanning = project.portfolio_stage === 'planning';

  const installments = useMemo(
    () => [...(project.installments || [])].sort((a, b) => a.installment_number - b.installment_number),
    [project.installments],
  );

  const updateInstallment = useUpdateInstallment();
  const createInstallment = useCreateInstallment();
  const deleteInstallment = useDeleteInstallment();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProjectInstallmentDB | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newDue, setNewDue] = useState('');

  const totals = useMemo(() => {
    const contract = installments.reduce((s, i) => s + Number(i.value), 0);
    const received = installments
      .filter((i) => i.status === 'received')
      .reduce((s, i) => s + Number(i.value), 0);
    // "A emitir" = parcelas ainda sem NF (status pendente), independente de atraso.
    const toIssue = installments.filter((i) => i.status === 'pending');
    const toIssueValue = toIssue.reduce((s, i) => s + Number(i.value), 0);
    return { contract, received, toIssueValue, toIssueCount: toIssue.length };
  }, [installments]);

  const overdue = useMemo(
    () => installments.filter((i) => deriveInstallmentStatus(i, today) === 'atrasado'),
    [installments, today],
  );

  const handleQuickAction = (inst: ProjectInstallmentDB) => {
    const view = deriveInstallmentStatus(inst, today);
    const updates: UpdateInstallmentInput =
      view === 'pendente'
        ? { status: 'invoiced', invoiceDate: toISODate(today) }
        : { status: 'received', paymentDate: toISODate(today) };
    updateInstallment.mutate({ id: inst.id, projectId: project.id, updates });
  };

  const handleSave = (id: string, updates: UpdateInstallmentInput) => {
    updateInstallment.mutate(
      { id, projectId: project.id, updates },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleCreate = () => {
    if (!newValue || !newDue) return;
    createInstallment.mutate(
      { projectId: project.id, value: Number(newValue) || 0, dueDate: newDue },
      {
        onSuccess: () => {
          setShowNew(false);
          setNewValue('');
          setNewDue('');
        },
      },
    );
  };

  const saving = updateInstallment.isPending;

  return (
    <div className="rounded-xl border bg-card p-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="ui-label text-muted-foreground">Parcelas / Faturamento</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Gerencie a emissão de NF e registre os recebimentos do projeto
          </p>
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-2">
            {isPlanning && (
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => setWizardOpen(true)}>
                <Sparkles className="h-3.5 w-3.5 text-primary-deep" />
                Gerar automaticamente
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1 rounded-full bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
              onClick={() => setShowNew(true)}
              disabled={showNew}
            >
              <Plus className="h-4 w-4" />
              Nova parcela
            </Button>
          </div>
        )}
      </div>

      {/* Alerta de atraso — único vermelho da aba */}
      {overdue.length > 0 && (
        <div className="mt-3.5 flex items-center gap-2.5 rounded-[10px] border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-xs text-muted-foreground">
            <b className="text-destructive">
              {overdue.length === 1
                ? `Parcela ${overdue[0].installment_number} vencida`
                : `${overdue.length} parcelas vencidas`}{' '}
              sem recebimento.
            </b>{' '}
            Um alerta também é destacado na página inicial do projeto.
          </span>
        </div>
      )}

      {/* Cabeçalho das colunas */}
      <div className={cn(INSTALLMENTS_GRID, 'mt-3.5 border-b border-border pb-2 pt-3')}>
        {COLUMN_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn('ol-label text-[9px] text-muted-foreground', i === COLUMN_LABELS.length - 1 && 'text-right')}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Nova parcela (form inline) */}
      {showNew && (
        <div className={cn(INSTALLMENTS_GRID, 'border-b border-border/60 bg-primary/[0.04] py-3 text-sm')}>
          <div className="font-mono text-muted-foreground">—</div>
          <Input type="number" min={0} placeholder="Valor" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="h-8" />
          <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="h-8" />
          <div className="col-span-3 text-xs text-muted-foreground">Nova parcela — nasce como pendente.</div>
          <div className="flex justify-end gap-1.5">
            <Button size="sm" className="h-8 rounded-full" onClick={handleCreate} disabled={createInstallment.isPending || !newValue || !newDue}>
              Salvar
            </Button>
            <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setShowNew(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Linhas */}
      {installments.length === 0 && !showNew ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma parcela cadastrada{isPlanning && canManage ? ' — use "Gerar automaticamente" para começar.' : '.'}
        </div>
      ) : (
        installments.map((inst) => (
          <InstallmentRow
            key={inst.id}
            installment={inst}
            today={today}
            canManage={canManage}
            editing={editingId === inst.id}
            saving={saving}
            formatCurrency={formatCurrency}
            onEdit={() => setEditingId(inst.id)}
            onCancel={() => setEditingId(null)}
            onSave={(updates) => handleSave(inst.id, updates)}
            onDelete={() => setDeleting(inst)}
            onQuickAction={() => handleQuickAction(inst)}
          />
        ))
      )}

      {/* Rodapé de reconciliação */}
      <div className="flex flex-wrap justify-between gap-2 pt-3.5 text-xs">
        <span className="text-muted-foreground">
          Σ contrato <b className="font-mono text-foreground">{formatCurrency(totals.contract)}</b> · recebido{' '}
          <b className="font-mono text-primary-deep">{formatCurrency(totals.received)}</b>
        </span>
        <span className="text-muted-foreground">
          a emitir: <b className="font-mono text-foreground">{formatCurrency(totals.toIssueValue)}</b> ({totals.toIssueCount}{' '}
          {totals.toIssueCount === 1 ? 'parcela' : 'parcelas'})
        </span>
      </div>

      <GenerateInstallmentsWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        project={project}
        existingCount={installments.length}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parcela {deleting?.installment_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A parcela será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) deleteInstallment.mutate({ id: deleting.id, projectId: project.id });
                setDeleting(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
