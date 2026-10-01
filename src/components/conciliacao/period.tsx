import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PERIOD_LABEL, PeriodPreset } from '@/lib/financeiroPeriodo';

export function PeriodSelect(props: { value: PeriodPreset; onChange: (value: PeriodPreset) => void }) {
  const { value, onChange } = props;
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodPreset)}>
      <SelectTrigger className="w-48" aria-label="Período">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(PeriodPreset).map((p) => (
          <SelectItem key={p} value={p}>
            {PERIOD_LABEL[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
