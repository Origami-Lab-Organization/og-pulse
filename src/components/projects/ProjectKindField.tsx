import type { Control, FieldValues, Path } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PROJECT_KIND, PROJECT_KIND_LABEL } from '@/lib/projectKind.constants';
import type { ProjectKind } from '@/types/projectKind';

/** O que cada tipo significa, dito para quem cadastra (ADR-0035 e ADR-0049). */
const KIND_HINT: Record<ProjectKind, string> = {
  [PROJECT_KIND.CLIENT]: 'Um cliente paga por ele. As horas são trabalho vendido.',
  [PROJECT_KIND.INTERNAL]:
    'Ninguém paga por ele, como trabalho não cobrado de um cliente. As horas são custo interno.',
  [PROJECT_KIND.PRODUCT]:
    'O que a casa constrói para si, como o Pulse e o Harness. Sem cliente; aparece em Produtos.',
};

const KINDS: readonly ProjectKind[] = [PROJECT_KIND.CLIENT, PROJECT_KIND.INTERNAL, PROJECT_KIND.PRODUCT];

interface ProjectKindFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Campo do formulário que guarda o tipo. */
  name: Path<T>;
  onKindChange: (kind: ProjectKind) => void;
}

/** Tipo do projeto: decide se há cliente, se fatura e para onde vai o custo das horas. */
export function ProjectKindField<T extends FieldValues>(props: ProjectKindFieldProps<T>) {
  const { control, name, onKindChange } = props;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel>Tipo</FormLabel>
          <FormControl>
            <RadioGroup
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onKindChange(value as ProjectKind);
              }}
              className="grid gap-2 sm:grid-cols-3"
            >
              {KINDS.map((kind) => (
                <label
                  key={kind}
                  htmlFor={`project-kind-${kind}`}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-sm transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem id={`project-kind-${kind}`} value={kind} className="mt-0.5" />
                  <span className="space-y-0.5">
                    <span className="block font-medium text-foreground">{PROJECT_KIND_LABEL[kind]}</span>
                    <span className="block text-xs leading-snug text-muted-foreground">{KIND_HINT[kind]}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
