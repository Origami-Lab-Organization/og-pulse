import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateReimbursement } from '@/hooks/useReimbursements';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

type FieldErrors = {
  clientId?: string;
  projectId?: string;
  description?: string;
  amount?: string;
  files?: string;
};

export function ReimbursementFormDialog({ open, onOpenChange }: Props) {
  const { employee } = useAuth();
  const createMutation = useCreateReimbursement();

  const [type, setType] = useState<'project' | 'internal'>('project');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const clientRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !employee) return;
    supabase
      .from('clients')
      .select('id, company_name')
      .eq('tenant_id', employee.tenant_id)
      .eq('status', 'active')
      .order('company_name')
      .then(({ data }) => setClients(data || []));

    supabase
      .from('projects')
      .select('id, name, client_id')
      .eq('tenant_id', employee.tenant_id)
      .in('status', ['active', 'planning'])
      .order('name')
      .then(({ data }) => setProjects(data || []));
  }, [open, employee]);

  const filteredProjects = clientId
    ? projects.filter((p) => p.client_id === clientId)
    : projects;

  const reset = () => {
    setType('project');
    setClientId('');
    setProjectId('');
    setDescription('');
    setAmount(0);
    setFiles([]);
    setErrors({});
    setAttempted(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = [...files, ...Array.from(e.target.files!)];
      setFiles(newFiles);
      if (newFiles.length > 0) {
        setErrors((prev) => ({ ...prev, files: undefined }));
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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

  useEffect(() => {
    if (!attempted) return;
    if (description.trim()) setErrors((p) => ({ ...p, description: undefined }));
  }, [description, attempted]);

  useEffect(() => {
    if (!attempted) return;
    if (amount > 0) setErrors((p) => ({ ...p, amount: undefined }));
  }, [amount, attempted]);

  const validate = useCallback((): FieldErrors => {
    const errs: FieldErrors = {};
    if (type === 'project') {
      if (!clientId) errs.clientId = 'Selecione um cliente';
      if (!projectId) errs.projectId = 'Selecione um projeto';
    }
    if (!description.trim()) errs.description = 'Descreva o motivo do reembolso';
    if (amount <= 0) errs.amount = 'O valor deve ser maior que zero';
    if (files.length === 0) errs.files = 'Anexe pelo menos 1 comprovante';
    return errs;
  }, [type, clientId, projectId, description, amount, files]);

  const handleSubmit = async () => {
    setAttempted(true);
    const errs = validate();
    setErrors(errs);

    const errorKeys = Object.keys(errs) as (keyof FieldErrors)[];
    if (errorKeys.length > 0) {
      toast({
        title: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
        duration: 4000,
      });

      const refMap: Record<keyof FieldErrors, React.RefObject<HTMLDivElement | null>> = {
        clientId: clientRef,
        projectId: projectRef,
        description: descriptionRef,
        amount: amountRef,
        files: filesRef,
      };
      const firstErr = errorKeys[0];
      refMap[firstErr]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    await createMutation.mutateAsync({
      project_id: type === 'project' ? projectId : undefined,
      client_id: type === 'project' ? clientId : undefined,
      is_internal: type === 'internal',
      description,
      total_amount: amount,
      files,
    });
    reset();
    onOpenChange(false);
  };

  const errorText = 'text-[12px] text-destructive mt-1';

  const isDirty = type !== 'project' || clientId !== '' || projectId !== '' || description.trim() !== '' || amount > 0 || files.length > 0;

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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Reembolso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          <div className="space-y-2" ref={descriptionRef}>
            <Label>Descrição *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o motivo do reembolso..."
              rows={3}
              className={cn(errors.description && 'border-destructive')}
            />
            {errors.description && <p className={errorText}>{errors.description}</p>}
          </div>

          <div className="space-y-2" ref={amountRef}>
            <Label>Valor Total (R$) *</Label>
            <div className={cn(errors.amount && '[&_input]:border-destructive')}>
              <CurrencyInput value={amount} onValueChange={setAmount} showPrefix />
            </div>
            {errors.amount && <p className={errorText}>{errors.amount}</p>}
          </div>

          <div className="space-y-2" ref={filesRef}>
            <Label>Comprovantes * (mínimo 1 arquivo)</Label>
            <div className={cn("flex items-center gap-2", errors.files && '[&_button]:border-destructive')}>
              <Button type="button" variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Anexar arquivo
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </Button>
            </div>
            {errors.files && <p className={errorText}>{errors.files}</p>}
            {files.length > 0 && (
              <ul className="space-y-1 mt-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-xs whitespace-nowrap">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
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
