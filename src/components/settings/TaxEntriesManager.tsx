import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Pencil, FileUp, ExternalLink, Receipt } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useTaxEntries, useCreateTaxEntry, useUpdateTaxEntry, useDeleteTaxEntry } from '@/hooks/useTaxEntries';
import { taxEntryService } from '@/services/taxEntryService';
import { useAuth } from '@/contexts/AuthContext';
import type { TaxEntryDB } from '@/types/taxEntry';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const formSchema = z.object({
  reference_month: z.string().min(1, 'Selecione o mês de referência'),
  payment_date: z.string().min(1, 'Informe a data de pagamento'),
  total_value: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TaxEntriesManager() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TaxEntryDB | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const { employee } = useAuth();
  const { data: entries = [], isLoading } = useTaxEntries(selectedYear);
  const createMutation = useCreateTaxEntry();
  const updateMutation = useUpdateTaxEntry();
  const deleteMutation = useDeleteTaxEntry();

  const defaultRefMonth = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reference_month: defaultRefMonth,
      payment_date: '',
      total_value: 0,
      description: '',
    },
  });

  // Build a map of 12 months for the selected year
  const monthsGrid = useMemo(() => {
    const entryMap = new Map(entries.map(e => [e.reference_month, e]));
    return MONTHS.map((label, idx) => {
      const monthDate = `${selectedYear}-${String(idx + 1).padStart(2, '0')}-01`;
      return {
        month: idx + 1,
        label,
        date: monthDate,
        entry: entryMap.get(monthDate) || null,
      };
    });
  }, [entries, selectedYear]);

  const handleOpenCreate = (monthDate?: string) => {
    setSelectedEntry(null);
    setFileToUpload(null);
    form.reset({
      reference_month: monthDate || defaultRefMonth,
      payment_date: '',
      total_value: 0,
      description: '',
    });
    setFormOpen(true);
  };

  const handleEdit = (entry: TaxEntryDB) => {
    setSelectedEntry(entry);
    setFileToUpload(null);
    form.reset({
      reference_month: entry.reference_month,
      payment_date: entry.payment_date,
      total_value: entry.total_value,
      description: entry.description || '',
    });
    setFormOpen(true);
  };

  const handleDelete = (entry: TaxEntryDB) => {
    setSelectedEntry(entry);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedEntry) {
      deleteMutation.mutate(selectedEntry.id, {
        onSuccess: () => {
          setDeleteOpen(false);
          setSelectedEntry(null);
        },
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    let fileUrl: string | undefined;

    if (fileToUpload && employee?.tenant_id) {
      setUploading(true);
      try {
        fileUrl = await taxEntryService.uploadFile(employee.tenant_id, fileToUpload);
      } catch {
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const payload = {
      reference_month: values.reference_month,
      payment_date: values.payment_date,
      total_value: values.total_value,
      description: values.description || undefined,
      file_url: fileUrl,
    };

    if (selectedEntry) {
      const { reference_month, ...updatePayload } = payload;
      updateMutation.mutate(
        { id: selectedEntry.id, input: updatePayload },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const totalLancado = entries.reduce((sum, e) => sum + Number(e.total_value), 0);
  const mesesLancados = entries.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Lançamentos de DAE — Simples Nacional</h3>
          <p className="text-sm text-muted-foreground">
            Registre o valor real dos impostos pagos por mês. A DAE paga no mês atual refere-se ao mês anterior.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova DAE
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Impostos Lançados ({selectedYear})
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLancado)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {mesesLancados} de 12 meses lançados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média Mensal
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mesesLancados > 0 ? formatCurrency(totalLancado / mesesLancados) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês de Referência</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead className="text-right">Valor DAE</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                monthsGrid.map(({ label, date, entry }) => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">{label}/{selectedYear}</TableCell>
                    <TableCell>
                      {entry ? format(new Date(entry.payment_date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry ? formatCurrency(entry.total_value) : '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {entry?.description || '—'}
                    </TableCell>
                    <TableCell>
                      {entry ? (
                        <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                          Lançado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry ? (
                        <div className="flex justify-end gap-1">
                          {entry.file_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(entry.file_url!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(entry)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenCreate(date)}>
                          <Plus className="mr-1 h-3 w-3" />
                          Lançar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? 'Editar DAE' : 'Registrar DAE'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reference_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês de Referência (Competência)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!selectedEntry}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {monthsGrid.map(({ label, date }) => (
                          <SelectItem key={date} value={date}>
                            {label}/{selectedYear}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total da DAE (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição / Observações</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Ex: DAS competência fevereiro/2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Arquivo da DAE (PDF)</FormLabel>
                <div className="mt-1">
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                  />
                </div>
                {selectedEntry?.file_url && !fileToUpload && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Arquivo atual mantido. Selecione um novo para substituir.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || uploading}
                >
                  {uploading ? 'Enviando arquivo...' : selectedEntry ? 'Salvar' : 'Registrar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento de DAE?</AlertDialogTitle>
            <AlertDialogDescription>
              O lançamento de imposto para este mês será removido. Os cálculos voltarão a usar a alíquota planejada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
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
