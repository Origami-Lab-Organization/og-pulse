import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  ProjectInstallmentDB,
  INSTALLMENT_STATUS_LABELS,
  InstallmentStatus,
} from '@/types/project';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/masks';
import { useUpdateInstallment, useCreateInstallment, useDeleteInstallment } from '@/hooks/useProjects';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';

interface ProjectInstallmentsTableProps {
  installments: ProjectInstallmentDB[];
  projectId: string;
  isManualInstallments?: boolean;
}

const statusColors: Record<InstallmentStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  invoiced: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function ProjectInstallmentsTable({
  installments,
  projectId,
  isManualInstallments = false,
}: ProjectInstallmentsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    status: InstallmentStatus;
    invoiceNumber: string;
    invoiceDate: string;
    paymentDate: string;
    value: number;
    valueDisplay: string;
    dueDate: string;
  }>({
    status: 'pending',
    invoiceNumber: '',
    invoiceDate: '',
    paymentDate: '',
    value: 0,
    valueDisplay: '',
    dueDate: '',
  });

  // New installment form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newInstallment, setNewInstallment] = useState({
    valueDisplay: '',
    value: 0,
    dueDate: '',
    notes: '',
  });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const updateInstallment = useUpdateInstallment();
  const createInstallment = useCreateInstallment();
  const deleteInstallment = useDeleteInstallment();

  const startEdit = (installment: ProjectInstallmentDB) => {
    setEditingId(installment.id);
    setEditData({
      status: installment.status,
      invoiceNumber: installment.invoice_number || '',
      invoiceDate: installment.invoice_date || '',
      paymentDate: installment.payment_date || '',
      value: Number(installment.value),
      valueDisplay: formatCurrencyMask(Number(installment.value)),
      dueDate: installment.due_date,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({
      status: 'pending',
      invoiceNumber: '',
      invoiceDate: '',
      paymentDate: '',
      value: 0,
      valueDisplay: '',
      dueDate: '',
    });
  };

  const saveEdit = (id: string) => {
    const updates: Record<string, unknown> = {
      status: editData.status,
      invoiceNumber: editData.invoiceNumber || undefined,
      invoiceDate: editData.invoiceDate || undefined,
      paymentDate: editData.paymentDate || undefined,
      value: editData.value,
    };

    // Include dueDate for manual installments
    if (isManualInstallments && editData.dueDate) {
      updates.dueDate = editData.dueDate;
    }

    updateInstallment.mutate(
      {
        id,
        projectId,
        updates: updates as any,
      },
      {
        onSuccess: () => {
          setEditingId(null);
        },
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
        notes: newInstallment.notes || undefined,
      },
      {
        onSuccess: () => {
          setShowNewForm(false);
          setNewInstallment({ valueDisplay: '', value: 0, dueDate: '', notes: '' });
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

  if (installments.length === 0 && !isManualInstallments) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma parcela cadastrada para este projeto.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isManualInstallments && (
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
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma parcela cadastrada. Clique em "Nova Parcela" para adicionar.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nº NF</TableHead>
                <TableHead>Data Emissão</TableHead>
                <TableHead>Data Pagamento</TableHead>
                {isManualInstallments && <TableHead>Descrição</TableHead>}
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* New installment inline form */}
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
                  <TableCell colSpan={3}>
                    <span className="text-sm text-muted-foreground">Pendente</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newInstallment.notes}
                      onChange={(e) =>
                        setNewInstallment({ ...newInstallment, notes: e.target.value })
                      }
                      placeholder="Descrição (opcional)"
                      className="w-full"
                    />
                  </TableCell>
                  {isManualInstallments && <TableCell />}
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
                          setNewInstallment({ valueDisplay: '', value: 0, dueDate: '', notes: '' });
                        }}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {installments.map((installment) => (
                <TableRow key={installment.id}>
                  <TableCell className="font-medium">
                    {installment.installment_number}
                  </TableCell>
                  <TableCell>
                    {editingId === installment.id ? (
                      <Input
                        value={editData.valueDisplay}
                        onChange={(e) => {
                          const formatted = formatCurrencyMask(e.target.value);
                          setEditData({
                            ...editData,
                            valueDisplay: formatted,
                            value: parseCurrency(formatted),
                          });
                        }}
                        placeholder="R$ 0,00"
                        className="w-[140px]"
                      />
                    ) : (
                      formatCurrency(Number(installment.value))
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === installment.id && isManualInstallments ? (
                      <Input
                        type="date"
                        value={editData.dueDate}
                        onChange={(e) =>
                          setEditData({ ...editData, dueDate: e.target.value })
                        }
                        className="w-[150px]"
                      />
                    ) : (
                      formatDate(installment.due_date)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === installment.id ? (
                      <Select
                        value={editData.status}
                        onValueChange={(value) =>
                          setEditData({ ...editData, status: value as InstallmentStatus })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(INSTALLMENT_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        className={statusColors[installment.status]}
                        variant="outline"
                      >
                        {INSTALLMENT_STATUS_LABELS[installment.status]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === installment.id ? (
                      <Input
                        value={editData.invoiceNumber}
                        onChange={(e) =>
                          setEditData({ ...editData, invoiceNumber: e.target.value })
                        }
                        placeholder="Nº NF"
                        className="w-[100px]"
                      />
                    ) : (
                      installment.invoice_number || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === installment.id ? (
                      <Input
                        type="date"
                        value={editData.invoiceDate}
                        onChange={(e) =>
                          setEditData({ ...editData, invoiceDate: e.target.value })
                        }
                        className="w-[140px]"
                      />
                    ) : (
                      formatDate(installment.invoice_date)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === installment.id ? (
                      <Input
                        type="date"
                        value={editData.paymentDate}
                        onChange={(e) =>
                          setEditData({ ...editData, paymentDate: e.target.value })
                        }
                        className="w-[140px]"
                      />
                    ) : (
                      formatDate(installment.payment_date)
                    )}
                  </TableCell>
                  {isManualInstallments && (
                    <TableCell className="text-sm text-muted-foreground">
                      {installment.notes || '-'}
                    </TableCell>
                  )}
                  <TableCell>
                    {editingId === installment.id ? (
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
                        {isManualInstallments && installment.status === 'pending' && (
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation dialog */}
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
