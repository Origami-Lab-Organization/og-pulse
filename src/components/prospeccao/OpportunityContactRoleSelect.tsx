import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PROSPECT_CONTACT_ROLES, type ProspectContactRole } from '@/types/prospect';

/** O Radix não aceita item com valor vazio: "sem papel" precisa de um valor próprio. */
const SEM_PAPEL = 'sem_papel';

interface OpportunityContactRoleSelectProps {
  value: ProspectContactRole | null;
  onChange: (papel: ProspectContactRole | null) => void;
  /** Nome da pessoa, para o leitor de tela saber de quem é o papel. */
  nome: string;
  disabled?: boolean;
  className?: string;
}

/** O papel da pessoa na oportunidade (09/10/2026). Sem papel é válido: classificar é opcional. */
export function OpportunityContactRoleSelect(props: OpportunityContactRoleSelectProps) {
  const { value, onChange, nome, disabled, className } = props;
  return (
    <Select
      value={value ?? SEM_PAPEL}
      onValueChange={(v) => onChange(v === SEM_PAPEL ? null : (v as ProspectContactRole))}
      disabled={disabled}
    >
      <SelectTrigger className={cn('h-8 w-36 text-xs', className)} aria-label={`Papel de ${nome}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SEM_PAPEL}>Sem papel</SelectItem>
        {PROSPECT_CONTACT_ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
