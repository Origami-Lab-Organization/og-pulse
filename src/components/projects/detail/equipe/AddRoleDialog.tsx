import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Briefcase, Laptop, ChevronRight } from 'lucide-react';
import { addMonths, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateProjectRole } from '@/hooks/useProjectRoles';
import { EmploymentType, PaymentType, CreateProjectRolePayload } from '@/types/equipe.types';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const cltSchema = z.object({
  roleName: z.string().min(2, 'Mínimo 2 caracteres'),
  employeeId: z.string().min(1, 'Selecione um funcionário'),
  hourlyRate: z.coerce
    .number({ invalid_type_error: 'Informe a taxa' })
    .positive('Deve ser maior que zero'),
  cltEncargosMultiplier: z.coerce.number().min(1.0, 'Mínimo 1.0').max(3.0, 'Máximo 3.0'),
});

const pjHourlySchema = z.object({
  roleName: z.string().min(2, 'Mínimo 2 caracteres'),
  isExternal: z.boolean(),
  employeeId: z.string().optional(),
  externalName: z.string().optional(),
  externalEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  hourlyRate: z.coerce.number().positive('Deve ser maior que zero'),
}).superRefine((data, ctx) => {
  if (!data.isExternal && !data.employeeId) {
    ctx.addIssue({ code: 'custom', message: 'Selecione um funcionário', path: ['employeeId'] });
  }
  if (data.isExternal && (!data.externalName || data.externalName.length < 2)) {
    ctx.addIssue({ code: 'custom', message: 'Nome obrigatório (mín. 2 caracteres)', path: ['externalName'] });
  }
});

const pjMonthlySchema = z.object({
  roleName: z.string().min(2, 'Mínimo 2 caracteres'),
  isExternal: z.boolean(),
  employeeId: z.string().optional(),
  externalName: z.string().optional(),
  externalEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  monthlyRate: z.coerce.number().positive('Deve ser maior que zero'),
}).superRefine((data, ctx) => {
  if (!data.isExternal && !data.employeeId) {
    ctx.addIssue({ code: 'custom', message: 'Selecione um funcionário', path: ['employeeId'] });
  }
  if (data.isExternal && (!data.externalName || data.externalName.length < 2)) {
    ctx.addIssue({ code: 'custom', message: 'Nome obrigatório (mín. 2 caracteres)', path: ['externalName'] });
  }
});

const freelancerHourlySchema = z.object({
  roleName: z.string().min(2, 'Mínimo 2 caracteres'),
  freelancerName: z.string().min(2, 'Nome obrigatório'),
  freelancerEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  hourlyRate: z.coerce.number().positive('Deve ser maior que zero'),
});

const freelancerDeliverySchema = z.object({
  roleName: z.string().min(2, 'Mínimo 2 caracteres'),
  freelancerName: z.string().min(2, 'Nome obrigatório'),
  freelancerEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  monthlyRate: z.coerce.number().positive('Valor da entrega obrigatório'),
  deliveryMonth: z.string().min(1, 'Selecione o mês'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2;

interface EmploymentCard {
  type: EmploymentType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const EMPLOYMENT_CARDS: EmploymentCard[] = [
  {
    type: 'CLT',
    label: 'CLT',
    description: 'Funcionário com carteira assinada',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    type: 'PJ',
    label: 'PJ',
    description: 'Prestador de serviços pessoa jurídica',
    icon: <Briefcase className="w-6 h-6" />,
  },
  {
    type: 'FREELANCER',
    label: 'Freelancer',
    description: 'Colaborador externo por projeto ou hora',
    icon: <Laptop className="w-6 h-6" />,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProjectMonths(startDate: string, endDate: string | null): { value: string; label: string }[] {
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : addMonths(start, 12);
  const months: { value: string; label: string }[] = [];
  let current = start;
  while (current <= end) {
    months.push({
      value: format(current, 'yyyy-MM'),
      label: format(current, 'MMM/yy', { locale: ptBR }),
    });
    current = addMonths(current, 1);
  }
  return months;
}

// ─── Sub-forms ────────────────────────────────────────────────────────────────

function CltForm({
  projectId,
  onSubmit,
  isPending,
}: {
  projectId: string;
  onSubmit: (p: CreateProjectRolePayload) => void;
  isPending: boolean;
}) {
  const { data: employees = [] } = useEmployees();
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<z.infer<typeof cltSchema>>({
    resolver: zodResolver(cltSchema),
    defaultValues: { cltEncargosMultiplier: 1.72 },
  });

  const rate = watch('hourlyRate') || 0;
  const multiplier = watch('cltEncargosMultiplier') || 1.72;
  const costPreview = Number(rate) * Number(multiplier);

  const submit = (data: z.infer<typeof cltSchema>) => {
    onSubmit({
      projectId,
      roleName: data.roleName,
      employmentType: 'CLT',
      paymentType: 'hourly',
      employeeId: data.employeeId,
      hourlyRate: data.hourlyRate,
      cltEncargosMultiplier: data.cltEncargosMultiplier,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Funcionário *</Label>
        <Select onValueChange={(v) => setValue('employeeId', v)}>
          <SelectTrigger className={errors.employeeId ? 'border-destructive' : ''}>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {employees.filter((e) => e.alocaEmProjetos).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome} — {e.cargo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Nome do papel *</Label>
        <Input placeholder="Ex: Tech Lead" {...register('roleName')} />
        {errors.roleName && <p className="text-xs text-destructive">{errors.roleName.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Taxa horária bruta (R$/h) *</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register('hourlyRate')} />
          {errors.hourlyRate && <p className="text-xs text-destructive">{errors.hourlyRate.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Multiplicador de encargos</Label>
          <Input type="number" step="0.01" {...register('cltEncargosMultiplier')} />
          {errors.cltEncargosMultiplier && (
            <p className="text-xs text-destructive">{errors.cltEncargosMultiplier.message}</p>
          )}
        </div>
      </div>

      {rate > 0 && (
        <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
          Custo real estimado:{' '}
          <span className="font-semibold text-foreground">{formatCurrency(costPreview)}/h</span>{' '}
          (incluindo encargos)
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PjForm({
  projectId,
  onSubmit,
  isPending,
}: {
  projectId: string;
  onSubmit: (p: CreateProjectRolePayload) => void;
  isPending: boolean;
}) {
  const { data: employees = [] } = useEmployees();
  const [paymentType, setPaymentType] = useState<'hourly' | 'monthly'>('hourly');
  const [isExternal, setIsExternal] = useState(false);

  const schema = paymentType === 'hourly' ? pjHourlySchema : pjMonthlySchema;
  const { register, handleSubmit, watch, formState: { errors }, setValue, reset } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: { isExternal: false },
  });

  const submit = (data: any) => {
    onSubmit({
      projectId,
      roleName: data.roleName,
      employmentType: 'PJ',
      paymentType,
      employeeId: !isExternal ? data.employeeId : undefined,
      freelancerName: isExternal ? data.externalName : undefined,
      freelancerEmail: isExternal ? data.externalEmail : undefined,
      hourlyRate: paymentType === 'hourly' ? data.hourlyRate : undefined,
      monthlyRate: paymentType === 'monthly' ? data.monthlyRate : undefined,
    });
  };

  const switchPayment = (type: 'hourly' | 'monthly') => {
    setPaymentType(type);
    reset({ isExternal });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* PJ badge */}
      <div className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700">
        Sem encargos trabalhistas (PJ)
      </div>

      {/* Employee OR external toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>{isExternal ? 'Pessoa externa' : 'Funcionário'}</Label>
          <button
            type="button"
            onClick={() => { setIsExternal(!isExternal); reset({ isExternal: !isExternal }); }}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            {isExternal ? 'Usar funcionário interno' : 'Pessoa externa'}
          </button>
        </div>
        {isExternal ? (
          <div className="space-y-2">
            <Input placeholder="Nome completo *" {...register('externalName')} />
            {errors.externalName && <p className="text-xs text-destructive">{(errors.externalName as any).message}</p>}
            <Input placeholder="E-mail (opcional)" type="email" {...register('externalEmail')} />
            {errors.externalEmail && <p className="text-xs text-destructive">{(errors.externalEmail as any).message}</p>}
          </div>
        ) : (
          <>
            <Select onValueChange={(v) => setValue('employeeId', v)}>
              <SelectTrigger className={errors.employeeId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {employees.filter((e) => e.alocaEmProjetos).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome} — {e.cargo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-xs text-destructive">{(errors.employeeId as any).message}</p>}
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Nome do papel *</Label>
        <Input placeholder="Ex: Desenvolvedor Sênior" {...register('roleName')} />
        {errors.roleName && <p className="text-xs text-destructive">{(errors.roleName as any).message}</p>}
      </div>

      {/* Payment type segmented control */}
      <div className="space-y-1.5">
        <Label>Forma de pagamento</Label>
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            onClick={() => switchPayment('hourly')}
            className={cn(
              'flex-1 py-2 text-sm transition-colors',
              paymentType === 'hourly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            Por hora
          </button>
          <button
            type="button"
            onClick={() => switchPayment('monthly')}
            className={cn(
              'flex-1 py-2 text-sm transition-colors border-l',
              paymentType === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            Valor mensal fixo
          </button>
        </div>
      </div>

      {paymentType === 'hourly' ? (
        <div className="space-y-1.5">
          <Label>Taxa horária (R$/h) *</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register('hourlyRate')} />
          {errors.hourlyRate && <p className="text-xs text-destructive">{(errors.hourlyRate as any).message}</p>}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Valor mensal (R$/mês) *</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register('monthlyRate')} />
          {errors.monthlyRate && <p className="text-xs text-destructive">{(errors.monthlyRate as any).message}</p>}
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FreelancerForm({
  projectId,
  projectStartDate,
  projectEndDate,
  onSubmit,
  isPending,
}: {
  projectId: string;
  projectStartDate: string;
  projectEndDate: string | null;
  onSubmit: (p: CreateProjectRolePayload) => void;
  isPending: boolean;
}) {
  const [paymentType, setPaymentType] = useState<'hourly' | 'delivery'>('hourly');
  const projectMonths = buildProjectMonths(projectStartDate, projectEndDate);

  const schema = paymentType === 'hourly' ? freelancerHourlySchema : freelancerDeliverySchema;
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<any>({
    resolver: zodResolver(schema),
  });

  const submit = (data: any) => {
    onSubmit({
      projectId,
      roleName: data.roleName,
      employmentType: 'FREELANCER',
      paymentType: paymentType === 'delivery' ? 'delivery' : 'hourly',
      freelancerName: data.freelancerName,
      freelancerEmail: data.freelancerEmail || undefined,
      hourlyRate: paymentType === 'hourly' ? data.hourlyRate : undefined,
      monthlyRate: paymentType === 'delivery' ? data.monthlyRate : undefined,
    });
  };

  const switchPayment = (type: 'hourly' | 'delivery') => {
    setPaymentType(type);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nome do freelancer *</Label>
          <Input placeholder="Nome completo" {...register('freelancerName')} />
          {errors.freelancerName && <p className="text-xs text-destructive">{(errors.freelancerName as any).message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>E-mail (opcional)</Label>
          <Input placeholder="email@exemplo.com" type="email" {...register('freelancerEmail')} />
          {errors.freelancerEmail && <p className="text-xs text-destructive">{(errors.freelancerEmail as any).message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Nome do papel *</Label>
        <Input placeholder="Ex: Designer UX" {...register('roleName')} />
        {errors.roleName && <p className="text-xs text-destructive">{(errors.roleName as any).message}</p>}
      </div>

      {/* Payment type segmented control */}
      <div className="space-y-1.5">
        <Label>Forma de pagamento</Label>
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            onClick={() => switchPayment('hourly')}
            className={cn(
              'flex-1 py-2 text-sm transition-colors',
              paymentType === 'hourly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            Por hora
          </button>
          <button
            type="button"
            onClick={() => switchPayment('delivery')}
            className={cn(
              'flex-1 py-2 text-sm transition-colors border-l',
              paymentType === 'delivery'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            Por entrega
          </button>
        </div>
      </div>

      {paymentType === 'hourly' ? (
        <div className="space-y-1.5">
          <Label>Taxa horária (R$/h) *</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register('hourlyRate')} />
          {errors.hourlyRate && <p className="text-xs text-destructive">{(errors.hourlyRate as any).message}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Valor da entrega (R$) *</Label>
            <Input type="number" step="0.01" placeholder="0,00" {...register('monthlyRate')} />
            {errors.monthlyRate && <p className="text-xs text-destructive">{(errors.monthlyRate as any).message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Mês de pagamento *</Label>
            <Select onValueChange={(v) => setValue('deliveryMonth', v)}>
              <SelectTrigger className={errors.deliveryMonth ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {projectMonths.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.deliveryMonth && <p className="text-xs text-destructive">{(errors.deliveryMonth as any).message}</p>}
          </div>
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

interface AddRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectStartDate: string;
  projectEndDate: string | null;
}

export function AddRoleDialog({
  open,
  onOpenChange,
  projectId,
  projectStartDate,
  projectEndDate,
}: AddRoleDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedType, setSelectedType] = useState<EmploymentType | null>(null);

  const handleClose = () => {
    onOpenChange(false);
    // reset after animation
    setTimeout(() => {
      setStep(1);
      setSelectedType(null);
    }, 200);
  };

  const createRole = useCreateProjectRole(projectId, handleClose);

  const handleSubmit = (payload: CreateProjectRolePayload) => {
    createRole.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Adicionar Papel — Tipo de Vínculo' : `Adicionar Papel — ${selectedType}`}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn('font-medium', step === 1 && 'text-foreground')}>1. Tipo de vínculo</span>
          <ChevronRight className="w-3 h-3" />
          <span className={cn('font-medium', step === 2 && 'text-foreground')}>2. Detalhes</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-3">
              {EMPLOYMENT_CARDS.map((card) => (
                <button
                  key={card.type}
                  type="button"
                  onClick={() => setSelectedType(card.type)}
                  className={cn(
                    'flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all',
                    selectedType === card.type
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    selectedType === card.type ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {card.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{card.label}</p>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedType}
              >
                Próximo
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && selectedType === 'CLT' && (
          <CltForm
            projectId={projectId}
            onSubmit={handleSubmit}
            isPending={createRole.isPending}
          />
        )}

        {step === 2 && selectedType === 'PJ' && (
          <PjForm
            projectId={projectId}
            onSubmit={handleSubmit}
            isPending={createRole.isPending}
          />
        )}

        {step === 2 && selectedType === 'FREELANCER' && (
          <FreelancerForm
            projectId={projectId}
            projectStartDate={projectStartDate}
            projectEndDate={projectEndDate}
            onSubmit={handleSubmit}
            isPending={createRole.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
