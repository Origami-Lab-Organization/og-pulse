import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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

export function ReimbursementFormDialog({ open, onOpenChange }: Props) {
  const { employee } = useAuth();
  const createMutation = useCreateReimbursement();

  const [type, setType] = useState<'project' | 'internal'>('project');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit =
    description.trim().length > 0 &&
    amount > 0 &&
    files.length > 0 &&
    (type === 'internal' || (clientId && projectId));

  const handleSubmit = async () => {
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Reembolso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo de Despesa</Label>
            <RadioGroup value={type} onValueChange={(v) => { setType(v as any); setClientId(''); setProjectId(''); }}>
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
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={clientId} onValueChange={(v) => { setClientId(v); setProjectId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Projeto *</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={!clientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o motivo do reembolso..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Total (R$) *</Label>
            <CurrencyInput value={amount} onValueChange={setAmount} showPrefix />
          </div>

          <div className="space-y-2">
            <Label>Comprovantes * (mínimo 1 arquivo)</Label>
            <div className="flex items-center gap-2">
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
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
            {createMutation.isPending ? 'Enviando...' : 'Enviar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
