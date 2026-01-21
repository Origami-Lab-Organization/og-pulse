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
  ProjectInstallmentDB,
  INSTALLMENT_STATUS_LABELS,
  InstallmentStatus,
} from '@/types/project';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useUpdateInstallment } from '@/hooks/useProjects';
import { Pencil, Check, X } from 'lucide-react';

interface ProjectInstallmentsTableProps {
  installments: ProjectInstallmentDB[];
  projectId: string;
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
}: ProjectInstallmentsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    status: InstallmentStatus;
    invoiceNumber: string;
    invoiceDate: string;
    paymentDate: string;
  }>({
    status: 'pending',
    invoiceNumber: '',
    invoiceDate: '',
    paymentDate: '',
  });

  const updateInstallment = useUpdateInstallment();

  const startEdit = (installment: ProjectInstallmentDB) => {
    setEditingId(installment.id);
    setEditData({
      status: installment.status,
      invoiceNumber: installment.invoice_number || '',
      invoiceDate: installment.invoice_date || '',
      paymentDate: installment.payment_date || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({
      status: 'pending',
      invoiceNumber: '',
      invoiceDate: '',
      paymentDate: '',
    });
  };

  const saveEdit = (id: string) => {
    updateInstallment.mutate(
      {
        id,
        projectId,
        updates: {
          status: editData.status,
          invoiceNumber: editData.invoiceNumber || undefined,
          invoiceDate: editData.invoiceDate || undefined,
          paymentDate: editData.paymentDate || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
        },
      }
    );
  };

  if (installments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma parcela cadastrada para este projeto.
      </div>
    );
  }

  return (
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
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((installment) => (
            <TableRow key={installment.id}>
              <TableCell className="font-medium">
                {installment.installment_number}
              </TableCell>
              <TableCell>{formatCurrency(Number(installment.value))}</TableCell>
              <TableCell>{formatDate(installment.due_date)}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
