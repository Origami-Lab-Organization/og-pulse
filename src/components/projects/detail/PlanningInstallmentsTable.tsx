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
import { ProjectInstallmentDB } from '@/types/project';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useUpdateInstallment } from '@/hooks/useProjects';
import { Pencil, Check, X } from 'lucide-react';

interface PlanningInstallmentsTableProps {
  installments: ProjectInstallmentDB[];
  projectId: string;
}

export function PlanningInstallmentsTable({
  installments,
  projectId,
}: PlanningInstallmentsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    invoiceDate: '',
    paymentDate: '',
  });

  const updateInstallment = useUpdateInstallment();

  const startEdit = (installment: ProjectInstallmentDB) => {
    setEditingId(installment.id);
    setEditData({
      invoiceDate: installment.invoice_date || installment.due_date,
      paymentDate: installment.payment_date || installment.due_date,
    });
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
          invoiceDate: editData.invoiceDate || undefined,
          paymentDate: editData.paymentDate || undefined,
        },
      },
      {
        onSuccess: () => setEditingId(null),
      }
    );
  };

  if (installments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma parcela definida. Configure o plano de pagamento no projeto.
      </p>
    );
  }

  const totalValue = installments.reduce((sum, i) => sum + Number(i.value), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Parcela</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Data Emissão NF</TableHead>
              <TableHead>Data Pagamento</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((installment) => {
              const isEditing = editingId === installment.id;
              const displayInvoiceDate = installment.invoice_date || installment.due_date;
              const displayPaymentDate = installment.payment_date || installment.due_date;
              const isInvoiceSuggested = !installment.invoice_date;
              const isPaymentSuggested = !installment.payment_date;

              return (
                <TableRow key={installment.id}>
                  <TableCell className="font-medium">
                    {installment.installment_number}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(installment.value))}</TableCell>
                  <TableCell>{formatDate(installment.due_date)}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.invoiceDate}
                        onChange={(e) =>
                          setEditData({ ...editData, invoiceDate: e.target.value })
                        }
                        className="w-[150px]"
                      />
                    ) : (
                      <span className={isInvoiceSuggested ? 'text-muted-foreground' : ''}>
                        {formatDate(displayInvoiceDate)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.paymentDate}
                        onChange={(e) =>
                          setEditData({ ...editData, paymentDate: e.target.value })
                        }
                        className="w-[150px]"
                      />
                    ) : (
                      <span className={isPaymentSuggested ? 'text-muted-foreground' : ''}>
                        {formatDate(displayPaymentDate)}
                      </span>
                    )}
                  </TableCell>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(installment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between font-medium pt-1 px-2">
        <span>Total</span>
        <span>{formatCurrency(totalValue)}</span>
      </div>
    </div>
  );
}
