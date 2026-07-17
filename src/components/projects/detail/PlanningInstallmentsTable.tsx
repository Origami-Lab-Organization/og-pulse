import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ProjectInstallmentDB } from '@/types/project';
import { formatDate } from '@/lib/formatters';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/masks';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { useUpdateInstallment, useCreateInstallment, useDeleteInstallment } from '@/hooks/useProjects';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';

interface PlanningInstallmentsTableProps {
  installments: ProjectInstallmentDB[];
  projectId: string;
  canManageInstallments?: boolean;
}

export function PlanningInstallmentsTable({
  installments,
  projectId,
  canManageInstallments = false,
}: PlanningInstallmentsTableProps) {
  const formatCurrency = useMaskedCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInvoiceDate, setEditInvoiceDate] = useState('');

  const [showNewForm, setShowNewForm] = useState(false);
  const [newInstallment, setNewInstallment] = useState({
    valueDisplay: '',
    value: 0,
    dueDate: '',
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const updateInstallment = useUpdateInstallment();
  const createInstallment = useCreateInstallment();
  const deleteInstallment = useDeleteInstallment();

  const startEdit = (installment: ProjectInstallmentDB) => {
    setEditingId(installment.id);
    setEditInvoiceDate(installment.invoice_date || installment.due_date);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    updateInstallment.mutate(
      {
        id,
        projectId,
        updates: {
          invoiceDate: editInvoiceDate || undefined,
        },
      },
      {
        onSuccess: () => setEditingId(null),
      }
    );
  };

  const handleCreateInstallment = () => {
    if (!newInstallment.value || !newInstallment.dueDate) return;

    createInstallment.mutate(
      {
        projectId,
        value: newInstallment.value,
        dueDate: newInstallment.dueDate,
      },
      {
        onSuccess: () => {
          setShowNewForm(false);
          setNewInstallment({ valueDisplay: '', value: 0, dueDate: '' });
        },
      }
    );
  };

  const handleDeleteInstallment = () => {
    if (!deleteId) return;
    deleteInstallment.mutate(
      { id: deleteId, projectId },
      { onSuccess: () => setDeleteId(null) }
    );
  };

  if (installments.length === 0 && !canManageInstallments) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma parcela definida. Configure o plano de pagamento no projeto.
      </p>
    );
  }

  const totalValue = installments.reduce((sum, i) => sum + Number(i.value), 0);

  return (
    <div className="space-y-3">
      {canManageInstallments && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setShowNewForm(true)}
            disabled={showNewForm}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Parcela
          </Button>
        </div>
      )}

      {installments.length === 0 && !showNewForm ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma parcela cadastrada. Clique em "Nova Parcela" para adicionar.
        </p>
      ) : (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Parcela</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Emissão NF</TableHead>
              <TableHead>Vencimento NF</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showNewForm && (
              <TableRow>
                <TableCell className="text-muted-foreground text-sm">—</TableCell>
                <TableCell>
                  <Input
                    value={newInstallment.valueDisplay}
                    onChange={(e) => {
                      const formatted = formatCurrencyMask(e.target.value);
                      setNewInstallment({
                        ...newInstallment,
                        valueDisplay: formatted,
                        value: parseCurrency(formatted),
                      });
                    }}
                    placeholder="R$ 0,00"
                    className="w-[140px]"
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">—</TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={newInstallment.dueDate}
                    onChange={(e) =>
                      setNewInstallment({ ...newInstallment, dueDate: e.target.value })
                    }
                    className="w-[150px]"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCreateInstallment}
                      disabled={createInstallment.isPending || !newInstallment.value || !newInstallment.dueDate}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setShowNewForm(false);
                        setNewInstallment({ valueDisplay: '', value: 0, dueDate: '' });
                      }}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {installments.map((installment) => {
              const isEditing = editingId === installment.id;
              const displayInvoiceDate = installment.invoice_date || installment.due_date;
              const isInvoiceSuggested = !installment.invoice_date;

              return (
                <TableRow key={installment.id}>
                  <TableCell className="font-medium">
                    {installment.installment_number}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(installment.value))}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editInvoiceDate}
                        onChange={(e) => setEditInvoiceDate(e.target.value)}
                        className="w-[150px]"
                      />
                    ) : (
                      <span className={isInvoiceSuggested ? 'text-muted-foreground' : ''}>
                        {formatDate(displayInvoiceDate)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(installment.due_date)}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => saveEdit(installment.id)}
                          disabled={updateInstallment.isPending}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={updateInstallment.isPending}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(installment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canManageInstallments && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(installment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      )}
      <div className="flex items-center justify-between font-medium pt-1 px-2">
        <span>Total</span>
        <span>{formatCurrency(totalValue)}</span>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parcela?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A parcela será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInstallment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
