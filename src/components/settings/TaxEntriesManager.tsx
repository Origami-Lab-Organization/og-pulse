import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Pencil, FileUp, ExternalLink, Receipt, ChevronDown } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  rbt12: z.coerce.number().min(0).optional(),
  rpa: z.coerce.number().min(0).optional(),
  aliquota_simples: z.coerce.number().min(0).max(100).optional(),
  irpj: z.coerce.number().min(0).optional(),
  csll: z.coerce.number().min(0).optional(),
  cofins: z.coerce.number().min(0).optional(),
  pis_pasep: z.coerce.number().min(0).optional(),
  inss_cpp: z.coerce.number().min(0).optional(),
  iss: z.coerce.number().min(0).optional(),
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
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const { employee } = useAuth();
  const { data: entries = [], isLoading } = useTaxEntries(selectedYear);
  const createMutation = useCreateTaxEntry();
  const updateMutation = useUpdateTaxEntry();
  const deleteMutation = useDeleteTaxEntry();

  // Fetch monthly faturado (invoiced) revenue for the selected year to compute effective rate
  const { data: monthlyRevenue = new Map<string, number>() } = useQuery({
    queryKey: ['monthly-faturado', employee?.tenant_id, selectedYear],
    queryFn: async () => {
      const startStr = `${selectedYear}-01-01`;
      const endStr = `${selectedYear}-12-31`;
      const { data } = await supabase
        .from('project_installments')
        .select('invoice_date, value')
        .in('status', ['invoiced', 'received'])
        .not('invoice_date', 'is', null)
        .gte('invoice_date', startStr)
        .lte('invoice_date', endStr);

      const map = new Map<string, number>();
      for (const row of (data || []) as any[]) {
        const monthKey = row.invoice_date?.substring(0, 7) + '-01';
        map.set(monthKey, (map.get(monthKey) ?? 0) + Number(row.value));
      }
      return map;
    },
    enabled: !!employee?.tenant_id,
  });

  const defaultRefMonth = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reference_month: defaultRefMonth,
      payment_date: '',
      total_value: 0,
      description: '',
      rbt12: 0,
      rpa: 0,
      aliquota_simples: 0,
      irpj: 0,
      csll: 0,
      cofins: 0,
      pis_pasep: 0,
      inss_cpp: 0,
      iss: 0,
    },
  });

  // Build a map of 12 months for the selected year
  const monthsGrid = useMemo(() => {
    const entryMap = new Map(entries.map(e => [e.reference_month, e]));
    return MONTHS.map((label, idx) => {
      const monthDate = `${selectedYear}-${String(idx + 1).padStart(2, '0')}-01`;
      const entry = entryMap.get(monthDate) || null;
      const revenue = monthlyRevenue.get(monthDate) ?? 0;
      // Prefer aliquota from extrato, fallback to computed
      const effectiveRate = entry && Number(entry.aliquota_simples) > 0
        ? Number(entry.aliquota_simples)
        : entry && revenue > 0
          ? (Number(entry.total_value) / revenue) * 100
          : null;
      return {
        month: idx + 1,
        label,
        date: monthDate,
        entry,
        revenue,
        effectiveRate,
      };
    });
  }, [entries, selectedYear, monthlyRevenue]);

  const handleOpenCreate = (monthDate?: string) => {
    setSelectedEntry(null);
    setFileToUpload(null);
    setBreakdownOpen(false);
    form.reset({
      reference_month: monthDate || defaultRefMonth,
      payment_date: '',
      total_value: 0,
      description: '',
      rbt12: 0, rpa: 0, aliquota_simples: 0,
      irpj: 0, csll: 0, cofins: 0, pis_pasep: 0, inss_cpp: 0, iss: 0,
    });
    setFormOpen(true);
  };

  const handleEdit = (entry: TaxEntryDB) => {
    setSelectedEntry(entry);
    setFileToUpload(null);
    const hasBreakdown = Number(entry.irpj) > 0 || Number(entry.csll) > 0 || Number(entry.cofins) > 0;
    setBreakdownOpen(hasBreakdown);
    form.reset({
      reference_month: entry.reference_month,
      payment_date: entry.payment_date,
      total_value: entry.total_value,
      description: entry.description || '',
      rbt12: Number(entry.rbt12) || 0,
      rpa: Number(entry.rpa) || 0,
      aliquota_simples: Number(entry.aliquota_simples) || 0,
      irpj: Number(entry.irpj) || 0,
      csll: Number(entry.csll) || 0,
      cofins: Number(entry.cofins) || 0,
      pis_pasep: Number(entry.pis_pasep) || 0,
      inss_cpp: Number(entry.inss_cpp) || 0,
      iss: Number(entry.iss) || 0,
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
      rbt12: values.rbt12 || 0,
      rpa: values.rpa || 0,
      aliquota_simples: values.aliquota_simples || 0,
      irpj: values.irpj || 0,
      csll: values.csll || 0,
      cofins: values.cofins || 0,
      pis_pasep: values.pis_pasep || 0,
      inss_cpp: values.inss_cpp || 0,
      iss: values.iss || 0,
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
          <h3 className="text-lg font-semibold">Extrato do Simples Nacional</h3>
          <p className="text-sm text-muted-foreground">
            Registre os valores do extrato do Simples Nacional. O imposto pago no mês é rateado pelo faturamento do mês anterior.
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
            Novo Extrato
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
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Valor DAS</TableHead>
                <TableHead className="text-right">Alíquota Efetiva</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                monthsGrid.map(({ label, date, entry, revenue, effectiveRate }) => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">{label}/{selectedYear}</TableCell>
                    <TableCell>
                      {entry ? format(new Date(entry.payment_date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {revenue > 0 ? formatCurrency(revenue) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry ? formatCurrency(entry.total_value) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {effectiveRate !== null ? (
                        <span className={effectiveRate > 13 ? 'text-destructive' : 'text-primary'}>
                          {formatPercent(effectiveRate)}
                        </span>
                      ) : '—'}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? 'Editar Extrato' : 'Registrar Extrato do Simples'}
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
                        {monthsGrid.map(({ label: mLabel, date }) => (
                          <SelectItem key={date} value={date}>
                            {mLabel}/{selectedYear}
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
                    <FormLabel>Valor Total do DAS</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        showPrefix
                        value={field.value || 0}
                        onValueChange={(val) => field.onChange(val)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dados do Extrato */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rbt12"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RBT12</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          showPrefix
                          value={field.value || 0}
                          onValueChange={(val) => field.onChange(val)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rpa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RPA (Receita do Período)</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          showPrefix
                          value={field.value || 0}
                          onValueChange={(val) => field.onChange(val)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="aliquota_simples"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alíquota Efetiva do Simples (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="Ex: 10.50"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Breakdown por tributo - colapsável */}
              <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" className="w-full justify-between text-sm text-muted-foreground">
                    Detalhamento por tributo
                    <ChevronDown className={`h-4 w-4 transition-transform ${breakdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="irpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">IRPJ</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              showPrefix
                              value={field.value || 0}
                              onValueChange={(val) => field.onChange(val)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="csll"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">CSLL</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              showPrefix
                              value={field.value || 0}
                              onValueChange={(val) => field.onChange(val)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cofins"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">COFINS</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              showPrefix
                              value={field.value || 0}
                              onValueChange={(val) => field.onChange(val)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pis_pasep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">PIS/Pasep</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              showPrefix
                              value={field.value || 0}
                              onValueChange={(val) => field.onChange(val)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inss_cpp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">INSS/CPP</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              showPrefix
                              value={field.value || 0}
                              onValueChange={(val) => field.onChange(val)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="iss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">ISS</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              showPrefix
                              value={field.value || 0}
                              onValueChange={(val) => field.onChange(val)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição / Observações</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Ex: Extrato competência fevereiro/2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Arquivo do Extrato (PDF)</FormLabel>
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
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O lançamento de imposto para este mês será removido. Os cálculos voltarão a usar a alíquota estimada.
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
