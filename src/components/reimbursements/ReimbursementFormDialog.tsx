import { useState, useEffect, useRef, useCallback, useMemo, DragEvent } from 'react';
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Upload, FileText, Plus, CalendarIcon, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateReimbursement } from '@/hooks/useReimbursements';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CorrectionData {
  correctedFromId: string;
  rejectedAt: string;
  rejectionReason: string;
  type: 'project' | 'internal';
  clientId: string;
  projectId: string;
  items: ExpenseItem[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correctionData?: CorrectionData | null;
}

interface ClientOption {
  id: string;
  company_name: string;
}

interface ProjectOption {
  id: string;
  name: string;
  client_id: string;
}

export interface ExpenseItem {
  date: Date | undefined;
  description: string;
  amount: number;
}

type FieldErrors = {
  clientId?: string;
  projectId?: string;
  items?: string;
  files?: string;
};

type ItemError = {
  date?: string;
  description?: string;
  amount?: string;
};

const DAYS_WARNING = 45;

function isOlderThanDays(date: Date, days: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return date < cutoff;
}

export function ReimbursementFormDialog({ open, onOpenChange, correctionData }: Props) {
  const { employee } = useAuth();
  const createMutation = useCreateReimbursement();

  const [type, setType] = useState<'project' | 'internal'>('project');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [items, setItems] = useState<ExpenseItem[]>([{ date: undefined, description: '', amount: 0 }]);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [itemErrors, setItemErrors] = useState<ItemError[]>([{}]);
  const [attempted, setAttempted] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const clientRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);

  // Prefill from correction data
  useEffect(() => {
    if (!open || !correctionData) return;
    setType(correctionData.type);
    setClientId(correctionData.clientId);
    setProjectId(correctionData.projectId);
    setItems(correctionData.items.length > 0 ? correctionData.items : [{ date: undefined, description: '', amount: 0 }]);
    setItemErrors(correctionData.items.map(() => ({})));
  }, [open, correctionData]);

  useEffect(() => {
    if (!open || !employee) return;

    const loadData = async () => {
      const isAdmin = employee.isAdmin;
      const isManager = employee.is_gerente;

      // Admins see all active projects and clients
      if (isAdmin) {
        const [{ data: projData }, { data: cliData }] = await Promise.all([
          supabase
            .from('projects')
            .select('id, name, client_id')
            .eq('tenant_id', employee.tenant_id)
            .in('status', ['active', 'planning'])
            .order('name'),
          supabase
            .from('clients')
            .select('id, company_name')
            .eq('tenant_id', employee.tenant_id)
            .eq('status', 'active')
            .order('company_name'),
        ]);
        setProjects(projData || []);
        setClients(cliData || []);
        return;
      }

      // Managers: projects they manage; Employees: projects they are members of
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id, name, client_id, manager_id')
        .eq('tenant_id', employee.tenant_id)
        .in('status', ['active', 'planning'])
        .order('name');

      let filtered: typeof allProjects = [];

      if (isManager) {
        // Managers see projects where they are the manager
        filtered = (allProjects || []).filter(p => p.manager_id === employee.id);
      } else {
        // Regular employees see only projects they are members of
        const { data: memberRows } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('employee_id', employee.id);
        const memberProjectIds = (memberRows || []).map(r => r.project_id);
        filtered = (allProjects || []).filter(p => memberProjectIds.includes(p.id));
      }

      setProjects((filtered || []).map(({ id, name, client_id }) => ({ id, name, client_id })));

      // Derive clients from filtered projects
      const clientIds = [...new Set((filtered || []).map(p => p.client_id).filter(Boolean))];
      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, company_name')
          .in('id', clientIds)
          .order('company_name');
        setClients(clientData || []);
      } else {
        setClients([]);
      }
    };

    loadData();
  }, [open, employee]);

  const filteredProjects = clientId
    ? projects.filter((p) => p.client_id === clientId)
    : projects;

  const totalAmount = useMemo(() => items.reduce((sum, it) => sum + (it.amount || 0), 0), [items]);

  const reset = () => {
    setType('project');
    setClientId('');
    setProjectId('');
    setItems([{ date: undefined, description: '', amount: 0 }]);
    setFiles([]);
    setErrors({});
    setItemErrors([{}]);
    setAttempted(false);
  };

  // File handling
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_FILES = 5;
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback((incoming: File[]) => {
    setFileError(null);
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      setFileError(`Máximo de ${MAX_FILES} arquivos atingido.`);
      return;
    }
    const toAdd: File[] = [];
    for (const f of incoming.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setFileError('Formato não aceito. Use JPG, PNG ou PDF.');
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        setFileError('O arquivo excede o limite de 5MB.');
        continue;
      }
      toAdd.push(f);
    }
    if (toAdd.length > 0) {
      const next = [...files, ...toAdd];
      setFiles(next);
      if (next.length > 0) setErrors((prev) => ({ ...prev, files: undefined }));
    }
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const filePreviews = useMemo(() => {
    return files.map((f) => {
      const isImage = f.type.startsWith('image/');
      return { name: f.name, size: f.size, isImage, url: isImage ? URL.createObjectURL(f) : null };
    });
  }, [files]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Items management
  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
    if (attempted) {
      setItemErrors(prev => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], [field]: undefined };
        }
        return next;
      });
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { date: undefined, description: '', amount: 0 }]);
    setItemErrors(prev => [...prev, {}]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
    setItemErrors(prev => prev.filter((_, i) => i !== index));
  };

  // Clear errors on field change
  useEffect(() => {
    if (!attempted) return;
    if (clientId) setErrors((p) => ({ ...p, clientId: undefined }));
  }, [clientId, attempted]);

  useEffect(() => {
    if (!attempted) return;
    if (projectId) setErrors((p) => ({ ...p, projectId: undefined }));
  }, [projectId, attempted]);

  const validate = useCallback((): { fieldErrors: FieldErrors; itemErrs: ItemError[] } => {
    const fieldErrors: FieldErrors = {};
    if (type === 'project') {
      if (!clientId) fieldErrors.clientId = 'Selecione um cliente';
      if (!projectId) fieldErrors.projectId = 'Selecione um projeto';
    }
    if (files.length === 0) fieldErrors.files = 'Anexe pelo menos 1 comprovante';

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const itemErrs: ItemError[] = items.map(it => {
      const e: ItemError = {};
      if (!it.date) {
        e.date = 'Informe a data';
      } else if (it.date > today) {
        e.date = 'A data não pode ser no futuro';
      }
      if (!it.description.trim()) e.description = 'Descreva a despesa';
      if (it.amount <= 0) e.amount = 'Valor deve ser maior que zero';
      return e;
    });

    const hasItemErrors = itemErrs.some(e => e.date || e.description || e.amount);
    if (hasItemErrors) fieldErrors.items = 'Corrija os erros nas despesas';

    return { fieldErrors, itemErrs };
  }, [type, clientId, projectId, files, items]);

  const handleSubmit = async () => {
    setAttempted(true);
    const { fieldErrors, itemErrs } = validate();
    setErrors(fieldErrors);
    setItemErrors(itemErrs);

    const errorKeys = Object.keys(fieldErrors) as (keyof FieldErrors)[];
    if (errorKeys.length > 0) {
      toast({
        title: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
        duration: 4000,
      });

      const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        clientId: clientRef,
        projectId: projectRef,
        items: itemsRef,
        files: filesRef,
      };
      const firstErr = errorKeys[0];
      refMap[firstErr]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Build combined description from items for backward compatibility
    const combinedDescription = items
      .map(it => `${format(it.date!, 'dd/MM/yyyy')} - ${it.description} (R$ ${it.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`)
      .join('\n');

    await createMutation.mutateAsync({
      project_id: type === 'project' ? projectId : undefined,
      client_id: type === 'project' ? clientId : undefined,
      is_internal: type === 'internal',
      description: combinedDescription,
      total_amount: totalAmount,
      files,
      items: items.map(it => ({
        expense_date: format(it.date!, 'yyyy-MM-dd'),
        description: it.description,
        amount: it.amount,
      })),
      corrected_from_id: correctionData?.correctedFromId,
    });
    reset();
    onOpenChange(false);
  };

  const errorText = 'text-[12px] text-destructive mt-1';

  const isDirty = type !== 'project' || clientId !== '' || projectId !== '' ||
    items.some(it => it.date || it.description.trim() || it.amount > 0) || files.length > 0;

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      reset();
      onOpenChange(false);
    }
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(false);
    reset();
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) { handleClose(); return; } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{correctionData ? 'Corrigir e Reenviar Reembolso' : 'Novo Pedido de Reembolso'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {correctionData && (
            <div className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Você está corrigindo o pedido rejeitado em{' '}
                <strong>{format(new Date(correctionData.rejectedAt), "dd/MM/yyyy", { locale: ptBR })}</strong>.
                {' '}Motivo da rejeição: <em>"{correctionData.rejectionReason}"</em>
              </span>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tipo de Despesa</Label>
            <RadioGroup value={type} onValueChange={(v) => { setType(v as any); setClientId(''); setProjectId(''); setErrors((p) => ({ ...p, clientId: undefined, projectId: undefined })); }}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="project" id="type-project" />
                  <Label htmlFor="type-project" className="font-normal">Projeto</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="internal" id="type-internal" />
                  <Label htmlFor="type-internal" className="font-normal">Despesa Interna</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {type === 'project' && (
            <>
              <div className="space-y-2" ref={clientRef}>
                <Label>Cliente *</Label>
                <Select value={clientId} onValueChange={(v) => { setClientId(v); setProjectId(''); }}>
                  <SelectTrigger className={cn(errors.clientId && 'border-destructive')}>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && <p className={errorText}>{errors.clientId}</p>}
              </div>

              <div className="space-y-2" ref={projectRef}>
                <Label>Projeto *</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={!clientId}>
                  <SelectTrigger className={cn(errors.projectId && 'border-destructive')}>
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectId && <p className={errorText}>{errors.projectId}</p>}
              </div>
            </>
          )}

          {/* Expense Items */}
          <div className="space-y-3" ref={itemsRef}>
            <div className="flex items-center justify-between">
              <Label>Despesas *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[140px_1fr_120px_28px] gap-2 items-end">
              <Label className="text-xs text-muted-foreground">Data *</Label>
              <Label className="text-xs text-muted-foreground">Descrição *</Label>
              <Label className="text-xs text-muted-foreground">Valor (R$) *</Label>
              <div />
            </div>

            {items.map((item, idx) => {
              const ie = itemErrors[idx] || {};
              const showOldWarning = item.date && !ie.date && isOlderThanDays(item.date, DAYS_WARNING);

              return (
                <div key={idx} className="space-y-1">
                  <div className="grid grid-cols-[140px_1fr_120px_28px] gap-2 items-start">
                    {/* Date */}
                    <div className="space-y-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9 text-sm",
                              !item.date && "text-muted-foreground",
                              ie.date && "border-destructive"
                            )}
                          >
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                            {item.date ? format(item.date, 'dd/MM/yyyy') : <span>dd/mm/aaaa</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={item.date}
                            onSelect={(d) => updateItem(idx, 'date', d)}
                            disabled={(date) => date > new Date()}
                            locale={ptBR}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      {ie.date && <p className={errorText}>{ie.date}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Descreva a despesa..."
                        className={cn("h-9 text-sm", ie.description && "border-destructive")}
                      />
                      {ie.description && <p className={errorText}>{ie.description}</p>}
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                      <div className={cn(ie.amount && '[&_input]:border-destructive')}>
                        <CurrencyInput
                          value={item.amount}
                          onValueChange={(v) => updateItem(idx, 'amount', v)}
                          showPrefix
                        />
                      </div>
                      {ie.amount && <p className={errorText}>{ie.amount}</p>}
                    </div>

                    {/* Remove button */}
                    <div className="flex items-center h-9">
                      {items.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeItem(idx)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      ) : <div className="w-7" />}
                    </div>
                  </div>

                  {showOldWarning && (
                    <div className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-2 text-xs text-yellow-800 dark:text-yellow-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Esta despesa tem mais de 45 dias. Verifique com seu gestor se ainda é elegível para reembolso.</span>
                    </div>
                  )}
                </div>
              );
            })}

            {items.length > 1 && (
              <div className="text-right text-sm font-medium">
                Total: {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            )}
          </div>

          {/* Files */}
          <div className="space-y-2" ref={filesRef}>
            <Label>Comprovantes *</Label>
            <TooltipProvider>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                errors.files && "border-destructive"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-2 py-6">
                {isDragging ? (
                  <>
                    <Upload className="h-8 w-8 text-primary" />
                    <p className="text-sm text-primary font-medium">Solte os arquivos aqui</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        Anexar arquivo
                        <Input
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      ou arraste e solte aqui<br />
                      JPG, PNG, PDF — máx. 5MB — até {MAX_FILES} arquivos
                    </p>
                  </>
                )}
              </div>
            </div>
            {errors.files && <p className={errorText}>{errors.files}</p>}
            {fileError && <p className={errorText}>{fileError}</p>}
            {filePreviews.length > 0 && (
              <ul className="space-y-2 mt-2">
                {filePreviews.map((fp, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-md border p-2 bg-muted/30">
                    {fp.isImage && fp.url ? (
                      <img src={fp.url} alt={fp.name} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm truncate">{fp.name}</p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">{fp.name}</TooltipContent>
                      </Tooltip>
                      <p className="text-[12px] text-muted-foreground">{formatFileSize(fp.size)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => removeFile(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            </TooltipProvider>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Enviando...' : 'Enviar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar pedido?</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem dados não salvos. Deseja realmente descartar este pedido de reembolso?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar ao formulário</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDiscard}
          >
            Descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
