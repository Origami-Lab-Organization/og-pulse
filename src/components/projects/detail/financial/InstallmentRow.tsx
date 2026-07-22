import { useEffect, useState } from 'react';
import { Pencil, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { ProjectInstallmentDB, InstallmentStatus, UpdateInstallmentInput } from '@/types/project';
import {
  deriveInstallmentStatus,
  installmentQuickAction,
  installmentStatusMeta,
} from '@/lib/installmentStatus';
import { InstallmentQuickAction } from './InstallmentQuickAction';

export const INSTALLMENTS_GRID =
  'grid grid-cols-[28px_1.1fr_.95fr_.95fr_1.45fr_1.2fr_1.95fr] gap-2.5 items-center';

interface InstallmentRowProps {
  installment: ProjectInstallmentDB;
  today: Date;
  canManage: boolean;
  editing: boolean;
  saving: boolean;
  formatCurrency: (value: number) => string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: UpdateInstallmentInput) => void;
  onDelete: () => void;
  onQuickAction: () => void;
}

export function InstallmentRow({
  installment,
  today,
  canManage,
  editing,
  saving,
  formatCurrency,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onQuickAction,
}: InstallmentRowProps) {
  const view = deriveInstallmentStatus(installment, today);
  const meta = installmentStatusMeta(view);
  const quickAction = installmentQuickAction(view);

  const [value, setValue] = useState(String(installment.value));
  const [dueDate, setDueDate] = useState(installment.due_date);
  const [nf, setNf] = useState(installment.invoice_number ?? '');
  const [invoiceDate, setInvoiceDate] = useState(installment.invoice_date ?? '');
  const [paymentDate, setPaymentDate] = useState(installment.payment_date ?? '');

  useEffect(() => {
    if (!editing) return;
    setValue(String(installment.value));
    setDueDate(installment.due_date);
    setNf(installment.invoice_number ?? '');
    setInvoiceDate(installment.invoice_date ?? '');
    setPaymentDate(installment.payment_date ?? '');
  }, [editing, installment]);

  const handleSave = () => {
    // Mantém status coerente com o que o GP preencheu na edição.
    const status: InstallmentStatus = paymentDate
      ? 'received'
      : nf || invoiceDate
        ? 'invoiced'
        : 'pending';
    onSave({
      value: Number(value) || 0,
      dueDate,
      invoiceNumber: nf || undefined,
      invoiceDate: invoiceDate || undefined,
      paymentDate: paymentDate || undefined,
      status,
    });
  };

  if (editing) {
    return (
      <div className={cn(INSTALLMENTS_GRID, 'border-b border-border/60 bg-primary/[0.04] py-3 text-sm')}>
        <div className="font-mono text-muted-foreground">{installment.installment_number}</div>
        <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="h-8" />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8" />
        <div className="text-xs text-muted-foreground">—</div>
        <div className="flex flex-col gap-1">
          <Input placeholder="Nº NF" value={nf} onChange={(e) => setNf(e.target.value)} className="h-8" />
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-7 text-xs" />
        </div>
        <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-8" />
        <div className="flex justify-end gap-1.5">
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 rounded-full">
            Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={saving} className="h-8 rounded-full">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  const rowTone = view === 'atrasado' ? 'bg-destructive/[0.03]' : '';

  return (
    <div className={cn(INSTALLMENTS_GRID, 'border-b border-border/60 py-3 text-sm', rowTone)}>
      <div className="font-mono text-muted-foreground">{installment.installment_number}</div>
      <div className="font-mono font-semibold text-foreground">{formatCurrency(Number(installment.value))}</div>
      <div className="font-mono text-muted-foreground">{formatDate(installment.due_date)}</div>
      <div>
        <Badge variant="outline" className={cn('rounded-full border-transparent px-2.5 py-0.5 text-[11px] font-semibold', meta.badgeClassName)}>
          {meta.label}
        </Badge>
      </div>
      <div className="min-w-0">
        {installment.invoice_number ? (
          <>
            <div className="truncate font-mono text-xs text-foreground">{installment.invoice_number}</div>
            {installment.invoice_date && (
              <div className="text-[10.5px] text-muted-foreground">emissão {formatDate(installment.invoice_date)}</div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <div className="font-mono text-muted-foreground">
        {installment.payment_date ? formatDate(installment.payment_date) : <span className="text-muted-foreground">—</span>}
      </div>
      <div className="flex items-center justify-end gap-2">
        {view === 'recebido' ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-deep">
            <Check className="h-3.5 w-3.5" />
            Concluída
          </span>
        ) : (
          canManage && quickAction !== 'none' && (
            <InstallmentQuickAction kind={quickAction} onClick={onQuickAction} disabled={saving} />
          )
        )}
        {canManage && (
          <>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-lg"
              title="Editar parcela"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-lg"
              title="Excluir parcela"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
