import { useState } from 'react';
import { ChevronLeft, Loader2, Briefcase } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  RevenueModelType,
  REVENUE_MODEL_TYPES,
  REVENUE_MODEL_LABELS,
} from '@/types/serviceRevenueModel';
import { MODEL_META } from '@/components/services/revenueModelMeta';
import { WizardModelData } from './types';

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Por mês' },
  { value: 'quarterly', label: 'Por trimestre' },
  { value: 'semiannual', label: 'Por semestre' },
  { value: 'annual', label: 'Por ano' },
];

interface WizardStep3ModelProps {
  serviceName: string;
  initial?: WizardModelData;
  onContinue: (data: WizardModelData) => void;
  onBack: () => void;
  onSaveDraft?: () => void;
  isLoading?: boolean;
}

export function WizardStep3Model({
  serviceName,
  initial,
  onContinue,
  onBack,
  onSaveDraft,
  isLoading,
}: WizardStep3ModelProps) {
  const [selectedType, setSelectedType] = useState<RevenueModelType>(initial?.modelType ?? 'fixed');
  const [period, setPeriod] = useState<string>(initial?.period ?? 'monthly');

  const handleSubmit = () => {
    onContinue({ modelType: selectedType, period: selectedType === 'recurring' ? period : undefined });
  };

  return (
    <div className="space-y-5">
      <p className="text-base text-muted-foreground -mt-1">
        Escolha como este serviço será cobrado. O modelo de cobrança define a forma de
        precificação aplicada aos serviços.
      </p>

      <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-2.5">
        <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">
          Serviço:{' '}
          <span className="font-medium text-foreground">{serviceName}</span>
        </span>
      </div>

      <div>
        <p className="text-base font-medium mb-3">Tipo de modelo</p>
        <div className="grid grid-cols-2 gap-3">
          {REVENUE_MODEL_TYPES.map((type) => {
            const { icon: Icon, description } = MODEL_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50',
                  selectedType === type
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border'
                )}
              >
                <Icon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{REVENUE_MODEL_LABELS[type]}</p>
                  <p className="text-sm text-muted-foreground leading-snug mt-1">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedType === 'recurring' && (
        <div className="space-y-2">
          <p className="text-base font-medium">Periodicidade</p>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between pt-3">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isLoading}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <Button type="button" variant="outline" onClick={onSaveDraft} disabled={isLoading}>
              Salvar rascunho
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar e publicar
          </Button>
        </div>
      </div>
    </div>
  );
}
