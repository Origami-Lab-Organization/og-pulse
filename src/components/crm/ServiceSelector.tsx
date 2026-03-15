import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Service, BillingType, BILLING_TYPE_LABELS } from '@/types/service';
import { formatCurrency } from '@/lib/masks';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectedServiceItem {
  serviceId: string;
  customValue?: number;
  customBillingUnit?: string;
  notes?: string;
}

interface ServiceSelectorProps {
  services: Service[];
  value: SelectedServiceItem[];
  onChange: (items: SelectedServiceItem[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BILLING_TYPE_ORDER: BillingType[] = ['fixed_scope', 'recurring', 'success_fee', 'no_revenue'];

const TYPE_BADGE_CLASSES: Record<BillingType, string> = {
  fixed_scope: 'bg-green-100 text-green-800 border-green-200',
  recurring: 'bg-blue-100 text-blue-800 border-blue-200',
  success_fee: 'bg-amber-100 text-amber-800 border-amber-200',
  no_revenue: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Por mês' },
  { value: 'quarterly', label: 'Por trimestre' },
  { value: 'semiannual', label: 'Por semestre' },
  { value: 'annual', label: 'Por ano' },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function initItem(service: Service): SelectedServiceItem {
  if (service.billingType === 'no_revenue') {
    return { serviceId: service.id };
  }
  const customValue = service.hasDefaultValue ? (service.defaultValue ?? undefined) : undefined;
  let customBillingUnit: string | undefined;
  if (service.billingType === 'recurring') {
    customBillingUnit = service.billingUnit ?? 'monthly';
  } else if (service.billingType === 'success_fee') {
    customBillingUnit = service.billingUnit ?? 'R$';
  }
  return { serviceId: service.id, customValue, customBillingUnit };
}

function valueToDisplay(value: number | undefined, mode: string | undefined): string {
  if (value == null) return '';
  if (mode === '%') return value.toFixed(2).replace('.', ',');
  return formatCurrency(value);
}

// ─── Selected service card ────────────────────────────────────────────────────

interface SelectedCardProps {
  item: SelectedServiceItem;
  service: Service;
  onChange: (updated: SelectedServiceItem) => void;
  onRemove: () => void;
}

function SelectedCard({ item, service, onChange, onRemove }: SelectedCardProps) {
  const [valueDisplay, setValueDisplay] = useState(
    () => valueToDisplay(item.customValue, item.customBillingUnit)
  );

  const updateValue = (digits: string, mode?: string) => {
    const effectiveMode = mode ?? item.customBillingUnit;
    if (!digits) {
      setValueDisplay('');
      onChange({ ...item, customValue: undefined, customBillingUnit: effectiveMode });
      return;
    }
    const raw = parseInt(digits, 10) / 100;
    const display = effectiveMode === '%'
      ? raw.toFixed(2).replace('.', ',')
      : formatCurrency(digits);
    setValueDisplay(display);
    onChange({ ...item, customValue: raw, customBillingUnit: effectiveMode });
  };

  const switchMode = (mode: 'R$' | '%') => {
    setValueDisplay(valueToDisplay(item.customValue, mode));
    onChange({ ...item, customBillingUnit: mode });
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold truncate">{service.name}</p>
          <Badge
            variant="outline"
            className={cn('text-[10px] font-medium shrink-0', TYPE_BADGE_CLASSES[service.billingType])}
          >
            {BILLING_TYPE_LABELS[service.billingType]}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Value field(s) */}
      {service.billingType === 'no_revenue' ? (
        <p className="text-xs text-muted-foreground italic">Sem cobrança para este serviço.</p>
      ) : service.billingType === 'fixed_scope' ? (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Valor</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              className="pl-8 h-8 text-sm"
              value={valueDisplay}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                updateValue(digits);
              }}
            />
          </div>
        </div>
      ) : service.billingType === 'recurring' ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                className="pl-8 h-8 text-sm"
                value={valueDisplay}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  updateValue(digits);
                }}
              />
            </div>
          </div>
          <div className="w-36">
            <label className="text-xs text-muted-foreground mb-1 block">Periodicidade</label>
            <Select
              value={item.customBillingUnit ?? 'monthly'}
              onValueChange={(v) => onChange({ ...item, customBillingUnit: v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : service.billingType === 'success_fee' ? (
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            {/* R$ | % toggle */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Modo</label>
              <div className="flex rounded-md border overflow-hidden">
                {(['R$', '%'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => switchMode(mode)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium transition-colors',
                      item.customBillingUnit === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                      mode === '%' && 'border-l'
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {item.customBillingUnit === '%' ? '%' : 'R$'}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="pl-8 h-8 text-sm"
                  value={valueDisplay}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    updateValue(digits, item.customBillingUnit);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Notes */}
      <div>
        <Textarea
          placeholder="Observações sobre este serviço para este lead..."
          rows={2}
          className="text-sm resize-none"
          value={item.notes ?? ''}
          onChange={(e) => onChange({ ...item, notes: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ServiceSelector({ services, value, onChange }: ServiceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<BillingType[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Partial<Record<BillingType, boolean>>>({});

  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services]);

  const selectedIds = useMemo(() => new Set(value.map((i) => i.serviceId)), [value]);

  const filteredAvailable = useMemo(() => {
    return activeServices.filter((s) => {
      if (selectedIds.has(s.id)) return false;
      if (typeFilter.length > 0 && !typeFilter.includes(s.billingType)) return false;
      if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [activeServices, selectedIds, typeFilter, searchTerm]);

  const availableGrouped = useMemo(() => {
    return BILLING_TYPE_ORDER.reduce<Record<BillingType, Service[]>>(
      (acc, type) => {
        acc[type] = filteredAvailable.filter((s) => s.billingType === type);
        return acc;
      },
      {} as Record<BillingType, Service[]>
    );
  }, [filteredAvailable]);

  const toggleTypeFilter = (type: BillingType) => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleGroup = (type: BillingType) => {
    setCollapsedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const addService = (service: Service) => {
    onChange([...value, initItem(service)]);
  };

  const removeService = (serviceId: string) => {
    onChange(value.filter((i) => i.serviceId !== serviceId));
  };

  const updateItem = (serviceId: string, updated: SelectedServiceItem) => {
    onChange(value.map((i) => (i.serviceId === serviceId ? updated : i)));
  };

  // Totalization
  const { total, undefinedCount } = useMemo(() => {
    let sum = 0;
    let undef = 0;
    for (const item of value) {
      const svc = activeServices.find((s) => s.id === item.serviceId);
      if (!svc || svc.billingType === 'no_revenue') continue;
      if (item.customValue != null) {
        if (item.customBillingUnit !== '%') sum += item.customValue;
        else undef++; // percent-based can't be summed
      } else {
        undef++;
      }
    }
    return { total: sum, undefinedCount: undef };
  }, [value, activeServices]);

  const hasAvailable = filteredAvailable.length > 0;

  return (
    <div className="space-y-3">
      {/* Search + type chips */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BILLING_TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleTypeFilter(type)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                typeFilter.includes(type)
                  ? TYPE_BADGE_CLASSES[type]
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
              )}
            >
              {BILLING_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Available services list */}
      <div className="rounded-md border max-h-44 overflow-y-auto">
        {!hasAvailable ? (
          <p className="px-3 py-4 text-xs text-center text-muted-foreground">
            {activeServices.length === 0
              ? 'Nenhum serviço ativo encontrado.'
              : selectedIds.size === activeServices.length
              ? 'Todos os serviços já foram adicionados.'
              : 'Nenhum serviço encontrado para o filtro atual.'}
          </p>
        ) : (
          BILLING_TYPE_ORDER.map((type) => {
            const group = availableGrouped[type];
            if (group.length === 0) return null;
            const collapsed = !!collapsedGroups[type];

            return (
              <div key={type} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(type)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                >
                  {collapsed ? (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider',
                      type === 'fixed_scope' && 'text-green-700',
                      type === 'recurring' && 'text-blue-700',
                      type === 'success_fee' && 'text-amber-700',
                      type === 'no_revenue' && 'text-gray-500'
                    )}
                  >
                    {BILLING_TYPE_LABELS[type]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{group.length}</span>
                </button>
                {!collapsed &&
                  group.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => addService(service)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left border-t first:border-t-0"
                    >
                      <div className="h-4 w-4 rounded border border-border shrink-0 flex items-center justify-center">
                        {/* unchecked checkbox */}
                      </div>
                      <span className="text-sm flex-1 truncate">{service.name}</span>
                      {service.hasDefaultValue && service.defaultValue != null && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {service.billingUnit === '%'
                            ? `${service.defaultValue.toFixed(2).replace('.', ',')}%`
                            : formatCurrency(service.defaultValue)}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            );
          })
        )}
      </div>

      {/* Selected service cards */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Selecionados ({value.length})
          </p>
          {value.map((item) => {
            const svc = activeServices.find((s) => s.id === item.serviceId);
            if (!svc) return null;
            return (
              <SelectedCard
                key={item.serviceId}
                item={item}
                service={svc}
                onChange={(updated) => updateItem(item.serviceId, updated)}
                onRemove={() => removeService(item.serviceId)}
              />
            );
          })}

          {/* Totalization */}
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Valor total da proposta</span>
            <div className="text-right">
              <span className="text-sm font-semibold">
                {total > 0 ? formatCurrency(total) : '—'}
              </span>
              {undefinedCount > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  + {undefinedCount} serviço{undefinedCount !== 1 ? 's' : ''} com valor a definir
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
