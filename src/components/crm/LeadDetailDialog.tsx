import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  MoreVertical,
  Archive,
  DollarSign,
  ExternalLink,
  Trash2,
  Loader2,
  ArrowRight,
  Pencil,
  AlertTriangle,
  FileText,
  Lock,
  Zap,
} from 'lucide-react'
import { LeadWithBudget, CRM_LEAD_COLUMNS, CRMStage } from '@/types/lead'
import { ArchiveLeadDialog } from './ArchiveLeadDialog'
import { DeleteLeadDialog } from './DeleteLeadDialog'
import { LeadActivityTimeline } from './LeadActivityTimeline'
import { LeadInteractionsTab } from './LeadInteractionsTab'
import { BudgetVersionHistory } from './BudgetVersionHistory'
import { useUpdateLead, useUpdateLeadStage } from '@/hooks/useLeads'
import { useApplyServiceTemplate } from '@/hooks/useBudgets'
import { useClients } from '@/hooks/useClients'
import { useEmployees } from '@/hooks/useEmployees'
import { useServices } from '@/hooks/useServices'
import { BILLING_TYPE_LABELS, BillingType } from '@/types/service'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/formatters'
import { formatPhone } from '@/lib/masks'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const schema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    service_line: z.string().optional(),
    responsible_id: z.string().optional(),
    client_type: z.enum(['existing', 'new']),
    client_id: z.string().optional(),
    company_name: z.string().optional(),
    contact_name: z.string().optional(),
    contact_email: z.string().optional(),
    contact_phone: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    estimated_value: z.coerce.number().min(0).optional(),
  })
  .refine(
    (data) =>
      data.client_type !== 'existing' ||
      (data.client_id && data.client_id.length > 0),
    { message: 'Selecione um cliente', path: ['client_id'] },
  )

type FormValues = z.infer<typeof schema>

interface LeadDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: LeadWithBudget | null
  onAdvanceToClose?: () => void
  initialEditMode?: boolean
  highlightField?: 'service_line' | 'budget_id' | null
}

const STAGE_ORDER: CRMStage[] = [
  'screening',
  'qualification',
  'proposal',
  'negotiation',
  'closed',
]

export function canAdvanceFrom(
  stage: CRMStage,
  lead: LeadWithBudget,
): { allowed: boolean; reason?: string } {
  if (stage === 'qualification') {
    if (!lead.service_line)
      return {
        allowed: false,
        reason: 'Defina o Tipo de Serviço para avançar para Proposta',
      }
  }
  if (stage === 'proposal') {
    if (!lead.budget_id)
      return {
        allowed: false,
        reason: 'Atribua um orçamento antes de avançar para Negociação',
      }
  }
  return { allowed: true }
}

export function LeadDetailDialog({
  open,
  onOpenChange,
  lead,
  onAdvanceToClose,
  initialEditMode,
  highlightField,
}: LeadDetailDialogProps) {
  const navigate = useNavigate()
  const { employee } = useAuth()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const companyInputRef = useRef<HTMLInputElement>(null)
  const serviceLineRef = useRef<HTMLDivElement>(null)
  const budgetAlertRef = useRef<HTMLDivElement>(null)
  const [fieldHighlight, setFieldHighlight] = useState<
    'service_line' | 'budget_id' | null
  >(null)
  const [activeTab, setActiveTab] = useState('qualificacao')
  const isAdmin = employee?.isAdmin
  const updateLead = useUpdateLead()
  const updateStage = useUpdateLeadStage()
  const applyServiceTemplate = useApplyServiceTemplate()
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: services = [] } = useServices()
  const BILLING_TYPES: BillingType[] = [
    'fixed_scope',
    'recurring',
    'success_fee',
    'no_revenue',
  ]
  const activeServices = services.filter((s) => s.isActive)
  const selectedService = services.find((s) => s.id === lead?.service_line)
  const isNoRevenue = selectedService?.billingType === 'no_revenue'
  const serviceHasTemplate = !!(selectedService?.templateBudgetId)
  const servicesByType = BILLING_TYPES.reduce(
    (acc, type) => {
      acc[type] = activeServices.filter((s) => s.billingType === type)
      return acc
    },
    {} as Record<BillingType, typeof services>,
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      service_line: '',
      responsible_id: '',
      client_type: 'new',
      client_id: '',
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      source: '',
      notes: '',
      estimated_value: undefined,
    },
  })

  useEffect(() => {
    if (!highlightField || !open) return
    setIsEditing(true)
    setActiveTab('qualificacao')
    setFieldHighlight(highlightField)
    const scrollTimer = setTimeout(() => {
      const ref =
        highlightField === 'service_line' ? serviceLineRef : budgetAlertRef
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    const clearTimer = setTimeout(() => setFieldHighlight(null), 3000)
    return () => {
      clearTimeout(scrollTimer)
      clearTimeout(clearTimer)
    }
  }, [highlightField, open])

  useEffect(() => {
    if (open && lead) {
      form.reset({
        name: lead.name || '',
        service_line: lead.service_line || '',
        responsible_id: lead.responsible_id || '',
        client_type: lead.client_id ? 'existing' : 'new',
        client_id: lead.client_id || '',
        company_name: lead.company_name || '',
        contact_name: lead.contact_name || '',
        contact_email: lead.contact_email || '',
        contact_phone: lead.contact_phone || '',
        source: lead.source || '',
        notes: lead.notes || '',
        estimated_value: lead.estimated_value || undefined,
      })
      setCompanySearch(lead.company_name || '')
      setIsEditing(initialEditMode ?? false)
      setActiveTab('qualificacao')
      setFieldHighlight(null)
    }
  }, [open, lead])

  const filteredClients =
    companySearch.trim().length > 0
      ? clients
          .filter((c) => {
            const name = (c.tradingName || c.companyName || '').toLowerCase()
            return name.includes(companySearch.toLowerCase())
          })
          .slice(0, 5)
      : []

  const handleCompanyInputChange = (value: string) => {
    setCompanySearch(value)
    form.setValue('company_name', value, { shouldDirty: true })
    form.setValue('client_type', 'new', { shouldDirty: true })
    form.setValue('client_id', '', { shouldDirty: true })
    const open = value.trim().length > 0
    setCompanyDropdownOpen(open)
    if (open && companyInputRef.current) {
      setDropdownRect(companyInputRef.current.getBoundingClientRect())
    }
  }

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      const name = client.tradingName || client.companyName
      setCompanySearch(name)
      form.setValue('company_name', name, { shouldDirty: true })
      form.setValue('client_id', clientId, { shouldDirty: true })
      form.setValue('client_type', 'existing', { shouldDirty: true })
    }
    setCompanyDropdownOpen(false)
  }

  const handleSave = () => {
    if (!lead) return
    const values = form.getValues()
    const payload: any = {
      id: lead.id,
      name: values.name,
      service_line: values.service_line || null,
      responsible_id: values.responsible_id || null,
      company_name: values.company_name || null,
      client_id: values.client_type === 'existing' ? values.client_id : null,
      contact_name: values.contact_name || null,
      contact_email: values.contact_email || null,
      contact_phone: values.contact_phone || null,
      source: values.source || null,
      notes: values.notes || null,
      estimated_value: isNoRevenue
        ? 0
        : (values.estimated_value ?? lead.estimated_value),
    }
    updateLead.mutate(payload, { onSuccess: () => setIsEditing(false) })
  }

  const handleDiscard = () => {
    form.reset()
    setIsEditing(false)
    onOpenChange(false)
  }

  const handleViewBudget = () => {
    if (lead?.budget_id) {
      onOpenChange(false)
      navigate(`/budgets/${lead.budget_id}`)
    }
  }

  const handleSheetChange = (newOpen: boolean) => {
    if (!newOpen && isEditing && form.formState.isDirty) {
      setConfirmCloseOpen(true)
      return
    }
    onOpenChange(newOpen)
  }

  if (!lead) return null

  const isArchived = lead.archived
  const isDisabled = isArchived || !isEditing
  const currentStageIndex = STAGE_ORDER.indexOf(lead.crm_stage)
  const nextStage =
    currentStageIndex < STAGE_ORDER.length - 1
      ? STAGE_ORDER[currentStageIndex + 1]
      : null
  const nextStageLabel = nextStage
    ? CRM_LEAD_COLUMNS.find((c) => c.id === nextStage)?.label
    : null

  const advanceGate =
    !isArchived && nextStage ? canAdvanceFrom(lead.crm_stage, lead) : null

  const handleAdvanceStage = () => {
    if (!nextStage || !advanceGate?.allowed) return
    if (nextStage === 'closed') {
      onAdvanceToClose?.()
      return
    }
    updateStage.mutate(
      { id: lead.id, stage: nextStage },
      {
        onSuccess: () => onOpenChange(false),
      },
    )
  }

  const companyDisplayName = lead.company_name || ''

  return (
    <>
      <Dialog open={open} onOpenChange={handleSheetChange}>
        <DialogContent className='max-w-[520px] p-0 flex flex-col h-[88vh] overflow-hidden gap-0'>
          {/* ── Header ── */}
          <DialogHeader className='px-5 pt-5 pb-4 space-y-1 pr-20'>
            <div className='flex items-center gap-2 min-w-0'>
              {isEditing ? (
                <Input
                  value={form.watch('name')}
                  onChange={(e) => form.setValue('name', e.target.value, { shouldDirty: true })}
                  className='text-lg font-semibold h-auto py-1 px-2 flex-1 min-w-0'
                  placeholder='Nome do lead'
                />
              ) : (
                <DialogTitle className='text-lg line-clamp-1'>
                  {lead.name}
                </DialogTitle>
              )}
              {isArchived && (
                <Badge
                  variant='secondary'
                  className='bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 shrink-0'
                >
                  Arquivado
                </Badge>
              )}
            </div>
            {companyDisplayName && (
              <p className='text-sm text-muted-foreground truncate'>
                {companyDisplayName}
              </p>
            )}
            {isArchived && (
              <p className='text-xs text-muted-foreground'>
                Arquivado em{' '}
                {lead.archived_at
                  ? new Date(lead.archived_at).toLocaleDateString('pt-BR')
                  : '-'}
                {lead.archive_reason ? ` — ${lead.archive_reason}` : ''}
              </p>
            )}
          </DialogHeader>

          {/* ── Actions (next to X button) ── */}
          <div className='absolute right-10 top-3'>
            {!isArchived ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-8 w-8'>
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='bg-popover'>
                  {!isEditing && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className='h-4 w-4 mr-2' />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)}
                      className='text-destructive focus:text-destructive'
                    >
                      <Trash2 className='h-4 w-4 mr-2' />
                      Excluir Lead
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isAdmin ? (
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-destructive hover:text-destructive'
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            ) : null}
          </div>

          <Separator />

          {/* ── Body (tabs) ── */}
          <Form {...form}>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='flex flex-col flex-1 min-h-0'
            >
              <div className='px-5 pt-3 pb-0 shrink-0'>
                <TabsList className='w-full'>
                  <TabsTrigger value='qualificacao' className='flex-1'>
                    Qualificação
                  </TabsTrigger>
                  <TabsTrigger value='contato' className='flex-1'>
                    Contato
                  </TabsTrigger>
                  <TabsTrigger value='followups' className='flex-1'>
                    Follow-ups
                  </TabsTrigger>
                  <TabsTrigger value='historico' className='flex-1'>
                    Histórico
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className='flex-1 min-h-0'>
                <TabsContent
                  value='qualificacao'
                  className='px-5 py-4 space-y-4 mt-0'
                >
                  <div className='space-y-3'>
                    {lead.crm_stage !== 'screening' &&
                      (() => {
                        // Editable: qualification (all users) or any stage for admins
                        const canEdit =
                          lead.crm_stage === 'qualification' || isAdmin

                        return (
                          <div
                            ref={serviceLineRef}
                            className={cn(
                              'rounded-md transition-all',
                              fieldHighlight === 'service_line' &&
                                'ring-2 ring-amber-500 animate-pulse p-1',
                            )}
                          >
                            <p className='text-xs font-medium mb-1.5'>
                              Tipo de Serviço
                            </p>
                            {canEdit ? (
                              <Select
                                value={lead.service_line || ''}
                                onValueChange={(value) =>
                                  updateLead.mutate({
                                    id: lead.id,
                                    service_line: value,
                                  })
                                }
                                disabled={isArchived}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder='Selecione o tipo de serviço' />
                                </SelectTrigger>
                                <SelectContent>
                                  {BILLING_TYPES.map(
                                    (type) =>
                                      servicesByType[type].length > 0 && (
                                        <SelectGroup key={type}>
                                          <SelectLabel>
                                            {BILLING_TYPE_LABELS[type]}
                                          </SelectLabel>
                                          {servicesByType[type].map((svc) => (
                                            <SelectItem
                                              key={svc.id}
                                              value={svc.id}
                                            >
                                              {svc.name}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      ),
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className='flex items-center gap-2 py-1.5'>
                                <Lock className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                                <span
                                  className={cn(
                                    'text-sm',
                                    !lead.service_line && 'text-destructive',
                                  )}
                                >
                                  {services.find(
                                    (s) => s.id === lead.service_line,
                                  )?.name || 'Não definido'}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                    {/* Template service preview: show when service has a cost template and no budget yet */}
                    {lead.crm_stage !== 'screening' &&
                      serviceHasTemplate &&
                      !lead.budget_id &&
                      selectedService && (
                        <div className='rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-1.5'>
                              <Zap className='h-3.5 w-3.5 text-primary' />
                              <p className='text-xs font-semibold text-primary'>Preço padrão disponível</p>
                            </div>
                            {selectedService.defaultValue != null && (
                              <span className='text-sm font-bold text-primary'>
                                {formatCurrency(selectedService.defaultValue)}
                              </span>
                            )}
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            O serviço <strong>{selectedService.name}</strong> tem uma composição de custos pré-definida. Aplique para preencher os dados financeiros automaticamente.
                          </p>
                          <Button
                            type='button'
                            size='sm'
                            className='w-full'
                            disabled={applyServiceTemplate.isPending || isArchived}
                            onClick={() => {
                              applyServiceTemplate.mutate({
                                templateBudgetId: selectedService.templateBudgetId!,
                                leadId: lead.id,
                                clientId: lead.client_id,
                                title: lead.name,
                              });
                            }}
                          >
                            {applyServiceTemplate.isPending ? (
                              <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                            ) : (
                              <Zap className='h-3.5 w-3.5 mr-1.5' />
                            )}
                            Aplicar preço padrão
                          </Button>
                        </div>
                      )}

                    <FormField
                      control={form.control}
                      name='responsible_id'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            disabled={isDisabled}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder='Selecione o responsável' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees
                                .filter((e) => e.status === 'ativo')
                                .map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.nome}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {/* Estimated value: only when no budget, not in proposal/negotiation/closed, and service generates revenue */}
                    {!lead.budget_id &&
                      !['proposal', 'negotiation', 'closed'].includes(
                        lead.crm_stage,
                      ) &&
                      !isNoRevenue && (
                        <FormField
                          control={form.control}
                          name='estimated_value'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Estimado</FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  min='0'
                                  step='0.01'
                                  placeholder='0,00'
                                  value={field.value ?? ''}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    )
                                  }
                                  disabled={isDisabled}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                    {/* Budget section: proposal / negotiation / closed, OR any stage when budget is already linked */}
                    {(lead.budget_id || ['proposal', 'negotiation', 'closed'].includes(
                      lead.crm_stage,
                    )) && (
                      <>
                        <Separator />
                        <div className='space-y-3' ref={budgetAlertRef}>
                          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5'>
                            <DollarSign className='h-3.5 w-3.5' />
                            Orçamento
                          </p>

                          {/* CTA: proposal with no budget */}
                          {!lead.budget_id && lead.crm_stage === 'proposal' && (
                            <div
                              className={cn(
                                'rounded-lg border border-dashed p-4 flex flex-col items-center gap-3 text-center',
                                fieldHighlight === 'budget_id' &&
                                  'border-amber-400 bg-amber-50 dark:bg-amber-950/20 animate-pulse',
                                fieldHighlight !== 'budget_id' &&
                                  'border-border bg-muted/30',
                              )}
                            >
                              <FileText className='h-8 w-8 text-muted-foreground/40' />
                              <div>
                                <p className='text-sm font-medium'>
                                  Nenhum orçamento vinculado
                                </p>
                                <p className='text-xs text-muted-foreground mt-0.5'>
                                  Crie um orçamento para definir o valor desta
                                  proposta
                                </p>
                              </div>
                              <Button
                                type='button'
                                size='sm'
                                onClick={() => {
                                  onOpenChange(false)
                                  navigate(`/budgets/new?leadId=${lead.id}`)
                                }}
                              >
                                <FileText className='h-3.5 w-3.5 mr-1.5' />
                                Criar Orçamento
                              </Button>
                            </div>
                          )}

                          {/* Summary card: has budget */}
                          {lead.budget && (
                            <div className='rounded-lg border bg-muted/20 p-3 space-y-3'>
                              {lead.budget.budget_number && (
                                <p className='text-xs font-mono font-medium text-muted-foreground'>
                                  {lead.budget.budget_number}
                                </p>
                              )}
                              <div className='grid grid-cols-2 gap-x-4 gap-y-2'>
                                <div className='space-y-0.5'>
                                  <p className='text-xs text-muted-foreground'>
                                    Subtotal
                                  </p>
                                  <p className='text-sm font-medium'>
                                    {formatCurrency(lead.budget.subtotal)}
                                  </p>
                                </div>
                                <div className='space-y-0.5'>
                                  <p className='text-xs text-muted-foreground'>
                                    Margem
                                  </p>
                                  <p className='text-sm font-medium'>
                                    {lead.budget.total_with_fees > 0
                                      ? `${(((lead.budget.total_with_fees - lead.budget.subtotal) / lead.budget.total_with_fees) * 100).toFixed(1)}%`
                                      : '0%'}
                                  </p>
                                </div>
                                {lead.budget.discount_value > 0 && (
                                  <div className='space-y-0.5'>
                                    <p className='text-xs text-muted-foreground'>
                                      Desconto
                                    </p>
                                    <p className='text-sm font-medium text-destructive'>
                                      -
                                      {formatCurrency(
                                        lead.budget.discount_value,
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className='rounded-md bg-primary/10 px-3 py-2.5 flex items-center justify-between'>
                                {lead.budget.monthly_value != null &&
                                lead.budget.final_total === 0 ? (
                                  // no_revenue continuous — show as cost
                                  <div>
                                    <p className='text-xs text-muted-foreground'>
                                      Custo Mensal
                                    </p>
                                    <p className='text-base font-bold'>
                                      {formatCurrency(
                                        lead.budget.monthly_value,
                                      )}
                                      /mês
                                    </p>
                                    <p className='text-xs text-muted-foreground mt-0.5'>
                                      Período: {lead.budget.duration_months}{' '}
                                      {lead.budget.duration_months === 1
                                        ? 'mês'
                                        : 'meses'}{' '}
                                      · Custo total:{' '}
                                      {formatCurrency(
                                        lead.budget.monthly_value *
                                          lead.budget.duration_months,
                                      )}
                                    </p>
                                  </div>
                                ) : lead.budget.monthly_value != null ? (
                                  // recurring revenue
                                  <div>
                                    <p className='text-xs text-muted-foreground'>
                                      Valor Mensal
                                    </p>
                                    <p className='text-base font-bold text-primary'>
                                      {formatCurrency(
                                        lead.budget.monthly_value,
                                      )}
                                      /mês
                                    </p>
                                    <p className='text-xs text-muted-foreground mt-0.5'>
                                      Contrato:{' '}
                                      {formatCurrency(lead.budget.final_total)}{' '}
                                      ({lead.budget.duration_months}{' '}
                                      {lead.budget.duration_months === 1
                                        ? 'mês'
                                        : 'meses'}
                                      )
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className='text-xs text-muted-foreground'>
                                      Valor Final
                                    </p>
                                    <p className='text-base font-bold text-primary'>
                                      {formatCurrency(lead.budget.final_total)}
                                    </p>
                                  </div>
                                )}
                                {lead.budget.monthly_value == null && (
                                  <p className='text-xs text-muted-foreground'>
                                    {lead.budget.duration_months}{' '}
                                    {lead.budget.duration_months === 1
                                      ? 'mês'
                                      : 'meses'}
                                  </p>
                                )}
                              </div>
                              <div className='flex gap-2'>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='flex-1'
                                  onClick={handleViewBudget}
                                >
                                  <ExternalLink className='h-3.5 w-3.5 mr-1.5' />
                                  Ver Orçamento
                                </Button>
                                {lead.crm_stage !== 'closed' && (
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    className='flex-1'
                                    onClick={() => {
                                      onOpenChange(false)
                                      navigate(
                                        `/budgets/${lead.budget_id}/edit`,
                                      )
                                    }}
                                  >
                                    <Pencil className='h-3.5 w-3.5 mr-1.5' />
                                    Editar
                                  </Button>
                                )}
                              </div>
                              {['negotiation', 'closed'].includes(
                                lead.crm_stage,
                              ) &&
                                lead.budget_id && (
                                  <>
                                    <Separator />
                                    <BudgetVersionHistory
                                      budgetId={lead.budget_id}
                                    />
                                  </>
                                )}
                            </div>
                          )}
                        </div>
                        <Separator />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name='notes'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder='Notas sobre o lead...'
                              {...field}
                              disabled={isDisabled}
                              rows={3}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent
                  value='contato'
                  className='px-5 py-4 space-y-3 mt-0'
                >
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Input
                      ref={companyInputRef}
                      placeholder='Digite ou selecione uma empresa'
                      value={companySearch}
                      onChange={(e) => handleCompanyInputChange(e.target.value)}
                      onFocus={() => {
                        if (companySearch.trim().length > 0) {
                          setCompanyDropdownOpen(true)
                          if (companyInputRef.current)
                            setDropdownRect(
                              companyInputRef.current.getBoundingClientRect(),
                            )
                        }
                      }}
                      onBlur={() =>
                        setTimeout(() => setCompanyDropdownOpen(false), 150)
                      }
                      disabled={isDisabled}
                    />
                    {companyDropdownOpen &&
                      filteredClients.length > 0 &&
                      !isDisabled &&
                      dropdownRect &&
                      createPortal(
                        <div
                          style={{
                            position: 'fixed',
                            top: dropdownRect.bottom + 4,
                            left: dropdownRect.left,
                            width: dropdownRect.width,
                            zIndex: 9999,
                          }}
                          className='bg-popover border rounded-md shadow-md'
                        >
                          {filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type='button'
                              className='w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground'
                              onMouseDown={() => handleClientSelect(client.id)}
                            >
                              {client.tradingName || client.companyName}
                            </button>
                          ))}
                        </div>,
                        document.body,
                      )}
                  </FormItem>

                  <FormField
                    control={form.control}
                    name='contact_name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do contato</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Nome'
                            {...field}
                            disabled={isDisabled}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <FormField
                      control={form.control}
                      name='contact_email'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='email@...'
                              {...field}
                              disabled={isDisabled}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='contact_phone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='(00) 00000-0000'
                              value={field.value || ''}
                              onChange={(e) =>
                                field.onChange(formatPhone(e.target.value))
                              }
                              disabled={isDisabled}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name='source'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origem</FormLabel>
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          disabled={isDisabled}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Selecione a origem' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='indicacao'>Indicação</SelectItem>
                            <SelectItem value='evento'>Evento</SelectItem>
                            <SelectItem value='parceiro'>Parceiro</SelectItem>
                            <SelectItem value='abordagem_direta'>
                              Abordagem Direta
                            </SelectItem>
                            <SelectItem value='expansao'>Expansão</SelectItem>
                            <SelectItem value='outro'>Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value='followups' className='px-5 py-4 mt-0'>
                  <LeadInteractionsTab
                    leadId={lead.id}
                    disabled={lead.crm_stage === 'closed' || isArchived}
                  />
                </TabsContent>

                <TabsContent value='historico' className='px-5 py-4 mt-0'>
                  <LeadActivityTimeline leadId={lead.id} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </Form>

          {/* ── Footer ── */}
          {!isArchived && (
            <div className='border-t px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0 bg-background'>
              {isEditing ? (
                <>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='w-full sm:w-auto'
                    onClick={() => {
                      form.reset()
                      setIsEditing(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    className='w-full sm:w-auto'
                    onClick={handleSave}
                    disabled={updateLead.isPending}
                  >
                    {updateLead.isPending && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  {lead.crm_stage !== 'closed' ? (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setArchiveOpen(true)}
                      className='w-full sm:w-auto hover:border-destructive hover:text-destructive hover:bg-destructive/10'
                    >
                      <Archive className='h-4 w-4 mr-1.5' />
                      Arquivar
                    </Button>
                  ) : (
                    <div className='hidden sm:block' />
                  )}

                  <div className='flex gap-2'>
                    {!lead.budget_id ? (
                      <Button
                        type='button'
                        size='sm'
                        className='flex-1 sm:flex-none'
                        onClick={() => {
                          onOpenChange(false)
                          navigate(`/budgets/new?leadId=${lead.id}`)
                        }}
                      >
                        <FileText className='h-4 w-4 mr-1.5' />
                        Criar Orçamento
                      </Button>
                    ) : (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='flex-1 sm:flex-none'
                        onClick={handleViewBudget}
                      >
                        <FileText className='h-4 w-4 mr-1.5' />
                        Ver Orçamento
                      </Button>
                    )}

                    {advanceGate && nextStageLabel && (
                      <Button
                        type='button'
                        size='sm'
                        className='flex-1 sm:flex-none'
                        onClick={handleAdvanceStage}
                        disabled={!advanceGate.allowed || updateStage.isPending}
                        title={
                          !advanceGate.allowed ? advanceGate.reason : undefined
                        }
                      >
                        {updateStage.isPending ? (
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                          <ArrowRight className='mr-1.5 h-4 w-4' />
                        )}
                        {nextStageLabel}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja fechar sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArchiveLeadDialog
        open={archiveOpen}
        onOpenChange={(v) => {
          setArchiveOpen(v)
          if (!v) onOpenChange(false)
        }}
        lead={lead}
      />

      <DeleteLeadDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        leadId={lead.id}
        leadName={lead.name}
        onDeleted={() => onOpenChange(false)}
      />
    </>
  )
}
